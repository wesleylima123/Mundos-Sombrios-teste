import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');

test('Mesa V3 mantém ações de sair/salvar acessíveis abaixo de 1050px',()=>{
  const css=read('css/table-shell-v3.css');
  const media=css.slice(css.indexOf('@media(max-width:1050px)'),css.indexOf('@media(max-width:760px)'));
  assert.match(media,/\.ms-table-v3-head-actions\{[^}]*display:flex/);
  assert.doesNotMatch(media,/\.ms-table-v3-head-actions\{[^}]*display:none/);
  assert.match(media,/grid-template-rows:auto/);
});

test('Cliente expõe resolução, silenciamento e exclusão administrativa seguras',()=>{
  const db=read('js/supabase-db.js'),ui=read('js/script.js');
  for(const rpc of ['resolve_admin_request_secure','silence_admin_request_secure','delete_admin_request_secure']) assert.match(db,new RegExp(rpc));
  assert.match(ui,/function silenceAdminRequest/);
  assert.match(ui,/function deleteAdminRequest/);
  assert.match(ui,/Silenciar/);
  assert.match(ui,/Excluir/);
});

test('Patch SQL reconhece owner profile e owner auth legado e restringe exclusão a dono ou ADM',()=>{
  const sql=read('supabase-bugfix-v2.8.2-migration.sql');
  assert.match(sql,/tb\.owner_id=auth\.uid\(\)::text/);
  assert.match(sql,/tb\.owner_id=\(select p\.id from public\.profiles p where p\.auth_user_id=auth\.uid\(\)/);
  assert.match(sql,/create or replace function public\.can_manage_table/);
  assert.match(sql,/create or replace function public\.can_access_table_session/);
  const del=sql.slice(sql.indexOf('create or replace function public.delete_table_secure'),sql.indexOf('create or replace function public.update_table_settings_secure'));
  assert.match(del,/OWNER_REQUIRED/);
  assert.doesNotMatch(del,/public\.can_manage_table\(p_table_id\)/);
});

test('supabase-production consolidado contém as RPCs administrativas da V2.8.2',()=>{
  const sql=read('supabase-production.sql');
  for(const fn of ['resolve_admin_request_secure','silence_admin_request_secure','delete_admin_request_secure']) assert.match(sql,new RegExp(`create or replace function public\\.${fn}`));
});
