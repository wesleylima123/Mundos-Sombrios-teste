import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const root=fileURLToPath(new URL('..',import.meta.url));
const read=f=>readFileSync(join(root,f),'utf8');

test('Portal V2.2 carrega a camada editorial no boot e mantém a experiência imersiva sob demanda',()=>{
  const html=read('index.html'),loader=read('js/feature-loader.js');
  const css='css/portal/portal-editorial-v2.2.css';
  assert.ok(existsSync(join(root,css)),css);
  assert.match(html,/css\/portal\/portal-editorial-v2\.2\.css/);
  assert.doesNotMatch(html,/css\/immersive-experience\.css/);
  assert.match(loader,/css\/immersive-experience\.css/);
});

test('home compacta omite painéis editoriais sem conteúdo e oferece índice direto',()=>{
  const js=read('js/portal/portal-core.js');
  assert.match(js,/function homePanel[\s\S]*if\(!items\.length\)return ''/);
  assert.match(js,/portal-archive-strip/);
  assert.match(js,/portal-home-overview/);
  assert.match(js,/portal-home-editorial/);
  assert.doesNotMatch(js,/sectionBlock\('ANÚNCIOS & ATUALIZAÇÕES'/);
});

test('navegação persistente usa ações corretas para Códices e Mesas',()=>{
  const js=read('js/portal/portal-core.js');
  assert.match(js,/portalShell\(body,c,false\)/);
  assert.match(js,/<button data-act="codex">CÓDICES<\/button>/);
  assert.match(js,/<button data-act="masters">MESAS<\/button>/);
  assert.doesNotMatch(js,/data-section="codex"/);
  assert.doesNotMatch(js,/data-section="masters"/);
});

test('layout editorial limita leitura e possui breakpoints de desktop, tablet e mobile',()=>{
  const css=read('css/portal/portal-editorial-v2.2.css');
  assert.match(css,/--portal-reading:62ch/);
  assert.match(css,/-webkit-line-clamp:3/);
  assert.match(css,/@media\(max-width:1040px\)/);
  assert.match(css,/@media\(max-width:720px\)/);
  assert.match(css,/@media\(max-width:420px\)/);
  assert.match(css,/portal-admin-card/);
});
