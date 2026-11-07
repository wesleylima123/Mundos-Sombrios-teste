import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function context(extra={}){
 const c={console,setTimeout:()=>0,clearTimeout(){},document:{readyState:'loading',getElementById:()=>null,querySelectorAll:()=>[],addEventListener(){}},addEventListener(){},...extra};c.window=c;vm.createContext(c);return c;
}
test('Mesa móvel alterna painel e seleção acessível sem recriar o conteúdo',()=>{
 let resizes=0;const buttons=['stage','cards','tools','session'].map(p=>({dataset:{mobilePaneTarget:p},setAttribute(k,v){this[k]=v;}}));
 const shell={dataset:{},querySelectorAll:()=>buttons};
 const c=context({requestAnimationFrame:f=>f(),msResizeVttGrid:()=>resizes++});c.document.getElementById=id=>id==='ms-table-v3'?shell:null;
 vm.runInContext(read('js/table-shell-v3.js'),c);
 for(const pane of ['cards','tools','session','stage']){
  c.MS_TABLE_SHELL.setMobilePane(pane);assert.equal(shell.dataset.mobilePane,pane);
  assert.deepEqual(buttons.filter(b=>b['aria-pressed']==='true').map(b=>b.dataset.mobilePaneTarget),[pane]);
 }
 assert.equal(resizes,1);c.MS_TABLE_SHELL.setMobilePane('invalid');assert.equal(shell.dataset.mobilePane,'stage');assert.equal(resizes,2);
});
test('aviso de ambiente é único e diferencia demonstração, indisponibilidade e online',()=>{
 const nodes=new Map();let inserts=0;const c=context();c.document.body={dataset:{},prepend(n){inserts++;nodes.set(n.id,n);}};
 c.document.createElement=()=>({setAttribute(){}});c.document.getElementById=id=>nodes.get(id)||null;
 vm.runInContext(read('js/ms-online-ui.js'),c);c.MS_DB={offline:true,ready:true};
 c.MS_ONLINE_UI.renderEnvironment();c.MS_ONLINE_UI.renderEnvironment();assert.equal(inserts,1);
 const notice=nodes.get('ms-environment-notice');assert.equal(notice.hidden,false);assert.match(notice.textContent,/DEMONSTRAÇÃO LOCAL/);
 c.MS_DB={offline:false,ready:false};c.MS_ONLINE_UI.renderEnvironment();assert.equal(c.document.body.dataset.msEnvironment,'unavailable');assert.match(notice.textContent,/INDISPONÍVEL/);
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
