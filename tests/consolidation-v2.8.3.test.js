import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('V2.8.3 remove helpers e blocos sem consumidor comprovado',()=>{
  assert.doesNotMatch(read('js/portal/portal-core.js'),/function\s+sectionBlock\s*\(/);
  assert.doesNotMatch(read('js/script.js'),/function\s+buildCSSDiceFaces\s*\(/);
  assert.doesNotMatch(read('js/master-shield.js'),/\b(?:tipShow|tipHide|ALN)\b/);
  assert.doesNotMatch(read('js/mundos-updates.js'),/installV045CoreFix/);
});

test('V2.8.3 remove listeners vazios e mantém o listener canônico de saúde da sessão',()=>{
  const shell=read('js/table-room.js');
  assert.doesNotMatch(shell,/addEventListener\(['"]table:session-health['"],\s*\(\)\s*=>\s*\{\s*\}\s*\)/);
  assert.match(shell,/bus\?\.on\?\.\('table:session-health'/);
});

test('V2.8.3 unifica o contrato philosophy do Caminho alquímico customizado',()=>{
  const script=read('js/alquerino-lab.js');
  assert.match(script,/const philosophy=\(document\.getElementById\('alchemy-new-path-philosophy'\)/);
  assert.match(script,/item=\{path,philosophy,nodes:\[\],source:'custom'\}/);
  assert.doesNotMatch(script,/const philosopher=\(document\.getElementById\('alchemy-new-path-philosophy'\)/);
});



test('criação de ficha e galeria possuem um proprietário canônico',()=>{
  const script=read('js/script.js');
  assert.equal((script.match(/function\s+beginNewCharacter\s*\(/g)||[]).length,1);
  assert.doesNotMatch(script,/beginNewCharacterFinal/);
  assert.doesNotMatch(script,/function\s+renderGallery\s*\(/);
  assert.match(script,/window\.renderGallery\?\.\(\)/);
  const gallery=read('js/gallery-editor.js');
  assert.match(gallery,/window\.renderGallery=function renderGalleryCanonical/);
});

test('CSS legado removido não mantém famílias sem emissor',()=>{
  const room=read('css/master-room.css');
  for(const token of ['mr-table-card','mr-table-operational','mr-table-workspace-tabs','mr-command-host','player-table-card','player-table-actions']){
    assert.doesNotMatch(room,new RegExp(`\\.${token}(?:\\b|[: .#\\[])`),token);
  }
  assert.match(room,/\.anchor-v3-card/);
  assert.match(room,/\.anchor-v3-operation/);
  for(const file of ['css/portal/portal.css','css/portal/portal-visual-v0.62.css']){
    const portal=read(file);
    for(const token of ['portal-section','portal-section-head','portal-news-grid','portal-event-grid','portal-class-grid','portal-expansion-grid','portal-story-grid','portal-expansions']){
      assert.doesNotMatch(portal,new RegExp(`\\.${token}(?:\\b|[: .#\\[])`),`${file}: ${token}`);
    }
    assert.match(read('css/portal/portal-editorial-v2.2.css'),/\.portal-world-grid/);
    assert.doesNotMatch(portal,/\.portal-world-grid/);
    assert.match(portal,/\.portal-list-grid/);
  }
});

test('alvos literais de showScreen existem no documento principal',()=>{
  const html=read('index.html'), script=read('js/script.js');
  const ids=new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]));
  const targets=[...script.matchAll(/showScreen\(\s*['"]([^'"]+)['"]/g)].map(m=>m[1]);
  for(const id of new Set(targets)) assert.ok(ids.has(id),`tela ausente: ${id}`);
});

test('referências locais estáticas do HTML e do feature loader existem',()=>{
  const html=read('index.html');
  const refs=[...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g)].map(m=>m[1]).filter(x=>!x.startsWith('http')&&!x.startsWith('//')&&!x.startsWith('#'));
  for(const ref of refs) assert.ok(fs.existsSync(path.join(root,ref)),`referência ausente: ${ref}`);
  const loader=read('js/feature-loader.js');
  for(const m of loader.matchAll(/['"]((?:js|css)\/[A-Za-z0-9_./-]+\.(?:js|css))['"]/g)) assert.ok(fs.existsSync(path.join(root,m[1])),`lazy asset ausente: ${m[1]}`);
});

test('IDs estáticos do documento principal são únicos',()=>{
  const html=read('index.html');
  const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
  const dup=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
  assert.deepEqual(dup,[]);
});

test('metadados de release permanecem consolidados na versão atual',()=>{
  const version=read('VERSION.txt').trim();
  assert.equal(JSON.parse(read('package.json')).version,version);
});
