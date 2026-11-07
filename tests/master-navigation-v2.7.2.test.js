import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('Memórias do Mundo ficam recolhidas no ícone e podem alternar abertura',()=>{
  const js=read('js/master-tools.js');
  assert.match(js,/Memórias do Mundo/);
  assert.match(js,/aria-expanded','false/);
  assert.match(js,/makeShieldIconDraggable\(button,\(\)=>setMemoryPanelOpen\(box\.hidden\)\)/);
  assert.match(js,/collapseMemoryPanel/);
});

test('Memórias do Mundo possuem arraste persistente e clamp de viewport',()=>{
  const js=read('js/master-tools.js');
  assert.match(js,/makeMemoryPanelDraggable/);
  assert.match(js,/pointerdown/);
  assert.match(js,/pointermove/);
  assert.match(js,/setPointerCapture/);
  assert.match(js,/ms:ui:world-memory:position:v1/);
  assert.match(js,/clampMemoryPanel/);
});

test('Escudo preserva contexto de retorno à Mesa V3',()=>{
  const script=read('js/script.js');
  const loader=read('js/master-shield-loader.js');
  const shield=read('js/master-shield.js');
  const html=read('index.html');
  assert.match(script,/captureMasterShieldReturnContext/);
  assert.match(script,/returnFromMasterShield/);
  assert.match(script,/RETORNAR À MESA/);
  assert.match(script,/MS_TABLE_SHELL\?\.mount/);
  assert.doesNotMatch(script,/function returnFromMasterShield[\s\S]{0,1200}disconnect/);
  assert.match(loader,/captureMasterShieldReturnContext/);
  assert.match(shield,/captureMasterShieldReturnContext/);
  assert.match(html,/id="master-shield-back"[^>]+onclick="returnFromMasterShield\(\)"/);
});

test('V2.7.3 inclui hardening complementar sem recriar a base',()=>{
  assert.match(read('VERSION.txt').trim(),/^2\.(?:7|8|9|10|11)\./);
  assert.equal(fs.existsSync('supabase-table-session-v2.7.3-migration.sql'),true);
  const sql=read('supabase-table-session-v2.7.3-migration.sql');
  assert.match(sql,/append_table_event_v3/);
  assert.match(sql,/GM_EVENT_REQUIRED/);
  assert.match(sql,/EVENT_TYPE_NOT_ALLOWED/);
  assert.match(sql,/set_table_member_role/);
});
