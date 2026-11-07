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

test('Ancoragem oferece Diretório de Fendas universal e criação com três modos',()=>{
  const html=read('index.html');
  assert.match(html,/id="tab-btn-directory"/);
  assert.match(html,/id="ancoragem-directory-tab"/);
  assert.match(html,/id="table-directory-root"/);
  for(const mode of ['exodo','ocultatun','hybrid']) assert.match(html,new RegExp(`data-create-mode="${mode}"`));
  assert.match(html,/id="new-table-expansion-grid"/);
  assert.match(html,/id="new-table-class-grid"/);
});

test('Diretório público é sanitizado e full tables continuam membership-only',()=>{
  const sql=read('supabase-table-directory-v2.8-migration.sql');
  const rpc=sql.slice(sql.indexOf('create or replace function public.fetch_public_table_directory'),sql.indexOf('-- ---------------------------------------------------------------------------\n-- 6)'));
  assert.match(rpc,/description text/);
  assert.match(rpc,/allowed_expansions jsonb/);
  assert.match(rpc,/allowed_classes jsonb/);
  assert.match(rpc,/player_count bigint/);
  assert.match(rpc,/online_count bigint/);
  assert.doesNotMatch(rpc,/\bcode text\b/);
  assert.doesNotMatch(rpc,/\bsettings jsonb\b/);
  assert.doesNotMatch(rpc,/\bparticipants jsonb\b/);
  assert.match(sql,/create policy ms_tables_select_v28[\s\S]*table_members[\s\S]*status='active'/);
});

test('Pré-requisitos são validados no servidor para modo, expansão, classe e capacidade',()=>{
  const sql=read('supabase-table-directory-v2.8-migration.sql');
  const helper=sql.slice(sql.indexOf('create or replace function private.table_join_rejection'),sql.indexOf('-- ---------------------------------------------------------------------------\n-- 5)'));
  for(const token of ['GAME_MODE_MISMATCH','EXPANSION_MISMATCH','CLASS_MISMATCH','TABLE_FULL','CHARACTER_NOT_OWNED','MEMBER_BANNED']) assert.match(helper,new RegExp(token));
  assert.match(helper,/v_mode='hybrid'/);
  assert.match(helper,/allowedExpansions/);
  assert.match(helper,/allowedClasses/);
  assert.match(helper,/member_role='jogador'/);
});

test('Código privado e convites não contornam validação e admissões são serializadas',()=>{
  const sql=read('supabase-table-directory-v2.8-migration.sql');
  const join=sql.slice(sql.indexOf('create or replace function public.join_table_secure'),sql.indexOf('-- ---------------------------------------------------------------------------\n-- 11)'));
  assert.match(join,/private\.table_join_rejection/);
  assert.match(join,/CHARACTER_NOT_OWNED/);
  assert.match(join,/for update/);
  const resolve=sql.slice(sql.indexOf('create or replace function public.resolve_table_join_request'),sql.indexOf('-- ---------------------------------------------------------------------------\n-- 7)'));
  assert.match(resolve,/select id into v_locked_table from public\.tables where id=v\.table_id for update/);
  const accept=sql.slice(sql.indexOf('create or replace function public.accept_table_recruitment_invite'),sql.indexOf('create or replace function public.cancel_table_recruitment_invite'));
  assert.match(accept,/select \* into v_table from public\.tables where id=v_inv\.table_id for update/);
  assert.match(accept,/private\.table_join_rejection/);
});

test('Solicitações e convites têm fluxo persistente e lobby privado de atualização',()=>{
  const sql=read('supabase-table-directory-v2.8-migration.sql');
  assert.match(sql,/create table if not exists public\.table_join_requests/);
  assert.match(sql,/create unique index if not exists idx_table_join_requests_pending/);
  assert.match(sql,/create table if not exists public\.table_recruitment_invites/);
  assert.match(sql,/p_scope text/);
  assert.match(sql,/v_scope not in \('global','user'\)/);
  assert.match(sql,/create policy ms_realtime_lobby_select_v28/);
  assert.doesNotMatch(sql,/create policy ms_realtime_lobby_insert_v28/);
  assert.match(sql,/trg_lobby_members_v28/);
  assert.match(sql,/trg_lobby_tables_v28/);
});

test('Solicitação administrativa usa resolução atômica e frontend limpa resposta vazia',()=>{
  const sql=read('supabase-table-directory-v2.8-migration.sql');
  const js=read('js/script.js');
  assert.match(sql,/create or replace function public\.resolve_admin_request_secure/);
  assert.match(sql,/for update/);
  assert.match(sql,/v_type in \('master_role','admin_role'\)/);
  assert.match(sql,/exception when invalid_text_representation/);
  assert.match(js,/resolveAdminRequestSecure\(reqId,approved\)/);
  assert.doesNotMatch(js,/Array\.isArray\(remoteRequests\)\s*&&\s*remoteRequests\.length\s*\?/);
});

