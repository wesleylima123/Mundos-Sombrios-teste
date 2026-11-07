import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import vm from 'node:vm';
const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));
function bus() {
  const handlers = new Map();
  return {on(name, fn) {const list = handlers.get(name) || []; list.push(fn); handlers.set(name,list);},
    emit(name, data={}) {for (const fn of handlers.get(name)||[]) fn(data);}, setStatus(){}, toast(){}};
}
function dom() {
  const nodes=[];
  function node(tag='div') {
    const listeners=new Map(), classes=new Set();
    const n={tagName:tag.toUpperCase(),dataset:{},style:{},innerHTML:'',textContent:'',
      classList:{contains:k=>classes.has(k),add:k=>classes.add(k),remove:k=>classes.delete(k),toggle(k,on){if(on)classes.add(k);else classes.delete(k);}},
      addEventListener(type,fn){const s=listeners.get(type)||new Set();s.add(fn);listeners.set(type,s);},
      removeEventListener(type,fn){listeners.get(type)?.delete(fn);},
      fire(type){for(const fn of [...(listeners.get(type)||[])])fn({target:n});},
      remove(){const i=nodes.indexOf(n);if(i>=0)nodes.splice(i,1);},
      querySelector(){return null;},querySelectorAll(){return [];},appendChild(child){nodes.push(child);},closest(){return null;}};
    return n;
  }
  const document={baseURI:'https://test.invalid/project/',readyState:'complete',body:node(),
    head:{appendChild(n){nodes.push(n);}},createElement:node,
    querySelectorAll(selector){return nodes.filter(n=>selector==='script[src]'?n.tagName==='SCRIPT':n.tagName==='LINK');},
    getElementById(id){return nodes.find(n=>n.id===id)||null;},addEventListener(){}};
  return {document,nodes,node};
}
function assetRuntime() {
  const d=dom(),ctx={window:{},document:d.document,URL,console};
  vm.createContext(ctx);vm.runInContext(read('js/asset-loader.js'),ctx);
  return {...d,api:ctx.window.MS_ASSETS};
}
test('carregador compartilha uma única solicitação por URL entre consumidores concorrentes',async()=>{
  const {api,nodes}=assetRuntime();
  const a=api.script('js/example.js'),b=api.script('./js/example.js');
  assert.equal(a,b);assert.equal(nodes.length,1);assert.equal(nodes[0].async,false);
  nodes[0].fire('load');await a;await api.script('js/example.js');assert.equal(nodes.length,1);
});
test('erro de script rejeita todos os consumidores e nova tentativa cria um elemento novo',async()=>{
  const {api,nodes}=assetRuntime();const a=api.script('js/example.js'),b=api.script('js/example.js');
  const first=nodes[0],failA=assert.rejects(a,/Não foi possível/),failB=assert.rejects(b,/Não foi possível/);
  first.fire('error');await Promise.all([failA,failB]);assert.equal(nodes.length,0);
  const retry=api.script('js/example.js');assert.notEqual(nodes[0],first);nodes[0].fire('load');await retry;
});
test('estilos aguardam carga e podem ser recuperados após erro',async()=>{
  const {api,nodes}=assetRuntime();let completed=false;const p=api.style('css/example.css');p.then(()=>{completed=true;},()=>{});
  await flush();assert.equal(completed,false);const fail=assert.rejects(p);nodes[0].fire('error');await fail;
  const retry=api.style('css/example.css');nodes[0].fire('load');await retry;assert.equal(nodes.length,1);
});
test('folha já disponível no HTML não é carregada novamente',async()=>{
  const {api,nodes,node}=assetRuntime();const css=node('link');css.href='css/existing.css';css.rel='stylesheet';css.sheet={};nodes.push(css);
  assert.equal(await api.style('./css/existing.css'),css);assert.equal(nodes.length,1);
});
test('Forja, Escudo e vendors delegam à mesma fonte de carregamento',()=>{
  for(const name of ['feature-loader','master-shield-loader','vendor-loader']){
    const s=read(`js/${name}.js`);assert.match(s,/MS_ASSETS\.script/);assert.doesNotMatch(s,/createElement\(['"]script/);
  }
  const html=read('index.html');assert.ok(html.indexOf('js/asset-loader.js')<html.indexOf('js/vendor-loader.js'));
});
test('Realtime encaminha status e encerra a inscrição apenas uma vez',async()=>{
  let handlers,stops=0;const statuses=[],events=[];const platform=bus();
  const ctx={window:{MS_PLATFORM:platform,MS_DB:{subscribeTable:async(id,h)=>{handlers=h;h.status('SUBSCRIBED');return()=>stops++;}}},document:{querySelectorAll:()=>[],addEventListener(){}},console};
  vm.createContext(ctx);vm.runInContext(read('js/ms-realtime.js'),ctx);
  const api=ctx.window.MS_REALTIME;const stop=await api.connect('table-1',e=>events.push(e),{status:s=>statuses.push(s)});
  handlers.status('TIMED_OUT');handlers.event({id:1});assert.deepEqual(statuses,['SUBSCRIBED','TIMED_OUT']);assert.equal(events.length,1);
  stop();api.disconnect();stop();assert.equal(stops,1);assert.equal(api.current().tableId,null);
});
test('motor real e adaptador real conectam heartbeat e detectam queda do canal',async()=>{
  let handlers,stops=0,heartbeats=0;const timers=new Map();let seq=0;
  const platform=bus(),ctx={console,crypto:{randomUUID:()=> 'event-id'},document:{querySelectorAll:()=>[],addEventListener(){}},
    setTimeout(fn){timers.set(++seq,fn);return seq;},clearTimeout:id=>timers.delete(id),setInterval:()=>++seq,clearInterval(){},window:{}};
  ctx.window.MS_PLATFORM=platform;ctx.window.MS_SERVICES={Games:{touchPresence:async()=>{heartbeats++;}},VTT:{state:async()=>({}),event:async()=>({id:1})}};
  ctx.window.MS_DB={subscribeTable:async(id,h)=>{handlers=h;h.status('SUBSCRIBED');return()=>stops++;},fetchTableEventsAfter:async()=>({data:[]})};
  vm.createContext(ctx);vm.runInContext(read('js/ms-realtime.js'),ctx);vm.runInContext(read('js/table-session-engine.js'),ctx);
  const engine=ctx.window.MS_TABLE_SESSION;await engine.connect('table-1',()=>{});assert.equal(heartbeats,1);assert.equal(engine.current().status,'synced');
  handlers.status('CHANNEL_ERROR');assert.equal(engine.current().status,'offline');assert.equal(timers.size,1);
  await engine.disconnect();assert.equal(stops,1);assert.equal(timers.size,0);assert.equal(heartbeats,2);
});
function progressionRuntime(active=false) {
  const d=dom(),elements=new Map();for(const id of ['ms-character-viewer','ms-evolution-orb','ms-progression-panel','screen-vtt']){const n=d.node();n.id=id;elements.set(id,n);}
  if(active)elements.get('screen-vtt').classList.add('active');
  d.document.getElementById=id=>elements.get(id)||null;
  d.document.querySelectorAll=()=>[];
  const platform=bus();let calls=0;const table={table:{id:'t1'},asGM:false,players:[]};
  const originalEnter=async()=>platform.emit('vtt:entered',{tableId:'t1'});
  const ctx={console,document:d.document,setTimeout,clearTimeout,localStorage:{getItem:()=>null},window:{currentUser:{id:'p',role:'jogador'},MS_PLATFORM:platform,MS_DB:{ready:true},MS_SERVICES:{Progression:{state:async()=>{calls++;return {wallet:{balance:0}};}}},msGetCurrentTableContext:()=>table,enterVTT:originalEnter}};
  vm.createContext(ctx);vm.runInContext(read('js/progression-v2.8.9.js'),ctx);
  return {ctx,platform,getCalls:()=>calls,originalEnter,table};
}
test('progressão usa somente evento de entrada, sem substituir enterVTT',async()=>{
  const r=progressionRuntime();assert.equal(r.ctx.window.enterVTT,r.originalEnter);
  await r.ctx.window.enterVTT();await flush();assert.equal(r.getCalls(),1);
  r.table.table=null;r.platform.emit('vtt:left');await flush();assert.equal(r.getCalls(),1);
});
test('progressão carregada tardiamente recupera a mesa que já está aberta',async()=>{
  const r=progressionRuntime(true);await flush();assert.equal(r.getCalls(),1);
});
test('saída cancelada preserva sessão; saída confirmada emite um único evento após limpar contexto',async()=>{
  let allow=false,disconnects=0;const snapshots=[];
  const source=read('js/script.js');const fn=source.slice(source.indexOf('async function leaveVTT('),source.indexOf('function openManagePlayers('));
  const ctx={console,confirm:()=>allow,currentTableData:{id:'t1'},isDraftMode:false,tablePlayers:[],persistMasterShieldReturnContext(){},showScreen(){},document:{getElementById:()=>null},window:{MS_TABLE_SESSION:{disconnect:async()=>disconnects++},MS_PLATFORM:{emit:(name,p)=>snapshots.push({name,id:p.tableId,table:ctx.currentTableData})}}};
  vm.createContext(ctx);vm.runInContext(fn,ctx);
  assert.equal(await ctx.leaveVTT(),false);assert.equal(disconnects,0);assert.equal(snapshots.length,0);
  allow=true;assert.equal(await ctx.leaveVTT(),true);assert.equal(disconnects,1);assert.deepEqual(snapshots,[{name:'vtt:left',id:'t1',table:null}]);
});
test('Tripulação atualiza uma vez na entrada e cancela polling na saída',async()=>{
  const d=dom(),platform=bus();const intervals=new Set();let seq=0,calls=0,table={id:'t1'};
  d.document.querySelectorAll=()=>[];d.document.querySelector=()=>null;
  const ctx={console,document:d.document,setTimeout:()=>0,clearTimeout(){},setInterval(){intervals.add(++seq);return seq;},clearInterval:id=>intervals.delete(id),window:{addEventListener(){},currentUser:{role:'mestre'},MS_PLATFORM:platform,msGetCurrentTableContext:()=>({table,asGM:true}),MS_SERVICES:{Games:{joinRequests:async()=>{calls++;return [];}},Progression:{state:async()=>({})}}}};
  vm.createContext(ctx);vm.runInContext(read('js/operational-control-v2.10.1.js'),ctx);
  platform.emit('vtt:entered');await flush();assert.equal(calls,1);assert.equal(intervals.size,1);
  table=null;platform.emit('vtt:left');assert.equal(intervals.size,0);
});
test('campanha possui um único construtor e Forja não redefine entrada da Mesa',()=>{
  const forge=read('js/forja-overhaul-v2.8.10.js');assert.doesNotMatch(forge,/window\.enterVTT\s*=|function ensureCampaignInTable|vtt-campaign-root/);
  const shell=read('js/table-shell-v3.js');assert.equal((shell.match(/function ensureCampaignWindow\(/g)||[]).length,1);
});
test('versões históricas ficam fora do runtime e todos os assets locais literais existem',()=>{
  const archived=readdirSync(new URL('../ARCHIVE/legacy-runtime/js/',import.meta.url));
  for(const name of archived)assert.equal(existsSync(new URL('../js/'+name,import.meta.url)),false);
  const files=['index.html',...readdirSync(new URL('../js/',import.meta.url)).filter(n=>n.endsWith('.js')).map(n=>'js/'+n)];
  for(const name of files){
    const source=read(name);
    for(const match of source.matchAll(/['"]((?:js|css|assets|codex-files)\/[^'"\s<>]+)['"]/g)){
      const path=match[1];
      if(path.includes('${') || source.slice(Math.max(0,match.index-12),match.index).endsWith('placeholder='))continue;
      assert.ok(existsSync(new URL('../'+path,import.meta.url)),`${name} referencia ${path}`);
    }
  }
});

// Comparação estrutural limitada às duas folhas da Mesa: não substitui navegador.
function cssBlocks(source) {
  const s=source.replace(/\/\*[\s\S]*?\*\//g,'');const result=[];let i=0;
  while(i<s.length){const start=s.indexOf('{',i);if(start<0)break;let end=start+1,depth=1;
    while(end<s.length&&depth){if(s[end]==='{')depth++;if(s[end]==='}')depth--;end++;}
    assert.equal(depth,0);result.push([s.slice(i,start).trim(),s.slice(start+1,end-1)]);i=end;
  }return result;
}
function cssValues(source,width) {
  const result=new Map();
  function visit(blocks){for(const [selector,body] of blocks){
    if(selector.startsWith('@media')){const limits=[...selector.matchAll(/(max|min)-width:\s*(\d+)px/g)];
      if(limits.every(([,kind,n])=>kind==='max'?width<=Number(n):width>=Number(n)))visit(cssBlocks(body));continue;}
    if(selector.startsWith('@'))continue;
    for(const text of body.split(';')){const i=text.indexOf(':');if(i<0)continue;
      const prop=text.slice(0,i).trim(),value=text.slice(i+1).trim(),key=selector+'|'+prop,important=value.includes('!important');
      if(!result.has(key)||Number(important)>=Number(result.get(key).important))result.set(key,{important,value});
    }
  }}visit(cssBlocks(source));return Object.fromEntries([...result].sort(([a],[b])=>a.localeCompare(b)));
}
test('Mesa tem uma fonte de layout e mantém navegação móvel em 12 larguras',()=>{
  const css=read('css/table-shell-v3.css');
  for(const file of ['css/table-studio-v2.8.6.css','css/forja-overhaul-v2.8.10.css','css/operational-control-v2.10.1.css'])
    assert.doesNotMatch(read(file),/ms-table-v3|screen-vtt/,file);
  for(const width of [320,390,640,760,761,960,961,1024,1180,1181,1440,1920]){
    const values=cssValues(css,width);
    assert.equal(values['#screen-vtt .ms-table-v3-mobile-nav|display'].value,width<=960?'grid':'none');
    assert.equal(values['#screen-vtt .ms-table-v3-body|display'].value,width<=960?'block':'grid');
    assert.equal(values['#screen-vtt .ms-table-v3 button|min-height'].value,'44px');
    assert.equal(values['#screen-vtt .ms-table-v3-head-actions|display'].value,'flex');
  }
});
