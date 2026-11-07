import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=f=>readFileSync(f,'utf8');
const HAS_V27_BASE_MIGRATION=existsSync('supabase-table-session-v2.7-migration.sql');
const migrationTest=HAS_V27_BASE_MIGRATION?test:test.skip;

test('V2.7 instala uma única camada de sessão e a nova Mesa/Ancoragem',()=>{
  const html=read('index.html'),pkg=JSON.parse(read('package.json'));
  assert.match(pkg.version,/^2\.(?:7|8|9|10|11)\./);
  assert.match(html,/js\/ms-config\.js/);
  for(const token of ['js/table-session-engine.js','js/table-room.js']) assert.doesNotMatch(html,new RegExp(token.replaceAll('.','\\.')));
  for(const token of ['js/table-session-engine.js','js/table-room.js']) assert.match(read('js/feature-loader.js'),new RegExp(token.replaceAll('.','\\.')));
  assert.doesNotMatch(html,/css\/table-room\.css/);
  assert.match(read('js/feature-loader.js'),/css\/table-room\.css/);
  assert.match(read('js/master-room.js'),/Ancoragem V3/);
  assert.match(read('js/table-room.js'),/Salão, Grid e PEG/);
});

test('associação canônica não depende de participants na Ancoragem nem no Centro de Comando',()=>{
  const room=read('js/master-room.js'),command=read('js/master-command-center.js'),script=read('js/script.js');
  assert.doesNotMatch(room,/\.participants\b/);
  assert.doesNotMatch(command,/\.participants\b/);
  assert.match(command,/Games\?\.roster|Games\.roster/);
  assert.match(script,/fetch_my_table_summaries|Games\.summaries/);
  assert.match(script,/participants permanece apenas para leitura de backups antigos/);
});

test('sair da sessão ao vivo não abandona a campanha e exclusão aguarda confirmação do servidor',()=>{
  const source=read('js/script.js');
  const leave=source.slice(source.indexOf('async function leaveVTT'),source.indexOf('function openManagePlayers'));
  assert.doesNotMatch(leave,/Games\.leave/);
  assert.match(leave,/MS_TABLE_SESSION\?\.disconnect/);
  const del=source.slice(source.indexOf('async function deleteTable'),source.indexOf('async function leaveJoinedTable'));
  assert.match(del,/await window\.MS_SERVICES\.Games\.delete/);
  assert.match(del,/servidor não confirmou a exclusão/i);
});

test('chat compartilhado não injeta HTML fornecido por participantes',()=>{
  const source=read('js/script.js');
  const add=source.slice(source.indexOf('function addChatMessage'),source.indexOf('function toggleChatLock'));
  assert.match(add,/textContent/);
  assert.doesNotMatch(add,/innerHTML\s*\+=/);
});

test('Table Session Engine normaliza estado, não reproduz efeitos históricos e preserva evento recebido durante bootstrap',async()=>{
  let subscribedHandler=null; const delivered=[]; const emitted=[];
  const context={console,setTimeout,clearTimeout,crypto:{randomUUID:()=> '00000000-0000-4000-8000-000000000001'},window:{}};
  context.window.MS_PLATFORM={emit:(name,payload)=>emitted.push([name,payload])};
  context.window.MS_SERVICES={VTT:{state:async()=>({chat:null,controls:null}),event:async()=>({id:4})}};
  context.window.MS_DB={fetchTableEventsAfter:async()=>({data:[{id:1,event_type:'chat',payload:{msg:'antiga'}},{id:2,event_type:'dice',payload:{result:8}}],error:null})};
  context.window.MS_REALTIME={connect:async(id,handler,options)=>{subscribedHandler=handler;options.status('SUBSCRIBED');handler({id:3,event_type:'chat',payload:{msg:'durante'}});return()=>{};},disconnect(){},current:()=>({presence:{}})};
  vm.createContext(context);vm.runInContext(read('js/table-session-engine.js'),context);
  const engine=context.window.MS_TABLE_SESSION; const boot=await engine.connect('mesa-1',e=>delivered.push(e));
  assert.equal(boot.state.schemaVersion,3);assert.deepEqual(Array.from(boot.state.chat),[]);assert.deepEqual(Array.from(boot.state.dice),[]);
  assert.deepEqual(boot.events.map(e=>e.id),[1,2]);
  assert.deepEqual(delivered.map(e=>e.id),[3]);
  subscribedHandler({id:4,event_type:'chat',payload:{msg:'nova'}});
  assert.deepEqual(delivered.map(e=>e.id),[3,4]);
  assert.equal(engine.current().lastEventId,4);
});

migrationTest('evento persistido é fonte de verdade e Broadcast nasce do banco',()=>{
  const db=read('js/supabase-db.js'),sql=read('supabase-table-session-v2.7-migration.sql');
  assert.match(db,/append_table_event_v3/);
  assert.match(db,/fetchTableEventsAfter/);
  assert.match(sql,/client_event_id uuid/);
  assert.match(sql,/create trigger trg_ms_table_event_broadcast_v27 after insert/);
  assert.match(sql,/realtime\.send\(to_jsonb\(new\),'table:event'/);
  assert.match(sql,/revoke insert on public\.table_events from anon, authenticated/);
});

migrationTest('Realtime privado contempla jogador, mestre e ADM e transmite refresh/deleção',()=>{
  const db=read('js/supabase-db.js'),sql=read('supabase-table-session-v2.7-migration.sql');
  assert.match(db,/event: 'table:deleted'/);assert.match(db,/event: 'table:refresh'/);
  assert.match(sql,/public\.current_profile_role\(\)='admin'/);
  assert.match(sql,/ms_realtime_table_select_v27/);assert.match(sql,/ms_realtime_table_insert_v27/);
  assert.match(sql,/table_members tm/);
});

migrationTest('fichas usam auth UUID do participante e SQL limita jogador à própria ficha',()=>{
  const source=read('js/script.js')+read('js/master-tools.js'),sql=read('supabase-table-session-v2.7-migration.sql');
  assert.match(source,/currentUser\.authUserId\|\|currentUser\.id/);
  assert.match(sql,/c\.user_id=auth\.uid\(\)::text/);
  assert.match(sql,/public\.can_manage_table\(p_table_id\)/);
  assert.match(sql,/table_members tm where tm\.table_id=p_table_id and tm\.character_id=c\.id and tm\.status='active'/);
});

migrationTest('Direção ao vivo e telemetria administrativa fazem parte da Mesa V3',()=>{
  const shell=read('js/table-room.js'),services=read('js/ms-services.js'),sql=read('supabase-table-session-v2.7-migration.sql');
  assert.match(shell,/DIREÇÃO AO VIVO/);assert.match(shell,/DIAGNÓSTICO DO ARCONTE/);assert.match(shell,/TRANSMITIR AVISO/);
  assert.match(services,/setLiveStatus/);assert.match(sql,/set_table_live_status/);assert.match(sql,/'table_status'/);
  assert.match(shell,/pending/);assert.match(shell,/reconnects/);assert.match(shell,/projectRef/);
});
