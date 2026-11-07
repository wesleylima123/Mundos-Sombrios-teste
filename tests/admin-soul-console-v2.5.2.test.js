import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p, import.meta.url),'utf8');

test('Painel ADM expõe SoulDrakma como aba dedicada e não abaixo da tabela',()=>{
  const html=read('index.html');
  const js=read('js/script.js');
  const soul=read('js/soul-economy.js');
  for(const token of ['data-admin-tab="users"','data-admin-tab="soul"','id="admin-soul-panel"','SOULDRΔKMA']) assert.match(html,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(js,/function switchAdminPanelTab/);
  assert.match(js,/switchAdminPanelTab\('users'\)/);
  assert.match(soul,/#admin-soul-panel/);
  assert.match(soul,/Controle SoulDrakma/);
});

test('Modal administrativo permanece dentro do viewport e cada painel tem rolagem própria',()=>{
  const css=read('css/style.css');
  assert.match(css,/#admin-panel-modal \.admin-arconte-shell\{[^}]*max-height:92vh/s);
  assert.match(css,/\.admin-arconte-panel\{[^}]*overflow:auto/s);
  assert.match(css,/\.admin-users-scroll\{[^}]*overflow:auto/s);
});
