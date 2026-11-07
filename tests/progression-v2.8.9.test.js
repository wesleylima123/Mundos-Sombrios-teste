import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(p,'utf8');
const js = read('js/progression-v2.8.9.js');
const css = read('css/progression-v2.8.9.css');
const db = read('js/supabase-db.js');
const services = read('js/ms-services.js');
const migration = read('supabase-progression-v2.8.9-migration.sql');
const loader = read('js/feature-loader.js');
const script = read('js/script.js');
const hasSandbox=fs.existsSync('sandbox-offline/index.html');
const sandbox = hasSandbox?read('sandbox-offline/index.html'):'';
const offlineDb = hasSandbox?read('sandbox-offline/js/offline-db.js'):'';
const sandboxUi = hasSandbox?read('sandbox-offline/js/offline-sandbox-ui.js'):'';

test('V2.8.9 oferece visualizador universal sem abrir a Forja',()=>{
  assert.match(js,/VIEWER UNIVERSAL/);
  assert.match(js,/async function openViewer/);
  assert.match(db,/fetch_character_view/);
  assert.match(script,/ensureProgression/);
});

test('progressão V2.8.9 é lazy-loaded e não entra no boot principal',()=>{
  assert.match(loader,/ensureProgression/);
  assert.match(loader,/css\/progression-v2\.8\.9\.css/);
  assert.match(loader,/js\/progression-v2\.8\.9\.js/);
});

test('backend protege mecânica da ficha e separa edição narrativa',()=>{
  assert.match(migration,/CHARACTER_MECHANICS_LOCKED|CHARACTER_ARCHETYPE_LOCKED|USE_PROGRESSION_OR_RESOURCE_CONTROL/);
  assert.match(migration,/character_merge_narrative/);
  assert.match(migration,/save_character_secure/);
});

test('Mesa possui carteira PEG, conta por personagem e ledger imutável',()=>{
  assert.match(migration,/create table if not exists public\.table_progression_wallets/);
  assert.match(migration,/create table if not exists public\.character_progression_accounts/);
  assert.match(migration,/create table if not exists public\.progression_transactions/);
  assert.match(migration,/progression_grant_character/);
  assert.match(migration,/progression_reverse_grant/);
});

test('Mestre e ADM compram reserva PEG com SoulDrakma e jogador não recebe RPC de compra própria',()=>{
  assert.match(migration,/progression_buy_table_points/);
  assert.match(migration,/soul_add_transaction/);
  assert.match(migration,/can_manage_table\(p_table_id\)/);
  assert.doesNotMatch(migration,/progression_buy_character_points/);
});

test('Arconte concede ou retira PEG diretamente das Mesas',()=>{
  assert.match(migration,/progression_admin_tables/);
  assert.match(migration,/progression_admin_adjust_table/);
  assert.match(migration,/ADMIN_REQUIRED/);
  assert.match(js,/ARCONTE — concessão direta para reserva da Mesa/);
  assert.match(js,/data-admin-peg/);
  assert.match(services,/adminAdjustTable/);
});

test('recursos protegidos usam solicitação ou ajuste autorizado',()=>{
  assert.match(migration,/progression_adjust_resource/);
  assert.match(migration,/progression_request_resource/);
  assert.match(migration,/progression_resolve_resource/);
  assert.match(js,/CÊ/);
  assert.match(js,/LHL/);
  assert.match(js,/EP/);
});

test('requisitos de admissão e visibilidade de ficha são persistidos na Mesa',()=>{
  assert.match(js,/sheetVisibility/);
  assert.match(js,/exodoMin/);
  assert.match(js,/existenceMin/);
  assert.match(js,/patamarMin/);
  assert.match(migration,/sheetVisibility/);
  assert.match(migration,/CHARACTER_LEVEL_MISMATCH/);
});

test('Concessão usa a janela de PEG e mantém feedback sem o painel flutuante antigo',()=>{
 assert.doesNotMatch(js,/ms-evolution-orb|ms-progression-panel/);assert.match(js,/animateGrant/);assert.match(js,/canManage\(\)/);
 assert.match(read('js/operational-control-v2.10.1.js'),/mountEvolutionWorkspace/);assert.match(js,/data-lobby-character/);
});

test('Ocultatun mantém Sucessos de Carreira separados do PEG',()=>{
  assert.match(migration,/progression_record_career_success/);
  assert.match(migration,/career_progress/);
  assert.match(services,/recordCareer/);
});

test('sandbox integral preserva Jogador Mestre ADM PEG e SoulDrakma',{skip:!hasSandbox},()=>{
  assert.match(sandbox,/js\/script\.js/);
  assert.match(offlineDb,/jogador@offline\.local/);
  assert.match(offlineDb,/mestre@offline\.local/);
  assert.match(offlineDb,/admin@offline\.local/);
  assert.match(offlineDb,/grantCharacterProgression/);
  assert.match(offlineDb,/adminAdjustTableProgression/);
  assert.match(offlineDb,/fetchSoulAccountState/);
  assert.match(sandboxUi,/ADM \/ ARCONTE/);
});
