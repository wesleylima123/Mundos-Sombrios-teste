import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');

test('Grid Architect integra motor, adapter e assets sob demanda na Mesa',()=>{
  const loader=read('js/feature-loader.js'),html=read('index.html');
  assert.match(loader,/grid-architect-core\.js/);assert.match(loader,/ms-grid-adapter\.js/);assert.match(loader,/grid-architect-integrated\.css/);
  assert.match(html,/Grid Architect/);assert.match(html,/Interagir com cenário/);assert.match(html,/Câmera/);
  assert.ok(fs.existsSync('data/grid-architect/props.json'));assert.ok(fs.existsSync('assets/grid-architect/props/generic/door.webp'));
});

test('Architect persiste estado rico por Cena e migra grid legado',()=>{
  const core=read('js/grid-architect-core.js'),tools=read('js/master-tools.js'),cmd=read('js/master-command-center.js');
  for(const key of ['walls','doors','interactives','fog','lights','notes','ambience','darkness'])assert.match(core,new RegExp(key));
  assert.match(core,/migrateLegacy/);assert.match(tools,/saveArchitectState/);assert.match(tools,/getArchitectState/);assert.match(tools,/vtt:p\.vtt/);assert.match(cmd,/vtt:sceneContext\?\.vtt/);
});

test('Architect oferece colisão, intenção autoritativa e interação',()=>{
  const core=read('js/grid-architect-core.js'),script=read('js/script.js'),tools=read('js/master-tools.js');
  assert.match(core,/movementSegments/);assert.match(core,/canMoveBetween/);assert.match(script,/architect_move_intent/);assert.match(tools,/architect_move_intent/);assert.match(core,/architect_intent/);assert.match(tools,/handleIntent/);
});

test('Architect inclui visão, isométrico, bibliotecas, ambiência e msgrid',()=>{
  const core=read('js/grid-architect-core.js'),grid=read('js/vtt-grid-engine.js');
  assert.match(core,/visibilityPolygon/);assert.match(core,/rayHit/);assert.match(core,/startAmbient/);assert.match(core,/\.msgrid\.json/);assert.match(core,/data-ga-props/);assert.match(core,/data-ga-tokens/);assert.match(core,/data-ga-env/);assert.match(grid,/iso/);
});