test('Frontend do Diretório mostra requisitos, capacidade, online e convites',()=>{
  const js=read('js/table-directory.js');
  for(const token of ['SOLICITAR ENTRADA','ACEITAR CONVITE','MESA LOTADA','RECRUTAMENTO FECHADO','online','jogadores','allowed_expansions','allowed_classes']) assert.match(js,new RegExp(token));
  assert.match(js,/updateRecruitment/);
  assert.match(js,/createRecruitmentInvite/);
  assert.match(js,/resolveJoinRequest/);
  assert.match(js,/eligibility/);
});

sandboxTest('Sandbox: jogador vê catálogo público inteiro mas somente suas mesas internas',async()=>{
  const c=sandbox(),db=c.window.MS_DB;
  assert.equal((await db.signIn('jogador','jogador')).error,null);
  const mine=await db.fetchMyTableSummaries();
  assert.equal(mine.error,null);
  assert.equal(Array.from(mine.data,x=>x.id).join(','),'table-demo-001');
  const dir=await db.fetchPublicTableDirectory();
  assert.equal(dir.error,null);
  assert.equal(dir.data.length,3);
  assert.ok(dir.data.some(x=>x.id==='table-demo-002'&&!x.is_member));
  const forbidden=await db.fetchTableCharacters('table-demo-002');
  assert.ok(forbidden.error);
});

sandboxTest('Sandbox: ficha incompatível é recusada automaticamente e ficha compatível gera pedido',async()=>{
  const c=sandbox(),db=c.window.MS_DB;
  await db.signIn('jogador','jogador');
  const bad=await db.requestTableJoin('table-demo-002','char-player-a');
  assert.equal(bad.error,null);assert.equal(bad.data.status,'auto_rejected');assert.equal(bad.data.rejection_reason,'GAME_MODE_MISMATCH');
  await db.signOut();await db.signIn('jogador2','jogador2');
  const good=await db.requestTableJoin('table-demo-003','char-player-b');
  assert.equal(good.error,null);assert.equal(good.data.status,'pending');
});

sandboxTest('Sandbox: Mestre aprova pedido válido e usuário passa a ver a mesa internamente',async()=>{
  const c=sandbox(),db=c.window.MS_DB;
  await db.signIn('jogador2','jogador2');
  const req=await db.requestTableJoin('table-demo-003','char-player-b');assert.equal(req.data.status,'pending');
  await db.signOut();await db.signIn('admin','admin');
  const decided=await db.resolveTableJoinRequest(req.data.id,true,'');assert.equal(decided.error,null);assert.equal(decided.data.status,'approved');
  await db.signOut();await db.signIn('jogador2','jogador2');
  const mine=await db.fetchMyTableSummaries();assert.ok(mine.data.some(x=>x.id==='table-demo-003'));
});

sandboxTest('Sandbox: convite direcionado exige pré-requisitos e convite global é exibido no diretório',async()=>{
  const c=sandbox(),db=c.window.MS_DB;
  await db.signIn('mestre','mestre');
  const target=await db.createTableRecruitmentInvite('table-demo-002','user','jogador','Convite para a fronteira');assert.equal(target.error,null);
  const global=await db.createTableRecruitmentInvite('table-demo-002','global','','Recrutamento aberto');assert.equal(global.error,null);
  await db.signOut();await db.signIn('jogador','jogador');
  const dir=await db.fetchPublicTableDirectory();const row=dir.data.find(x=>x.id==='table-demo-002');assert.ok(row.invite_id);assert.equal(row.invite_scope,'user');
  const bad=await db.acceptTableRecruitmentInvite(target.data.id,'char-player-a');assert.ok(bad.error);assert.equal(bad.error.message,'GAME_MODE_MISMATCH');
});

sandboxTest('Sandbox: decisão administrativa aprova/recusa uma única vez e não reaparece pendente',async()=>{
  const c=sandbox(),db=c.window.MS_DB;
  await db.signIn('admin','admin');
  const before=await db.fetchAdminRequests();const req=before.find(x=>x.id==='req-sandbox-master');assert.equal(req.status,'pending');
  const first=await db.resolveAdminRequestSecure(req.id,true);assert.equal(first.error,null);assert.equal(first.data.status,'approved');
  const second=await db.resolveAdminRequestSecure(req.id,false);assert.equal(second.error,null);assert.equal(second.data.status,'approved');
  const after=await db.fetchAdminRequests();assert.equal(after.filter(x=>x.status==='pending').length,0);
  const users=await db.fetchUsers();assert.equal(users.find(x=>x.username==='jogador2').role,'mestre');
});
