import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import cryptoMod from 'node:crypto';

const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const LEGACY_SANDBOX_RUNTIME=fs.existsSync(new URL('../test/sandbox-runtime.js',import.meta.url));
const sandboxTest=LEGACY_SANDBOX_RUNTIME?test:test.skip;

function sandbox(){
  const store=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()};};
  class FakeChannel{addEventListener(_,fn){this.fn=fn;}postMessage(){}close(){}}
  class FakeEvent{constructor(type,opts={}){this.type=type;this.detail=opts.detail;}}
  const listeners={};
  const window={addEventListener:(n,f)=>{(listeners[n]??=[]).push(f)},removeEventListener:(n,f)=>{listeners[n]=(listeners[n]||[]).filter(x=>x!==f)},dispatchEvent:(e)=>{for(const f of listeners[e.type]||[])f(e);return true;}};
  const context={window,localStorage:store(),sessionStorage:store(),BroadcastChannel:FakeChannel,CustomEvent:FakeEvent,console,crypto:{randomUUID:()=>cryptoMod.randomUUID()},Date,Math,setInterval:()=>1,clearInterval:()=>{},setTimeout:(f)=>{f();return 1;},clearTimeout:()=>{},location:{reload(){}}};
  vm.createContext(context);vm.runInContext(read('test/sandbox-runtime.js'),context);
  return context;
}

test('Mesa mantém três janelas próprias e comunicação independente para Jogador',()=>{
 const html=read('index.html'),shell=read('js/table-room.js'),css=read('css/table-room.css');
 for(const id of ['ms-lobby-cards','vtt-grid-window','ms-room-peg','vtt-chat-box','vtt-dice-box'])assert.match(html,new RegExp(`id="${id}"`));
 assert.equal((html.match(/data-room-window=/g)||[]).length,3);
 assert.match(shell,/el.hidden=el.dataset.roomWindow!==next/);
 assert.match(css,/\.ms-room-float\{[^}]*position:fixed/);
});

sandboxTest('Jogador recebe roster público da própria mesa sem receber fichas completas alheias',async()=>{
  const sql=read('supabase-table-directory-v2.8-migration.sql');
  assert.match(sql,/create or replace function public\.fetch_table_roster\(p_table_id text\)[\s\S]*public\.can_access_table_session\(p_table_id\)/);
  const script=read('js/script.js');
  assert.match(script,/Games\.roster\(currentTableData\.id\)/);
  assert.match(script,/isRosterOnly:true/);
  assert.match(script,/Ficha completa privada/);
  assert.match(script,/char\.isRosterOnly/);
  assert.match(script,/wrapper\.onclick=\(\)=>window\.MS_PLATFORM\?\.toast/);
  assert.match(script,/const restrict = !isVttGM && !char\.isMe/);

  const c=sandbox(),db=c.window.MS_DB;
  await db.signIn('jogador','jogador');
  const roster=await db.fetchTableRoster('table-demo-001');
  assert.equal(roster.error,null);
  assert.equal(roster.data.filter(x=>x.status==='active').length,3);
  assert.ok(roster.data.some(x=>x.character_name==='Raven'));
  assert.ok(roster.data.some(x=>x.character_name==='Helena'));
  assert.ok(roster.data.some(x=>x.character_name==='Marcus Vhal'));
  const full=await db.fetchTableCharacters('table-demo-001');
  assert.equal(full.error,null);
  assert.deepEqual(Array.from(full.data,x=>x.name),['Raven']);
});

sandboxTest('Jogador consegue publicar chat e rolagem e ler o estado/grid da própria mesa',async()=>{
  const c=sandbox(),db=c.window.MS_DB;
  await db.signIn('jogador','jogador');
  const state=await db.fetchTableState('table-demo-001');
  assert.equal(state.error,null);
  assert.equal(state.data.schemaVersion,3);
  assert.ok(state.data.grid && typeof state.data.grid==='object');
  const chat=await db.publishTableEvent('table-demo-001','chat',{sender:'Raven',msg:'Teste de chat do jogador'},{clientEventId:'00000000-0000-4000-8000-000000000201'});
  assert.equal(chat.error,null);
  const dice=await db.publishTableEvent('table-demo-001','dice',{sender:'Raven',type:'d20',result:13},{clientEventId:'00000000-0000-4000-8000-000000000202'});
  assert.equal(dice.error,null);
  const events=await db.fetchTableEventsAfter('table-demo-001',3,20);
  assert.equal(events.error,null);
  assert.equal(events.data.length,2);
  assert.equal(events.data[0].event_type,'chat');
  assert.equal(events.data[1].event_type,'dice');
});

test('Jogador não recebe controles de Direção/Escudo na Mesa',()=>{
 const shell=read('js/table-room.js'),html=read('index.html');
 assert.match(shell,/querySelectorAll\('\[data-gm-only\]'\).forEach\(x=>x.hidden=!asGM\)/);
 for(const action of ['director','manage','shield'])assert.match(html,new RegExp('data-gm-only data-room-action="'+action+'"'));
});

sandboxTest('Sandbox não ecoa evento da própria aba e Mesa hidrata saúde atual ao montar',()=>{
  const runtime=read('test/sandbox-runtime.js');
  const shell=read('js/table-room.js');
  assert.match(runtime,/if\(m\.tabId===tabId\)return;/);
  assert.match(shell,/const currentHealth=window\.MS_TABLE_SESSION\?\.current\?\.\(\);/);
  assert.match(shell,/lastHealth=currentHealth/);
  assert.match(shell,/syncLabel\.textContent=status\.toUpperCase\(\)/);
});

test('Reentrada na Mesa usa o renderer canônico sem acesso rápido legado',()=>{
 const script=read('js/script.js');assert.match(script,/function renderVttCards\(\) \{\s*window.MS_TABLE_SHEETS\?\.sync\(\)/);
 assert.doesNotMatch(script,/vtt-quick-access|qaContainer|qaBtn/);
});
