import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const services = readFileSync('js/ms-services.js', 'utf8');
const db = readFileSync('js/supabase-db.js', 'utf8');
const migration = readFileSync('supabase-online-migration.sql', 'utf8');
const production = readFileSync('supabase-production.sql', 'utf8');
const room = readFileSync('js/master-room.js', 'utf8');
const tools = readFileSync('js/master-tools.js', 'utf8');
const index = readFileSync('index.html', 'utf8');
const script = readFileSync('js/script.js', 'utf8');
const read = file => readFileSync(file, 'utf8');

test('serviços de domínio são a camada única entre UI e banco', () => {
  for (const name of ['Auth', 'Profile', 'Character', 'Game', 'VTT', 'Content']) assert.match(services, new RegExp(`const ${name}Service`));
  assert.match(index, /js\/ms-services\.js/);
});

test('modelo online tem convites, histórico, campanhas e sessões', () => {
  for (const token of ['table_invites', 'character_versions', 'campaigns', 'game_sessions', 'fetch_table_roster', 'fetch_table_characters']) assert.match(migration, new RegExp(token));
  assert.match(production, /Mundos Sombrios — Schema completo de produção/);
});

test('mesa e personagem usam operações seguras', () => {
  assert.match(db, /create_table_secure/);
  assert.match(db, /join_table_secure/);
  assert.match(db, /save_character_secure/);
  assert.match(db, /delete_table_secure/);
  assert.doesNotMatch(script, /client\.from\(['"]tables['"]\)\.delete\(\)/);
});

test('login não cria versões artificiais de personagens', () => {
  assert.doesNotMatch(db, /snapshot\.characters\)\s*\{[\s\S]*saveCharacter\(character\)/);
});

test('VTT diferencia estado estrutural e eventos de jogadores', () => {
  const session = read('js/table-session-engine.js');
  assert.match(tools, /Snapshot é apenas estrutural/);
  assert.match(session, /fetchTableEventsAfter/);
  assert.match(db, /table_state/);
  assert.match(db, /table_events/);
});

test('Ancoragem V3 consulta associação canônica e oferece convites', () => {
  const scriptSource = read('js/script.js');
  assert.match(scriptSource, /Games\.summaries/);
  assert.match(room, /createInvite/);
  assert.match(room, /Ancoragem V3/);
});


test('Realtime de mesa usa Broadcast privado e Presence, sem Postgres Changes', () => {
  const db = read('js/supabase-db.js');
  assert.match(db, /config:\s*\{ private:\s*true/);
  assert.match(db, /\.on\('broadcast'/);
  assert.match(db, /\.on\('presence'/);
  assert.doesNotMatch(db, /postgres_changes/);
});

test('Autorização Realtime limita canais à mesa do usuário', () => {
  const sql = read('supabase-production.sql');
  assert.match(sql, /ms_realtime_table_select/);
  assert.match(sql, /realtime\.topic\(\) like 'ms:table:%'/);
  assert.match(sql, /table_members tm/);
});

test('VTT propaga movimentos e consolida estado persistente pelo Mestre', () => {
  const source = read('js/script.js');
  const tools = read('js/master-tools.js');
  assert.match(source, /'token_move'/);
  assert.match(tools, /event_type==='token_move'/);
  assert.match(tools, /isVttGM\(\)\s*&&\s*window\.MasterTools\?\.saveGrid/);
});
