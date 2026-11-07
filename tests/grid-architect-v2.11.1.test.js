import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');

test('Architect não mantém redraw integral quando a Mesa está ociosa',()=>{
  const core=read('js/grid-architect-core.js');
  assert.match(core,/function resize\(force=false\)/);
  assert.match(core,/if\(!force&&runtime\.width===w&&runtime\.height===h&&runtime\.dpr===dpr\)return false/);
  assert.match(core,/function animationTick\(now\).*drawInteraction\(now\)/s);
  assert.doesNotMatch(core,/function animationTick\(now\).*draw\(now\)/s);
});

test('FX ficam no overlay e pausam quando a aba não está visível',()=>{
  const core=read('js/grid-architect-core.js');
  assert.match(core,/if\(document\.hidden\|\|!effectsActive\(\)\)return/);
  assert.match(core,/now-runtime\.animationLast>=32/);
  assert.match(core,/visibilitychange/);
  assert.match(core,/drawEffects\(ctx,now\)/);
});

test('Mesa usa camada Fabric Lite local com suporte a câmera do Architect',()=>{
  const vendor=read('js/vendor-loader.js');
  const op=read('js/operational-control-v2.10.1.js');
  const script=read('js/script.js');
  assert.match(vendor,/window\.MS_GRID_ARCHITECT/);
  assert.match(vendor,/fabric-lite-local/);
  assert.match(op,/setViewportTransform\(v\)/);
  assert.ok(script.indexOf('MS_GRID_ARCHITECT?.boot?.()') < script.indexOf("MS_VENDOR?.ensure('fabric')"));
});

test('Architect expõe ferramentas artísticas, grid, áudio e efeitos do v0.10',()=>{
  const core=read('js/grid-architect-core.js');
  for(const key of ['terrain','wall','door','fog','light','note','zone','interactive','erase'])assert.ok(core.includes(`['${key}',`),`tool ${key} ausente`);
  for(const type of ['square','hex-flat','hex-pointy','iso','none'])assert.match(core,new RegExp(`data-ga-grid-style=\\"${type}\\"`));
  for(const preset of ['exodo_archive','exodo_biolab','ocultatun_archive','ocultatun_ritual','ocultatun_anomaly','forest_night','storm','fire_ruins','custom'])assert.match(core,new RegExp(preset));
  assert.match(core,/MS_SOUNDSCAPE/);
  assert.match(core,/data-ga-audio-file/);
  assert.match(core,/data-ga-fx=\"rain\"/);
  assert.match(core,/data-ga-fx=\"fog\"/);
  assert.match(core,/data-ga-fx=\"sparks\"/);
  assert.match(core,/data-ga-fx=\"anomaly\"/);
});

test('Biblioteca artística usa thumbnails leves e carregamento preguiçoso',()=>{
  const core=read('js/grid-architect-core.js');
  const env=JSON.parse(read('data/grid-architect/environments.json'));
  assert.match(core,/cache:'force-cache'/);
  assert.match(core,/loading=\"lazy\"/);
  assert.ok(env.length>0);
  assert.ok(env.every(x=>x.thumbnail&&x.thumbnail.includes('thumbs/environments/')));
  for(const item of env.slice(0,3)){const rel=String(item.thumbnail).replace(/^assets\//,'');assert.ok(fs.existsSync(`assets/grid-architect/${rel}`));}
  for(const kind of ['props','tokens']){const list=JSON.parse(read(`data/grid-architect/${kind}.json`));assert.ok(list.every(x=>x.thumbnail));for(const item of list.slice(0,2)){const rel=String(item.thumbnail).replace(/^assets\//,'');assert.ok(fs.existsSync(`assets/grid-architect/${rel}`));}}
  assert.match(core,/data-ga-library-search/);assert.match(core,/data-ga-library-universe/);assert.match(core,/data-ga-library-category/);
});

test('Grid Architect é o renderer canônico da matriz quando integrado',()=>{
  const core=read('js/grid-architect-core.js'),grid=read('js/vtt-grid-engine.js');
  assert.doesNotMatch(core,/function drawGrid\(ctx\).*if\(window\.MS_GRID_ENGINE\?\.version\)return/s);
  assert.match(core,/function drawGrid\(ctx\).*g\.showGrid/s);
  assert.match(grid,/draw\(\);window\.MS_GRID_ARCHITECT\?\.draw\?\.\(\)/);
});


test('pipeline publica catálogos do Architect em produção',()=>{
  assert.match(read('scripts/build-site.mjs'),/'data'/);
});
