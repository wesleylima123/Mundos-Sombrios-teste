import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');

test('linhas do Grid são desenhadas pelo Architect sem anulação mútua',()=>{
  const core=read('js/grid-architect-core.js'),grid=read('js/vtt-grid-engine.js');
  assert.doesNotMatch(core,/if\(window\.MS_GRID_ENGINE\?\.version\)return/);
  assert.match(core,/showToPlayers/);
  assert.match(core,/strokeStyle=g\.color/);
  assert.match(grid,/MS_GRID_ARCHITECT\?\.draw/);
});

test('objetos e totens artísticos entram em modo de posicionamento no mapa',()=>{
  const core=read('js/grid-architect-core.js'),script=read('js/script.js');
  assert.match(core,/function queueProp\(item\)/);
  assert.match(core,/function queueToken\(item\)/);
  assert.match(core,/runtime\.placementStatus/);
  assert.match(core,/runtime\.tool==='token'/);
  assert.match(core,/placeCatalogTokenAt/);
  assert.match(core,/data-ga-placement-status/);
  assert.match(script,/widthCells=1,heightCells=widthCells,left=100,top=100/);
  assert.match(script,/return group/);
});

test('paisagens sonoras locais substituem o gerador procedural pesado',()=>{
  const loader=read('js/feature-loader.js'),core=read('js/grid-architect-core.js'),audio=read('js/ms-soundscape-engine.js');
  assert.match(loader,/ms-soundscape-engine\.js/);
  assert.match(audio,/soundscapes\.json/);
  assert.match(audio,/decodeAudioData/);
  assert.match(audio,/exponentialRampToValueAtTime/);
  assert.match(audio,/preserveDialogue/);
  assert.doesNotMatch(core,/function whiteNoiseBuffer/);
  assert.doesNotMatch(core,/function buildAmbientPreset/);
});

test('biblioteca sonora contém loops locais para Êxodo, Ocultatun e ambientes genéricos',()=>{
  const list=JSON.parse(read('data/grid-architect/soundscapes.json'));
  assert.ok(list.length>=12);
  assert.ok(list.some(x=>x.universe==='exodo'));
  assert.ok(list.some(x=>x.universe==='ocultatun'));
  assert.ok(list.some(x=>x.universe==='generic'));
  for(const item of list){assert.ok(item.file.endsWith('.ogg'));assert.ok(fs.existsSync(item.file),`áudio ausente: ${item.file}`);assert.ok(fs.statSync(item.file).size>20000);}
});

test('mix de ambiência preserva clareza de diálogo e duas camadas',()=>{
  const core=read('js/grid-architect-core.js'),audio=read('js/ms-soundscape-engine.js');
  assert.match(core,/data-ga-dialogue/);
  assert.match(core,/Camada A/);assert.match(core,/Camada B/);
  assert.match(audio,/eq\.frequency\.value=2200/);
  assert.match(audio,/eq\.gain\.value=-3\.5/);
  assert.match(audio,/createDynamicsCompressor/);
  assert.match(audio,/decks:\[null,null\]/);
});
