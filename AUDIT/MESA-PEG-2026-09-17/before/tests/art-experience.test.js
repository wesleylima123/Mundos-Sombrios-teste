import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const flush=()=>new Promise(r=>setImmediate(r));
function runtime(){const c={console,document:{readyState:'loading',addEventListener(){},body:{dataset:{}}},addEventListener(){},innerWidth:390,innerHeight:844};c.window=c;vm.createContext(c);return c;}
test('miniaturas: jogador recebe somente suas fichas e Mestre recebe participantes da mesa',()=>{
 const c=runtime();vm.runInContext(read('js/table-sheets.js'),c);
 const players=[{id:'mine',userId:'u1'},{id:'other',userId:'u2'},{id:'npc',isNPC:true,userId:'u1'},{id:'alias',sourceOwnerId:'p1'}];
 assert.deepEqual(Array.from(c.MS_TABLE_SHEETS.visiblePlayers({players,asGM:false},{id:'p1',authUserId:'u1'}),p=>p.id),['mine','alias']);
 assert.deepEqual(Array.from(c.MS_TABLE_SHEETS.visiblePlayers({players,asGM:true},{id:'gm'}),p=>p.id),['mine','other','alias']);
 assert.equal(c.MS_TABLE_SHEETS.visiblePlayers({players,asGM:false},null).length,0);
});
test('ícones são limitados à área visível inclusive com aviso local',()=>{
 const c=runtime();vm.runInContext(read('js/table-sheets.js'),c);c.document.body.dataset.msEnvironment='local';
 assert.deepEqual(JSON.parse(JSON.stringify(c.MS_TABLE_SHEETS.clamp(-30,-20))),{x:8,y:48});
 const p=c.MS_TABLE_SHEETS.clamp(9999,9999);assert.equal(p.x,318);assert.equal(p.y,772);
});
function points(){const c=runtime();c.currentUser={id:'gm',role:'mestre'};c.msGetCurrentTableContext=()=>({table:{id:'t1'},asGM:true});vm.runInContext(read('js/points-ui.js'),c);return c;}
const state={wallet:{balance:20},accounts:[{character_id:'c1',balance:5}],config:{souldrakma_per_point:1000}};
test('prévia dos pontos mostra custo e saldos corretos e rejeita valores inválidos',()=>{
 const c=points(),p=c.MS_POINTS.preview;
 assert.deepEqual(JSON.parse(JSON.stringify(p('grant',3,state,'c1'))),{reserve:17,balance:8,cost:0});
 assert.deepEqual(JSON.parse(JSON.stringify(p('buy',3,state,'c1'))),{reserve:23,balance:5,cost:3000});
 assert.deepEqual(JSON.parse(JSON.stringify(p('reverse',3,state,'c1'))),{reserve:23,balance:2,cost:0});
 for(const amount of [0,-1,1.2,NaN,Infinity,21])assert.ok(p('grant',amount,state,'c1').error);
 assert.ok(p('reverse',6,state,'c1').error);assert.ok(p('buy',201,state,'c1').error);
});
test('retirada exclui concessões já revertidas e filtra o personagem',()=>{
 const c=points();const s={recentTransactions:[{id:1,tx_type:'CHARACTER_GRANT',character_id:'a'},{id:2,tx_type:'CHARACTER_GRANT',character_id:'b'},{id:3,tx_type:'CHARACTER_GRANT_REVERSAL',reference_id:'1'},{id:4,tx_type:'CHARACTER_GRANT',character_id:'a'}]};
 assert.deepEqual(Array.from(c.MS_POINTS.reversible(s,'a'),t=>t.id),[4]);
});
test('autorização da interface exige mesa ativa e autoridade nela',()=>{
 const c=points();assert.equal(c.MS_POINTS.canManage('t1'),true);assert.equal(c.MS_POINTS.canManage('other'),false);
 c.msGetCurrentTableContext=()=>({table:{id:'t1'},asGM:false});assert.equal(c.MS_POINTS.canManage('t1'),false);
});
// DOM controlado: exercita o formulário real e suas chamadas de serviço, sem simular layout.
function formRuntime(service){
 const c=points(),nodes=[];let restored=0;const form={elements:{amount:{value:'3'},reason:{value:'Recompensa da sessão'}},reportValidity:()=>true,addEventListener(){}};
 const controls={submit:{},output:{},error:{},cancel:{},focus:{focus(){}}};form.querySelector=s=>s==='[type=submit]'?controls.submit:s==='output'?controls.output:s==='[data-error]'?controls.error:controls.focus;
 const dialog={setAttribute(){},removeAttribute(){},addEventListener(k,fn){this[k]=fn;},showModal(){},focus(){},close(){},remove(){nodes.splice(nodes.indexOf(this),1);},querySelector:s=>s==='form'?form:controls.cancel,querySelectorAll:()=>[controls.cancel]};
 c.document.createElement=()=>dialog;c.document.body.appendChild=n=>nodes.push(n);c.document.activeElement={focus:()=>restored++};c.MS_SERVICES={Progression:{state:async()=>state,...service}};
 return {c,nodes,dialog,form,controls,restored:()=>restored};
}
test('formulário impede dupla submissão e passa quantidade/motivo ao serviço canônico',async()=>{
 let finish,calls=0;const r=formRuntime({grant:async(...args)=>{calls++;assert.deepEqual(args,['t1','c1',3,'Recompensa da sessão']);await new Promise(resolve=>finish=resolve);return {account:{user_id:'u1'}};}});
 const result=r.c.MS_POINTS.open('grant',{tableId:'t1',characterId:'c1',name:'Raven'});await flush();
 const a=r.form.onsubmit({preventDefault(){}}),b=r.form.onsubmit({preventDefault(){}});await flush();assert.equal(calls,1);assert.equal(r.controls.submit.disabled,true);finish();await Promise.all([a,b]);assert.equal((await result).amount,3);assert.equal(r.nodes.length,0);assert.equal(r.restored(),1);
});
test('cancelar ou trocar de mesa não movimenta pontos',async()=>{
 let calls=0;const r=formRuntime({grant:async()=>calls++});const result=r.c.MS_POINTS.open('grant',{tableId:'t1',characterId:'c1'});await flush();r.c.msGetCurrentTableContext=()=>({table:{id:'other'},asGM:true});await r.form.onsubmit({preventDefault(){}});assert.equal(calls,0);assert.match(r.controls.error.textContent,/mesa ativa mudou/);r.controls.cancel.onclick();assert.equal(await result,null);
});
test('erro do backend mantém formulário aberto e não inventa sucesso',async()=>{
 const r=formRuntime({grant:async()=>{throw new Error('GM_REQUIRED');}});const result=r.c.MS_POINTS.open('grant',{tableId:'t1',characterId:'c1'});await flush();await r.form.onsubmit({preventDefault(){}});assert.equal(r.nodes.length,1);assert.match(r.controls.error.textContent,/Somente/);assert.equal(r.controls.submit.disabled,false);r.controls.cancel.onclick();await result;
});
function offline(){const mem=new Map(),c={console,Date,Math,JSON,URLSearchParams,location:{search:''},crypto:{randomUUID:crypto.randomUUID},setTimeout,clearTimeout,localStorage:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)},CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts?.detail;}},BroadcastChannel:class{addEventListener(){}postMessage(){}close(){}},dispatchEvent(){},addEventListener(){},MS_RUNTIME_CONFIG:{offlineMode:true,storageNamespace:'test-art',supabase:{url:'',publishableKey:''}}};c.window=c;vm.createContext(c);vm.runInContext(read('js/offline-db.js'),c);return c.MS_OFFLINE_DB.create();}
test('banco local: comprar, conceder e retirar preserva saldos e bloqueia segunda reversão',async()=>{
 const api=offline();await api.signIn('mestre','mestre1234');const tid='table-sandbox-001';
 const before=(await api.fetchProgressionTableState(tid)).data;const bought=await api.buyTableProgressionPoints(tid,5);assert.equal(bought.error,null);
 const grant=await api.grantCharacterProgression(tid,'char-player-exodo',3,'Sessão');assert.equal(grant.error,null);
 const after=(await api.fetchProgressionTableState(tid)).data,tx=after.recentTransactions.find(t=>t.tx_type==='CHARACTER_GRANT');
 assert.equal(after.wallet.balance,before.wallet.balance+2);
 const reverse=await api.reverseProgressionGrant(tx.id,'Correção');assert.equal(reverse.error,null);
 const once=(await api.fetchProgressionTableState(tid)).data;assert.equal(once.wallet.balance,before.wallet.balance+5);assert.equal(once.wallet.lifetime_distributed,before.wallet.lifetime_distributed);
 const twice=await api.reverseProgressionGrant(tx.id,'De novo');assert.equal(twice.error.message,'ALREADY_REVERSED');
 const final=(await api.fetchProgressionTableState(tid)).data;assert.equal(final.wallet.balance,once.wallet.balance);
 await api.signOut();await api.signIn('jogador','jogador123');assert.equal((await api.grantCharacterProgression(tid,'char-player-exodo',1,'Inválido')).error.message,'GM_REQUIRED');
});
test('Portal usa arte inédita e os dois fluxos de pontos delegam ao mesmo formulário',()=>{
 const content=read('js/portal/portal-content.js');assert.doesNotMatch(content,/assets\/archetypes/);
 for(const name of ['portal-threshold','exodo-archive','ocultatun-library'])assert.ok(fs.existsSync(new URL('../assets/art-direction/'+name+'.png',import.meta.url)));
 for(const file of ['js/progression-v2.8.9.js','js/operational-control-v2.10.1.js'])assert.match(read(file),/MS_POINTS.open\('grant'/);
 assert.match(read('js/evolution-gradual-v2.10.1.js'),/renderSheet:baseSheet/);
});
function floatingRuntime(){
 const c=runtime(),all=[];
 function node(){const events={},children=[],queries=new Map();const n={children,style:{},dataset:{},hidden:false,offsetWidth:60,offsetHeight:60,textContent:'',setAttribute(k,v){this[k]=v;},focus(){},setPointerCapture(){},addEventListener(k,fn){events[k]=fn;},fire(k,extra={}){return events[k]?.({button:0,pointerId:1,clientX:100,clientY:100,preventDefault(){},...extra});},getBoundingClientRect(){return {left:parseFloat(this.style.left)||0,top:parseFloat(this.style.top)||0,right:(parseFloat(this.style.left)||0)+60};},append(...items){for(const x of items){x.parent=this;children.push(x);}},appendChild(x){this.append(x);},remove(){this.removed=true;for(const x of children)x.remove();},querySelector(s){if(!queries.has(s))queries.set(s,node());return queries.get(s);},querySelectorAll(){return []}};all.push(n);return n;}
 const screen=node();screen.id='screen-vtt';screen.classList={contains:()=>true};c.document.createElement=node;c.document.body=node();c.document.getElementById=id=>all.find(n=>!n.removed&&n.id===id)||null;c.sessionStorage={getItem:()=>null,setItem(){}};
 c.currentUser={id:'u1'};let ctx={table:{id:'t1'},asGM:false,players:[{id:'c1',name:'Raven',isMe:true}]};c.msGetCurrentTableContext=()=>ctx;
 c.MS_FEATURES={ensureProgression:async()=>true};c.MS_SERVICES={Characters:{view:async()=>({id:'c1',payload:{name:'Raven'}})}};c.MS_PROGRESSION={renderSheet:p=>'FICHA '+p.name};
 vm.runInContext(read('js/table-sheets.js'),c);return {c,all,setContext:v=>ctx=v};
}
test('miniaturas abrem e recolhem no mesmo ícone; arraste não dispara abertura',async()=>{
 const r=floatingRuntime();r.c.MS_TABLE_SHEETS.sync();r.c.MS_TABLE_SHEETS.sync();
 const orbs=r.all.filter(n=>n.className==='ms-sheet-orb'&&!n.removed);assert.equal(orbs.length,1);
 const orb=orbs[0],panel=r.all.find(n=>n.className==='ms-sheet-mini');assert.equal(panel.hidden,true);
 orb.fire('click');await flush();assert.equal(panel.hidden,false);assert.equal(orb['aria-expanded'],'true');assert.equal(panel.querySelector('.ms-sheet-mini-body').innerHTML,'FICHA Raven');
 orb.fire('click');assert.equal(panel.hidden,true);
 const x=parseFloat(orb.style.left);orb.fire('pointerdown');orb.fire('pointermove',{clientX:60,clientY:120});orb.fire('pointerup',{clientX:60,clientY:120});orb.fire('click');assert.equal(panel.hidden,true);assert.equal(parseFloat(orb.style.left),x-40);
 orb.fire('keydown',{key:'ArrowLeft',altKey:true});assert.equal(parseFloat(orb.style.left),x-60);
});
test('resposta atrasada da ficha é descartada após sair ou trocar de mesa',async()=>{
 const r=floatingRuntime();let release;r.c.MS_SERVICES.Characters.view=()=>new Promise(resolve=>release=resolve);
 r.c.MS_TABLE_SHEETS.sync();const orb=r.all.find(n=>n.className==='ms-sheet-orb'),panel=r.all.find(n=>n.className==='ms-sheet-mini');orb.fire('click');await flush();
 r.setContext({table:null,players:[]});r.c.MS_TABLE_SHEETS.sync();release({payload:{name:'PRIVADO'}});await flush();assert.equal(panel.removed,true);assert.doesNotMatch(panel.querySelector('.ms-sheet-mini-body').innerHTML,/PRIVADO/);
});
test('renderização do Portal integra as novas mídias e atalhos de retorno autenticados',()=>{
 const c=runtime(),root={innerHTML:'',setAttribute(){},querySelectorAll:()=>[],classList:{contains:()=>true,add(){},remove(){}}};
 c.document.getElementById=id=>id==='screen-portal'?root:null;c.document.querySelectorAll=()=>[root];c.document.body.classList={remove(){}};
 for(const file of ['js/codex-catalog.js','js/portal/portal-content.js','js/portal/portal-media.js','js/portal/portal-core.js'])vm.runInContext(read(file),c);
 assert.match(root.innerHTML,/assets\/art-direction\/portal-threshold.png/);assert.match(root.innerHTML,/EXPLORAR OS MUNDOS/);assert.doesNotMatch(root.innerHTML,/CONTINUAR MINHA MESA|portal-hero-console/);
 c.currentUser={id:'gm',username:'Mestre',role:'mestre'};c.renderOfficialPortal();assert.match(root.innerHTML,/CONTINUAR MINHA MESA/);assert.match(root.innerHTML,/MINHAS PERSONAGENS/);
});
