import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');

test('Grid Engine V2.10.9 oferece os quatro modos de matriz e controles completos',()=>{
  const e=read('js/vtt-grid-engine.js');
  for(const value of ['square','hex-flat','hex-pointy','none'])assert.match(e,new RegExp(value));
  for(const key of ['columns','rows','cellWidth','cellHeight','boardWidth','boardHeight','offsetX','offsetY','rotation','snap','showGrid','showCoordinates','showToPlayers','unitsPerCell','unitName'])assert.match(e,new RegExp(key));
  assert.match(e,/CALIBRAR DIRETAMENTE NO MAPA/);
  assert.match(e,/data-grid-action=\"fit-cells\"/);
  assert.match(e,/data-grid-action=\"fit-background\"/);
  assert.match(e,/AJUSTAR CÉLULAS AO TABULEIRO/);
  assert.match(e,/USAR TAMANHO DA IMAGEM/);
});

test('configuração é persistida por Cena e sincronizada pelo evento scene já autorizado',()=>{
  const tools=read('js/master-tools.js');
  const cmd=read('js/master-command-center.js');
  assert.match(tools,/saveSceneGridConfig/);
  assert.match(tools,/gridConfig:cloneSafe\(cfg\)/);
  assert.match(tools,/send\?\.\('scene'/);
  assert.match(cmd,/gridConfig:defaultGrid\(\)/);
  assert.match(cmd,/activateSceneContext/);
  assert.match(cmd,/sceneId:s.id/);
});

test('totens usam dimensões relativas a células e a régua consulta o Grid Engine',()=>{
  const script=read('js/script.js');
  const tools=read('js/master-tools.js');
  const engine=read('js/vtt-grid-engine.js');
  assert.match(script,/msTokenWidthCells/);
  assert.match(script,/msTokenHeightCells/);
  assert.match(engine,/applyTokenSize/);
  assert.match(engine,/rescaleManagedTokens/);
  assert.match(script,/MS_GRID_ENGINE\?\.measure/);
  assert.match(tools,/msTokenWidthCells/);
});

test('controles de edição de matriz permanecem exclusivos do Mestre',()=>{
  const html=read('index.html');
  const engine=read('js/vtt-grid-engine.js');
  assert.match(html,/gm-only-btn[\s\S]*Editor de Matriz/);
  assert.match(engine,/A matriz da Cena só pode ser alterada pelo Mestre/);
  assert.match(engine,/if\(!gm\(\)\)/);
});

import vm from 'node:vm';
test('Grid Engine executa isoladamente e normaliza matrizes legadas para o fallback seguro',()=>{
  const ctx={console,Math,JSON,Number,String,Object,Set,Promise};ctx.window=ctx;
  vm.createContext(ctx);vm.runInContext(read('js/vtt-grid-engine.js'),ctx,{filename:'vtt-grid-engine.js'});
  const cfg=ctx.MS_GRID_ENGINE.normalize({columns:0,rows:999,type:'invalido',cellWidth:1,unitsPerCell:0});
  assert.equal(cfg.type,'square');assert.equal(cfg.columns,1);assert.equal(cfg.rows,200);assert.equal(cfg.cellWidth,4);assert.equal(cfg.unitsPerCell,.01);
  const legacy=ctx.MS_GRID_ENGINE.normalize({});assert.equal(legacy.columns,16);assert.equal(legacy.rows,16);
});


test('editor usa preview não destrutivo, requestAnimationFrame e descarte explícito',()=>{
  const e=read('js/vtt-grid-engine.js');
  const script=read('js/script.js');
  assert.match(e,/previewConfig/);
  assert.match(e,/remotePreview/);
  assert.match(e,/requestAnimationFrame/);
  assert.match(e,/DESCARTAR/);
  assert.match(e,/restoreObjectSnapshots/);
  assert.match(e,/data-grid-readout="rotation"/);
  assert.match(script,/MS_GRID_ENGINE\?\.isPreviewing/);
});

test('preview compartilhado é efêmero e não usa o ledger persistente de eventos',()=>{
  const engine=read('js/vtt-grid-engine.js');
  const session=read('js/table-session-engine.js');
  const tools=read('js/master-tools.js');
  assert.match(engine,/Compartilhar este preview ao vivo/);
  assert.match(engine,/broadcastTransient\?\.\('grid_preview'/);
  assert.match(session,/broadcastTransient/);
  assert.match(session,/broadcastTableEvent/);
  assert.match(tools,/event\.event_type==='grid_preview'/);
  assert.match(tools,/applySharedPreview/);
});

test('tamanho de totem também fica em rascunho até Aplicar à Cena',()=>{
  const e=read('js/vtt-grid-engine.js');
  assert.match(e,/snapshotObjects/);
  assert.match(e,/previewSelectedTokenSize/);
  assert.match(e,/commitObjectDrafts/);
  assert.match(e,/ATUALIZAR PREVIEW DO TOTEM/);
  assert.doesNotMatch(e,/Tamanho do totem ajustado em células/);
});


test('QA V2.10.9 impede colapso do canvas e mantém dock do Grid utilizável',()=>{
  const css=read('css/vtt-grid-engine.css');
  const html=read('index.html');
  assert.match(css,/#vtt-grid-window\.ms-grid-window[^\{]*\{position:absolute;inset:0\}/);
  assert.doesNotMatch(css,/^\.ms-grid-window\{position:relative\}/m);
  assert.match(css,/\.ms-grid-window \.ms-grid-stage\{min-height:280px/);
  assert.match(css,/\.ms-grid-window \.ms-grid-tools\{display:flex;flex-wrap:nowrap/);
  assert.match(html,/ms-grid-tool-group[\s\S]*Movimento/);
  assert.match(html,/ms-grid-gm-tools[\s\S]*Editor de Matriz/);
  assert.match(html,/data-tool-group="measure"/);
});

test('editor da Matriz fica acima das fichas flutuantes e tem rodapé móvel acessível',()=>{
  const grid=read('css/vtt-grid-engine.css');
  const sheets=read('css/table-sheets.css');
  const panelZ=Number(grid.match(/\.ms-grid-config-panel\{[^}]*z-index:(\d+)/)?.[1]||0);
  const sheetsZ=Number(sheets.match(/#ms-sheet-floats\{[^}]*z-index:(\d+)/)?.[1]||0);
  assert.ok(panelZ>sheetsZ,`painel ${panelZ} precisa ficar acima das fichas ${sheetsZ}`);
  assert.match(grid,/@media\(max-width:760px\)[\s\S]*grid-template-columns:1fr 1fr/);
});



test('V2.10.9 substitui o modal por uma paleta flutuante, arrastável e recolhível',()=>{
  const engine=read('js/vtt-grid-engine.js');
  const css=read('css/vtt-grid-engine.css');
  assert.match(engine,/PALETTE_POSITION_KEY/);
  assert.match(engine,/installPaletteDrag/);
  assert.match(engine,/data-grid-drag-handle/);
  assert.match(engine,/data-grid-minimize/);
  assert.match(engine,/setPaletteTab/);
  assert.match(engine,/Estrutura/);
  assert.match(engine,/Alinhamento/);
  assert.match(engine,/Visual/);
  assert.match(engine,/Escala/);
  assert.match(engine,/Totem/);
  assert.match(css,/\.ms-grid-config-panel\{position:absolute;/);
  assert.match(css,/\.ms-grid-config-panel\.is-minimized/);
  assert.doesNotMatch(css,/\.ms-grid-config-panel\{position:fixed;inset:0/);
});

test('Descartar e Aplicar mantêm a paleta aberta durante a edição iterativa',()=>{
  const engine=read('js/vtt-grid-engine.js');
  assert.match(engine,/async function discardDraft/);
  assert.match(engine,/Rascunho descartado/);
  assert.match(engine,/state\.previewConfig=clone\(state\.config\)/);
  assert.match(engine,/Matriz aplicada à Cena e sincronizada com a Mesa/);
});

test('runtime da Mesa carrega a ponte de persistência da Matriz mesmo em entrada fria',()=>{
  const loader=read('js/feature-loader.js');
  const tableGroup=loader.match(/const runtimeScripts=\{[\s\S]*?table:\[([^\]]+)\]/)?.[1]||'';
  assert.match(tableGroup,/js\/vtt-grid-engine\.js/);
  assert.match(tableGroup,/js\/master-tools\.js/);
});
