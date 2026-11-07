import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
const root=fileURLToPath(new URL('..',import.meta.url));
const read=f=>readFileSync(join(root,f),'utf8');

test('V2.8.6 trava salvamento repetido no cliente e reutiliza identidade do rascunho',()=>{
  const js=read('js/script.js');
  assert.match(js,/let currentDraftIdentity = null/);
  assert.match(js,/let msDraftSavePromise = null/);
  assert.match(js,/if\(msDraftSavePromise\) return msDraftSavePromise/);
  assert.match(js,/id:currentDraftIdentity\.id/);
  assert.match(js,/code:currentDraftIdentity\.code/);
  assert.match(js,/saveButton\.disabled=true/);
});

test('create_table_secure é idempotente por p_id inclusive contra retries concorrentes',()=>{
  for(const f of ['supabase-production.sql','supabase-bugfix-v2.8.6-migration.sql']){
    const sql=read(f);
    assert.match(sql,/v_id := coalesce\(nullif\(trim\(p_id\),''\), gen_random_uuid\(\)::text\)/);
    assert.match(sql,/on conflict \(id\) do nothing/);
    assert.match(sql,/select \* into v_table from public\.tables where id=v_id/);
    assert.match(sql,/TABLE_ID_CONFLICT/);
    assert.match(sql,/if v_created then[\s\S]*participants=/);
  }
});

test('Portal possui estilo-base próprio e não depende da Forja para renderizar gateways',()=>{
  const css=read('css/portal/portal-editorial-v2.2.css');
  assert.match(css,/\.portal-gateway\{[^}]*display:grid!important/);
  assert.match(css,/\.portal-gateway button\{[^}]*background:linear-gradient/);
  assert.match(css,/\.portal-gateway button\{[^}]*color:/);
});

test('Mesa redesenhada oferece ferramentas essenciais de grid e iniciativa',()=>{
  const shell=read('js/table-room.js'),script=read('js/script.js'),css=read('css/table-room.css');
  for(const token of ['canvasSetMode','canvasAddPCToken','canvasAddNPCToken','canvasToggleGridVisibility','canvasToggleSnapToGrid','canvasToggleRuler','canvasAddShape','canvasClearMeasurements']) assert.match(read('index.html'),new RegExp(token));
  for(const fn of ['canvasToggleGridVisibility','canvasToggleSnapToGrid','canvasClearMeasurements']) assert.match(script,new RegExp(`function ${fn}`));
  assert.match(css,/\.ms-grid-tools/);
  assert.match(css,/\.ms-room-initiative/);
});

test('Criação de Fenda V2.8.6 preserva os IDs de contrato e introduz workspace próprio',()=>{
  const html=read('index.html'),css=read('css/table-studio-v2.8.6.css');
  for(const id of ['new-table-name','new-table-description','new-table-mode','new-table-theme','new-table-max-players','new-table-initial','new-table-rules','btn-confirm-create-table']) assert.match(html,new RegExp(`id=\"${id}\"`));
  assert.match(html,/FORJA DE FENDAS/i);
  assert.match(css,/\.create-table-workspace-v286/);
  assert.match(css,/\.create-table-preview-v286/);
});

test('boot V2.9.0 posterga dados 3D e histórico e fica abaixo de 785 KB locais',()=>{
  const html=read('index.html'),loader=read('js/feature-loader.js');
  assert.doesNotMatch(html,/<script src=\"js\/dice-3d\.js\"/);
  assert.doesNotMatch(html,/<script src=\"js\/master-history-data\.js\"/);
  assert.match(loader,/ensureDice/);assert.match(loader,/ensureMasterHistory/);
  const paths=[...html.matchAll(/<script[^>]+src=\"([^\"]+)\"/g)].map(x=>x[1]).filter(x=>!/^https?:/.test(x));
  const total=paths.reduce((n,p)=>n+statSync(join(root,p)).size,0);
  assert.ok(total<785_000,`boot JS=${total}`);
});
