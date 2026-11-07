import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function context(extra={}){
 const c={console,setTimeout:()=>0,clearTimeout(){},document:{body:{classList:{toggle(){}}},readyState:'loading',getElementById:()=>null,querySelectorAll:()=>[],addEventListener(){}},addEventListener(){},...extra};c.window=c;vm.createContext(c);return c;
}
test('aviso de ambiente é único e diferencia indisponibilidade e online',()=>{
 const nodes=new Map();let inserts=0;const c=context();c.document.body={dataset:{},prepend(n){inserts++;nodes.set(n.id,n);}};
 c.document.createElement=()=>({setAttribute(){}});c.document.getElementById=id=>nodes.get(id)||null;
 vm.runInContext(read('js/ms-online-ui.js'),c);c.MS_DB={ready:false};
 c.MS_ONLINE_UI.renderEnvironment();c.MS_ONLINE_UI.renderEnvironment();assert.equal(inserts,1);
 const notice=nodes.get('ms-environment-notice');assert.equal(notice.hidden,false);assert.match(notice.textContent,/INDISPON/);
 c.MS_DB.ready=true;c.MS_ONLINE_UI.renderEnvironment();assert.equal(notice.hidden,true);assert.equal(c.document.body.dataset.msEnvironment,'online');
});
function portal(){const c=context();vm.runInContext(read('js/codex-catalog.js'),c);vm.runInContext(read('js/portal/portal-content.js'),c);return c;}
test('Portal apresenta acervo existente sem inventar notícias ou eventos',()=>{
 const c=portal(),data=c.PortalContent.read();assert.equal(data.events.length,0);assert.equal(data.announcements.length,0);
 assert.equal(data.expansions.length,c.CODEX_FILE_CATALOG.filter(x=>x.kind==='expansao').length);
 for(const item of [data.hero,data.featured,...data.classes,...data.worlds])assert.ok(existsSync(new URL('../'+item.media.url,import.meta.url)));
});
test('Portal respeita publicação editorial e seção explicitamente vazia',async()=>{
 const c=portal();c.MS_DB={ready:true,fetchSiteContent:async()=>({expansions:[]}),fetchPosts:async()=>[{id:'p1',type:'class',title:'Publicação real',published:true},{id:'p2',type:'event',published:false}]};
 await c.PortalContent.hydrate({force:true});const data=c.PortalContent.read();assert.equal(data.classes.length,1);assert.equal(data.classes[0].id,'p1');assert.equal(data.expansions.length,0);assert.equal(data.events.length,0);
});
test('Alquerino extraído preserva dados personalizados ao carregar e salvar ficha',()=>{
 let calls=0;const c=context({msClone:x=>JSON.parse(JSON.stringify(x)),loadCharacterToBuilder:()=>++calls,buildCharacterPayloadFromBuilder:()=>({name:'Teste'})});
 vm.runInContext(read('js/alquerino-lab.js'),c);
 const alquerino={inventory:{custom:3},unlocked:['formula-1'],customFormulas:[{id:'formula-1'}],customPaths:[{path:'Teste',nodes:[]}],preparacoes:[{name:'Poção'}]};
 c.loadCharacterToBuilder(0,[{alquerino}]);const saved=c.buildCharacterPayloadFromBuilder();assert.equal(calls,1);assert.equal(saved.name,'Teste');
 assert.equal(saved.alquerino.inventory.custom,3);
 for(const key of Object.keys(alquerino).filter(k=>k!=='inventory'))assert.deepEqual(JSON.parse(JSON.stringify(saved.alquerino[key])),alquerino[key]);
});
test('versão de interface, manifesto e arquivo público concordam',()=>{
 const version=JSON.parse(read('package.json')).version,c=context();vm.runInContext(read('js/ms-version.js'),c);
 assert.equal(c.MS_VERSION,version);assert.equal(read('VERSION.txt').trim(),version);assert.ok(read('index.html').includes('Portal Oficial V'+version));
});
test('limites das janelas acompanham a área central e são publicados em CSS',()=>{
 const props={};let reflows=0,resizes=0;const rect={left:180,top:140,right:980,bottom:740,width:800,height:600};const c=context({MS_TABLE_SHEETS:{reflow:()=>reflows++},msResizeVttGrid:()=>resizes++});
 c.document.body.style={setProperty:(k,v)=>props[k]=v};c.document.getElementById=id=>id==='screen-vtt'?{classList:{contains:()=>true}}:id==='ms-room-workspace'?{getBoundingClientRect:()=>rect}:null;
 vm.runInContext(read('js/table-room.js'),c);c.MS_TABLE_SHELL.refreshBounds();assert.equal(props['--ms-work-width'],'800px');assert.equal(props['--ms-work-left'],'180px');assert.equal(reflows,1);assert.equal(resizes,0);
});
