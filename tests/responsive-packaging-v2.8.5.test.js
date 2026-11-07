import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../js/script.js', import.meta.url), 'utf8');
const masterRoom = readFileSync(new URL('../css/master-room.css', import.meta.url), 'utf8');
const command = readFileSync(new URL('../css/master-command-center.css', import.meta.url), 'utf8');

test('Ancoragem mobile contém abas no próprio viewport', () => {
  assert.match(masterRoom, /V2\.8\.5 — responsividade da Ancoragem/);
  assert.match(masterRoom, /\.master-tabs\{width:100%;max-width:100%/);
  assert.match(masterRoom, /@media\(max-width:700px\)[\s\S]*\.master-tabs\{justify-content:flex-start;overflow-x:auto/);
  assert.match(masterRoom, /\.ancoragem-modern,.anchor-v3,.anchor-v3-operation,.master-command-center\{min-width:0;max-width:100%\}/);
});

test('Centro de Comando mantém Equipe e Encerramento acessíveis sem ampliar a página', () => {
  assert.match(command, /V2\.8\.5 — contenção responsiva do Centro de Comando/);
  assert.match(command, /\.mcc-nav\{width:100%;overscroll-behavior-inline:contain/);
  assert.match(command, /@media\(max-width:640px\)[\s\S]*\.mcc-nav\{overflow-x:auto;overflow-y:hidden/);
  assert.match(command, /\.mcc-head-actions\{width:100%;display:grid;grid-template-columns:1fr/);
});

test('janelas ADM têm classe dedicada e contenção responsiva', () => {
  assert.match(script, /vtt-floating-window admin-request-window/);
  assert.match(script, /--request-offset/);
  assert.match(masterRoom, /\.admin-request-window\{box-sizing:border-box;max-width:calc\(100vw - 24px\)/);
  assert.match(masterRoom, /left:50%!important;[\s\S]*transform:translateX\(-50%\)!important/);
});

test('favicon oficial substitui o ícone de natureza usado como fallback', () => {
  assert.match(html, /href="assets\/favicon\.svg" type="image\/svg\+xml"/);
  assert.match(html, /href="assets\/favicon\.ico"/);
  assert.match(html, /href="assets\/favicon-192\.png"/);
  assert.equal(existsSync(new URL('../assets/favicon.svg', import.meta.url)), true);
  assert.equal(existsSync(new URL('../assets/favicon.ico', import.meta.url)), true);
  assert.equal(existsSync(new URL('../assets/favicon-192.png', import.meta.url)), true);
});
