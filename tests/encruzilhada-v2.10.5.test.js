import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

test('Encruzilhada substitui esferas sem alterar os gateways funcionais',()=>{
  const html=read('index.html');
  const css=read('css/style.css');
  assert.match(html,/class="mode-gateway mode-gateway-exodo"[^>]+selectGameMode\('exodo'\)/);
  assert.match(html,/class="mode-gateway mode-gateway-ocultatun"[^>]+selectGameMode\('ocultatun'\)/);
  assert.match(html,/class="crossroads-nexus"[^>]+showScreen\('screen-ancoragem'\)/);
  assert.match(html,/data-global-sheets="1"/);
  assert.doesNotMatch(html,/spheres-container|sphere-wrapper/);
  assert.doesNotMatch(css,/\.tech-sphere|\.paranormal-sphere|@keyframes rotateTech|@keyframes spinRing/);
  assert.match(css,/encruzilhada-dos-mundos\.webp/);
  assert.ok(fs.existsSync('assets/art-direction/encruzilhada-dos-mundos.webp'));
});

test('Nexo de Fendas usa identidade artística por modo e preserva ações de mesa',()=>{
  const room=read('js/master-room.js');
  const css=read('css/master-room.css');
  assert.match(room,/player-fenda-card player-fenda-\$\{modeClass\}/);
  assert.match(room,/data-player-enter/);
  assert.match(room,/data-player-leave/);
  assert.match(css,/player-fenda-exodo/);
  assert.match(css,/player-fenda-ocultatun/);
  assert.match(css,/mesa-salao\.webp/);
});

test('VTT usa Grid Engine configurável com fallback 16 por 16',()=>{
  const script=read('js/script.js');
  const engine=read('js/vtt-grid-engine.js');
  const html=read('index.html');
  assert.match(engine,/type:'square',columns:16,rows:16/);
  assert.match(engine,/hex-flat/);
  assert.match(engine,/hex-pointy/);
  assert.match(engine,/openPanel/);
  assert.match(engine,/saveSceneGridConfig/);
  assert.match(script,/MS_GRID_ENGINE\?\.snapObject/);
  assert.match(script,/msTokenWidthCells/);
  assert.match(html,/Editor de Matriz/);
  assert.match(html,/MATRIZ TÁTICA · 16 × 16 · ORTOGONAL/);
});
