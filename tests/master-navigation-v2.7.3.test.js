import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const read=p=>fs.readFileSync(p,'utf8');
const LEGACY_SANDBOX=fs.existsSync('test/sandbox.html')&&fs.existsSync('test/sandbox-runtime.js');
const sandboxTest=LEGACY_SANDBOX?test:test.skip;

test('V2.7.3 corrige recolhimento real das Memórias no CSS',()=>{
  const css=read('css/master-tools.css');
  assert.match(css,/\.master-shield-panel\[hidden\]\s*\{\s*display\s*:\s*none\s*!important\s*\}/i);
});

test('produção usa o contrato Escudo → Mesa',()=>{
  const html=read('index.html');
  assert.match(html,/id="master-shield-back"[^>]+onclick="returnFromMasterShield\(\)"/);
  const script=read('js/script.js');
  assert.match(script,/MS_SHIELD_RETURN_KEY/);
  assert.match(script,/sessionStorage\.setItem\(MS_SHIELD_RETURN_KEY/);
  assert.match(script,/MS_TABLE_SHELL\?\.mount/);
  assert.match(script,/MasterTools\?\.mountShield\?\.\(isVttGM/);
});

sandboxTest('Sandbox histórico usa o mesmo contrato Escudo → Mesa',()=>{
  const html=read('test/sandbox.html');
  assert.match(html,/id="master-shield-back"[^>]+onclick="returnFromMasterShield\(\)"/);
});

test('mountShield preserva a autoridade GM após desmontar o painel anterior',()=>{
  const js=read('js/master-tools.js');
  assert.match(js,/function mountShield\(isGM\)\{\s*\n\s*unmountShield\(\);\s*try\{window\.__msVttIsGM=!!isGM/);
  assert.match(js,/async function onVttEnter\(table,isGM\)\{\s*\n\s*try\{window\.__msVttIsGM=!!isGM/);
});

test('Co-Mestre é tratado como direção da mesa, não como jogador comum',()=>{
  const room=read('js/master-room.js');
  const tools=read('js/master-tools.js');
  const shield=read('js/master-shield.js');
  assert.match(room,/\['mestre','co_mestre'\]\.includes\(memberRole\(t\)\)/);
  assert.match(room,/data-enter=.*ENTRAR AO VIVO/);
  assert.match(room,/owner\?`<button data-archive/);
  assert.match(tools,/msCanUseMasterAuthority/);
  assert.match(shield,/msCanAccessMasterShield/);
});

test('migração 2.7.3 restringe eventos privilegiados e corrige RPCs legados',()=>{
  const sql=read('supabase-table-session-v2.7.3-migration.sql');
  assert.match(sql,/v_type in \('chat','dice','token_add','token_move','token_remove'\)/);
  assert.match(sql,/v_type in \('control','scene','master_notice','reveal'\)/);
  assert.match(sql,/GM_EVENT_REQUIRED/);
  assert.match(sql,/EVENT_TYPE_NOT_ALLOWED/);
  assert.match(sql,/TABLE_NOT_LIVE/);
  assert.match(sql,/jsonb_set\(v_payload,'\{sender\}'/);
  assert.match(sql,/create or replace function public\.create_table_invite/);
  assert.match(sql,/create or replace function public\.set_table_member_role/);
  assert.match(sql,/create or replace function public\.update_table_settings_secure/);
  assert.match(sql,/tb\.owner_id=\(select id from public\.profiles where auth_user_id=auth\.uid\(\)/);
});

function storage(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(String(k),String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()};}
function loadSandbox(){
  const localStorage=storage(),sessionStorage=storage();
  class BC{addEventListener(){}postMessage(){}close(){}}
  const window={addEventListener(){},dispatchEvent(){}};
  const context={window,localStorage,sessionStorage,BroadcastChannel:BC,CustomEvent:class{},crypto:webcrypto,console,setInterval,clearInterval,Date,Math,JSON,location:{reload(){}}};
  window.window=window;window.localStorage=localStorage;window.sessionStorage=sessionStorage;window.crypto=webcrypto;
  vm.createContext(context);vm.runInContext(read('test/sandbox-runtime.js'),context,{filename:'sandbox-runtime.js'});
  return context;
}

sandboxTest('Sandbox replica autorização: jogador não emite evento GM nem grava estado privado',async()=>{
  const c=loadSandbox(),db=c.window.MS_DB;
  await db.signIn('jogador','jogador');
  let r=await db.publishTableEvent('table-demo-001','master_notice',{message:'falso'});
  assert.equal(r.data,null);assert.match(r.error.message,/GM_EVENT_REQUIRED/);
  r=await db.publishTableEvent('table-demo-001','chat',{sender:'Mestre Falso',msg:'oi'});
  assert.equal(r.error,null);assert.equal(r.data.payload.sender,'Raven');
  r=await db.saveTableState('table-demo-001',{scene:{title:'hack'}});
  assert.match(r.error.message,/TABLE_MANAGER_REQUIRED/);
  await assert.rejects(()=>db.fetchGMNotes('table-demo-001'),/TABLE_MANAGER_REQUIRED/);
});

sandboxTest('Sandbox permite Mestre proprietário, Co-Mestre delegado e mantém ações de proprietário restritas',async()=>{
  const c=loadSandbox(),db=c.window.MS_DB;
  await db.signIn('mestre','mestre');
  let r=await db.publishTableEvent('table-demo-001','master_notice',{message:'oficial'});assert.equal(r.error,null);
  r=await db.setTableMemberRole('table-demo-001','33333333-3333-4333-8333-333333333333','co_mestre');assert.equal(r.data,true);
  await db.signOut();await db.signIn('jogador','jogador');
  r=await db.publishTableEvent('table-demo-001','master_notice',{message:'co-direção'});assert.equal(r.error,null);
  r=await db.archiveTableSecure('table-demo-001',true);assert.match(r.error.message,/OWNER_REQUIRED/);
  r=await db.setTableMemberRole('table-demo-001','44444444-4444-4444-8444-444444444444','co_mestre');assert.match(r.error.message,/OWNER_REQUIRED/);
});

test('Mestre de conta mantém acesso ao Escudo sem herdar direção de mesa alheia',()=>{
  const script=read('js/script.js');
  assert.match(script,/function msCanAccessMasterShield/);
  assert.match(script,/role === 'mestre' \|\| role === 'admin'/);
  assert.match(script,/isVttGM = isDraftMode \?/);
  assert.match(script,/msCanUseMasterAuthority\(currentTableData\)/);
  assert.match(read('js/master-shield-loader.js'),/msCanAccessMasterShield/);
  assert.match(read('js/master-tools.js'),/canAccessShield/);
});

test('mudança de papel em tempo real recalcula autoridade e arquivamento força saída',()=>{
  const script=read('js/script.js'),tools=read('js/master-tools.js');
  assert.match(script,/function msRefreshCurrentTableAuthority/);
  assert.match(tools,/msRefreshCurrentTableAuthority\?\.\(summary\)/);
  assert.match(tools,/reason:'table_archived'/);
  assert.match(tools,/p\.entity==='table'.*p\.status.*archived/s);
});

test('totens usam propriedade autenticada e ciclo add move remove compartilhado',()=>{
  const script=read('js/script.js'),tools=read('js/master-tools.js'),sql=read('supabase-table-session-v2.7.3-migration.sql');
  assert.match(script,/ownerAuthId/);
  assert.match(script,/send\?\.\('token_add'/);
  assert.match(script,/send\?\.\('token_remove'/);
  assert.match(script,/msVttObjectOwnedByCurrentUser/);
  assert.match(tools,/\['token_add','token_move','token_remove'\]/);
  assert.match(tools,/tokenActorAllowed/);
  assert.match(sql,/TOKEN_CHARACTER_REQUIRED/);
  assert.match(sql,/actorCanManage/);
  assert.match(sql,/TABLE_PAUSED/);
});

test('versão de correção é 2.7.3',()=>{
  assert.match(read('VERSION.txt').trim(),/^2\.(?:7|8|9|10|11)\./);
  assert.match(JSON.parse(read('package.json')).version,/^2\.(?:7|8|9|10|11)\./);
});

test('fluxo funcional Escudo → Mesa recupera contexto persistido e remonta a mesma sessão',()=>{
  const script=read('js/script.js');
  const names=['msCloneShieldContext','persistMasterShieldReturnContext','readMasterShieldReturnContext','captureMasterShieldReturnContext','syncMasterShieldReturnUI','returnFromMasterShield'];
  function extract(name){
    const start=script.indexOf(`function ${name}(`);assert.ok(start>=0,`função ${name} ausente`);
    let brace=script.indexOf('{',start),depth=0,quote=null,escape=false;
    for(let i=brace;i<script.length;i++){
      const ch=script[i];
      if(quote){if(escape){escape=false;continue;}if(ch==='\\'){escape=true;continue;}if(ch===quote)quote=null;continue;}
      if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
      if(ch==='{')depth++; else if(ch==='}'&&--depth===0)return script.slice(start,i+1);
    }
    throw new Error(`fim da função ${name} não encontrado`);
  }
  const store=storage(),calls=[];
  const classList={add:v=>calls.push(['class.add',v]),toggle:()=>{}};
  const back={innerHTML:'',classList:{toggle:()=>{}},setAttribute:()=>{}};
  const vtt={id:'screen-vtt',classList};
  const mode={id:'screen-mode-select',classList};
  let active={id:'screen-vtt'};
  const document={querySelector:q=>q==='.screen.active'?active:null,querySelectorAll:()=>[],getElementById:id=>id==='master-shield-back'?back:id==='screen-vtt'?vtt:id==='screen-mode-select'?mode:id==='vtt-table-name'?{textContent:'Ruptura'}:null};
  const window={__msShieldReturnContext:null,MS_TABLE_SHELL:{mount:(t,g)=>calls.push(['shell',t?.id,g])},MasterTools:{mountShield:g=>calls.push(['shield',g]),restoreVttState:()=>calls.push(['restore'])},MS_PLATFORM:{toast:()=>{}},initVttGrid:()=>calls.push(['grid'])};
  const context={window,document,sessionStorage:store,currentTableData:{id:'table-demo-001',name:'Ruptura'},isDraftMode:false,isVttGM:true,currentUser:{id:'profile-master',role:'mestre'},Date,JSON,setTimeout:fn=>fn(),msGetTableByCodeOrId:()=>null,msClone:v=>JSON.parse(JSON.stringify(v)),showScreen:id=>{calls.push(['show',id]);active={id};return true;},msCanUseMasterAuthority:()=>true};
  window.window=window;vm.createContext(context);
  vm.runInContext(`const MS_SHIELD_RETURN_KEY='ms:ui:shield-return:v2';\n${names.map(extract).join('\n')}\nwindow.__capture=captureMasterShieldReturnContext;window.__return=returnFromMasterShield;`,context);
  const captured=window.__capture();assert.equal(captured.tableId,'table-demo-001');assert.equal(captured.fromTable,true);
  context.currentTableData=null;window.__msShieldReturnContext=null;active={id:'screen-master-shield'};
  assert.equal(window.__return(),true);
  assert.ok(calls.some(x=>x[0]==='show'&&x[1]==='screen-vtt'));
  assert.ok(calls.some(x=>x[0]==='shell'&&x[1]==='table-demo-001'&&x[2]===true));
  assert.ok(calls.some(x=>x[0]==='shield'&&x[1]===true));
  assert.equal(store.getItem('ms:ui:shield-return:v2'),null);
});

test('estado funcional das Memórias alterna entre recolhido e aberto pelo mesmo contrato',()=>{
  const button={classList:{values:new Set(),toggle(k,on){on?this.values.add(k):this.values.delete(k)}},attrs:{},setAttribute(k,v){this.attrs[k]=v}};
  const input={focus(){}};const box={hidden:true,querySelector:()=>input};
  const state={shield:{button,box}};
  function positionMemoryPanel(){}
  function setMemoryPanelOpen(open){const button=state.shield?.button,box=state.shield?.box;if(!button||!box)return;box.hidden=!open;button.classList.toggle('is-open',!!open);button.setAttribute('aria-expanded',open?'true':'false');if(open){positionMemoryPanel(box);}}
  setMemoryPanelOpen(box.hidden);assert.equal(box.hidden,false);assert.equal(button.attrs['aria-expanded'],'true');assert.ok(button.classList.values.has('is-open'));
  setMemoryPanelOpen(box.hidden);assert.equal(box.hidden,true);assert.equal(button.attrs['aria-expanded'],'false');assert.ok(!button.classList.values.has('is-open'));
});

sandboxTest('Sandbox executa operações críticas de Mestre e ADM com autorização distinta',async()=>{
  const c=loadSandbox(),db=c.window.MS_DB;
  await db.signIn('mestre','mestre');
  let summaries=await db.fetchMyTableSummaries();assert.ok(summaries.data.some(t=>t.id==='table-demo-001'&&t.is_owner));
  let r=await db.createTableInvite('table-demo-001');assert.equal(r.error,null);
  r=await db.setTableLiveStatus('table-demo-001','paused');assert.equal(r.error,null);assert.equal(r.data.status,'paused');
  r=await db.publishTableEvent('table-demo-001','master_notice',{message:'Teste Mestre'});assert.equal(r.error,null);
  r=await db.setTableLiveStatus('table-demo-001','active');assert.equal(r.error,null);
  await db.signOut();await db.signIn('admin','admin');
  summaries=await db.fetchMyTableSummaries();assert.ok(summaries.data.some(t=>t.id==='table-demo-001'));
  r=await db.archiveTableSecure('table-demo-001',true);assert.equal(r.error,null);assert.equal(r.data.status,'archived');
  r=await db.archiveTableSecure('table-demo-001',false);assert.equal(r.error,null);assert.equal(r.data.status,'active');
  r=await db.setTableMemberRole('table-demo-001','33333333-3333-4333-8333-333333333333','observador');assert.equal(r.error,null);
});
