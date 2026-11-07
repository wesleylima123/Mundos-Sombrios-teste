import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('V2.5 carrega Soul Economy global e visual 3D',()=>{
  const html=read('index.html'),js=read('js/soul-economy.js'),css=read('css/soul-economy.css'),loader=read('js/feature-loader.js');
  assert.doesNotMatch(html,/css\/soul-economy\.css/);assert.match(loader,/css\/soul-economy\.css/);assert.match(html,/js\/soul-economy\.js/);
  for(const token of ['ms-soul-orb','ms-soul-canvas','createSoulOrbRenderer','COFRE SOULDRΔKMA','COLHEITA ATIVA','Ledger','playUnlockAnimation']) assert.match(js,new RegExp(token,'i'));
  for(const token of ['perspective','transform-style:preserve-3d','@keyframes soulFloat','@keyframes soulHaloA','ms-soul-flight','ms-soul-expansion-locked']) assert.match(css,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});

test('capacidades por papel são 3/5/infinito para fichas e 0/3/infinito para mesas',()=>{
  const js=read('js/script.js'),soul=read('js/soul-economy.js'),sql=read('supabase-soul-economy-v2.5-migration.sql');
  assert.match(js,/role==='mestre' \? 5 : 3/);assert.match(js,/role==='mestre' \? 3 : 0/);
  assert.match(soul,/role\(\)==='mestre'\?5:3/);assert.match(soul,/role\(\)==='mestre'\?3:0/);
  assert.match(sql,/when r='mestre' then 5 else 3/);assert.match(sql,/if r<>'mestre' then return 0/);assert.match(sql,/base:=3/);assert.match(sql,/2147483647/);
});

test('catálogo SoulDrakma usa os custos definidos e restringe slot de mesa a Mestre',()=>{
  const sql=read('supabase-soul-economy-v2.5-migration.sql');
  for(const [key,price] of [['character_slot',20000],['exp_aprimorador',50000],['exp_player',55000],['exp_linhagem',60000],['exp_envolto',70000],['exp_ordem',70000],['master_table_slot',70000]]) assert.match(sql,new RegExp(`'${key}'[^\\n]*${price}`));
  assert.match(sql,/MASTER_ONLY_PRODUCT/);assert.match(sql,/EXPANSIONS_ALREADY_UNLOCKED/);assert.match(sql,/ADMIN_UNLIMITED_ACCESS/);
});

test('expansões permanecem visíveis mas criação é protegida por entitlement',()=>{
  const js=read('js/script.js'),soul=read('js/soul-economy.js'),sql=read('supabase-soul-economy-v2.5-migration.sql');
  for(const name of ['Arquiteto de Linhagem (Aprimorador)','Operador de Sistema (Proj. Player)','Classer (Linhagem Herdada)','O Envolto (Horror Cósmico)','A Ordem dos Sete (Alta Glória)']) assert.ok(soul.includes(name));
  assert.match(js,/MS_SOUL\.canUseNature\(natureName\)/);assert.match(soul,/CRIAÇÃO BLOQUEADA/);assert.match(soul,/showLockedExpansion/);
  assert.match(sql,/EXPANSION_LOCKED/);assert.match(sql,/soul_expansion_key_for_nature/);assert.match(sql,/soul_has_expansion/);
});

test('Colheita dura 10 minutos, rende 2 SD por minuto e exige nova interação para reinício',()=>{
  const sql=read('supabase-soul-economy-v2.5-migration.sql'),js=read('js/soul-economy.js');
  assert.match(sql,/now\(\)\+interval '10 minutes'/);assert.match(sql,/award:=delta\*2/);assert.match(sql,/credited_minutes between 0 and 10/);
  assert.match(sql,/status='active'/);assert.ok(sql.includes("'complete'"));assert.match(sql,/soul_touch_activity/);assert.match(js,/setInterval\(tick,60000\)/);assert.match(js,/document\.visibilityState!=='visible'/);
  assert.match(sql,/last_activity_at\+interval '75 seconds'/);
});

test('compras são atômicas e registradas no Ledger antes de conceder entitlement',()=>{
  const sql=read('supabase-soul-economy-v2.5-migration.sql');
  const purchase=sql.slice(sql.indexOf('create or replace function public.soul_purchase'),sql.indexOf('create or replace function public.soul_get_account_state'));
  assert.ok(purchase.indexOf("soul_add_transaction(auth.uid(),-p.price,'PURCHASE'") < purchase.indexOf('insert into public.user_entitlements'));
  assert.match(sql,/soul_transactions/);assert.match(sql,/balance_after/);assert.match(sql,/INSUFFICIENT_SOULDRAKMA/);
});

test('criação de ficha e mesa também é protegida no Supabase',()=>{
  const sql=read('supabase-soul-economy-v2.5-migration.sql');
  const save=sql.slice(sql.indexOf('create or replace function public.save_character_secure'),sql.indexOf('-- Guardas server-side de criação de mesa'));
  const table=sql.slice(sql.indexOf('create or replace function public.create_table_secure'),sql.indexOf('-- RLS:'));
  assert.match(save,/soul_character_capacity/);assert.match(save,/CHARACTER_SLOT_LIMIT/);assert.match(save,/soul_has_expansion/);
  assert.match(table,/soul_table_capacity/);assert.match(table,/TABLE_SLOT_LIMIT/);assert.match(table,/GM_REQUIRED/);
  assert.match(save,/Personagens legados permanecem editáveis/);
});

test('ADM pode auditar, conceder e retirar moeda e gerenciar entitlements',()=>{
  const sql=read('supabase-soul-economy-v2.5-migration.sql'),js=read('js/soul-economy.js');
  for(const fn of ['soul_admin_get_account','soul_admin_adjust_balance','soul_admin_set_entitlement']) assert.match(sql,new RegExp(fn));
  assert.match(sql,/ADMIN_GRANT/);assert.match(sql,/ADMIN_REMOVE/);assert.match(sql,/REASON_REQUIRED|KEY_AND_REASON_REQUIRED/);
  for(const token of ['Controle SoulDrakma','adminAdjustBalance','adminSetEntitlement','Todos os ajustes entram no Ledger']) assert.match(js,new RegExp(token));
});

test('conquistas cobrem coleta e desbloqueio de expansões',()=>{
  const sql=read('supabase-soul-economy-v2.5-migration.sql'),js=read('js/soul-economy.js');
  for(const key of ['first_harvest','collector_10k','collector_50k','collector_100k','unlock_aprimorador','unlock_player','unlock_linhagem','unlock_envolto','unlock_ordem']) assert.match(sql,new RegExp(key));
  assert.match(sql,/ACHIEVEMENT/);assert.match(js,/CONQUISTAS/);assert.match(js,/ms-achievement-grid/);
});

test('importação JSON não contorna slot, expansão nem persistência segura',()=>{
  const js=read('js/script.js'),db=read('js/supabase-db.js'),services=read('js/ms-services.js');
  const imp=js.slice(js.indexOf('function importCharacterJSON'),js.indexOf('function openCodex'));
  assert.match(imp,/msCanCreateCharacter/);
  assert.match(imp,/MS_SOUL\.canUseNature/);
  assert.match(imp,/showLockedExpansion/);
  assert.match(imp,/msPersistCharacterToRepo/);
  assert.match(imp,/crypto\?\.randomUUID|crypto\.randomUUID/);
  assert.match(db,/return \{ data: data \|\| null, error \}/);
  assert.match(services,/Characters[\s\S]*unwrapDB\(db\(\)\.saveCharacter/);
});

test('conquistas de coleta contam apenas SoulDrakma colhida e podem conceder cosmético',()=>{
  const sql=read('supabase-soul-economy-v2.5-migration.sql'),js=read('js/soul-economy.js'),css=read('css/soul-economy.css');
  assert.match(sql,/lifetime_harvested/);
  assert.match(sql,/p_type='HARVEST'/);
  assert.match(sql,/select lifetime_harvested into harvested/);
  assert.match(sql,/entitlement_type,entitlement_key[\s\S]*'cosmetic'/);
  assert.match(js,/moldura-fenda/);
  assert.match(css,/has-fenda-frame/);
});

test('helpers econômicos ficam internos, grants de entitlement entram no Ledger e não existe transferência entre contas',()=>{
  const sql=read('supabase-soul-economy-v2.5-migration.sql');
  for(const fn of ['soul_profile_role','soul_ensure_wallet','soul_slot_bonus','soul_settle_harvest','soul_character_capacity','soul_table_capacity','soul_has_expansion']) assert.match(sql,new RegExp(`revoke all on function public\\.${fn}`));
  assert.match(sql,/ENTITLEMENT_GRANT/);assert.match(sql,/ENTITLEMENT_REVOKE/);
  assert.match(sql,/ROLE_HAS_INHERENT_EXPANSIONS/);
  assert.doesNotMatch(sql,/create or replace function public\.[a-z0-9_]*transfer/i);
});


test('V2.5.1 Orbe SoulDrakma é 3D real em Canvas e anima mesmo dormente',()=>{
  const js=read('js/soul-economy.js'),css=read('css/soul-economy.css');
  for(const token of ['const faces=[[0,11,5]','project=(v,size)','ordered=faces.map','requestAnimationFrame(loop)','ms-soul-canvas','ms-soul-halo-a','ms-soul-halo-b']) assert.match(js,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(js,/active\?\.00135:\.00042/);
  assert.match(css,/\.ms-soul-art\{[^}]*animation:soulFloat/);
  assert.match(css,/\.ms-soul-halo-a\{[^}]*animation:soulHaloA/);
  assert.match(css,/\.ms-soul-halo-b\{[^}]*animation:soulHaloB/);
});
