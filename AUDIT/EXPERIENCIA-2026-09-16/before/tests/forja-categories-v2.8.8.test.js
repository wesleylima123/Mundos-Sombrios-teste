import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=read('js/forja-overhaul-v2.8.10.js');
const css=read('css/forja-overhaul-v2.8.10.css');
const loader=read('js/feature-loader.js');
const html=read('index.html');
const hasSandbox=fs.existsSync(new URL('../sandbox-offline/index.html',import.meta.url));

test('categorias usam ícones compactos, não cards',()=>{
  assert.match(js,/ms-category-icon-button/);
  assert.match(css,/\.ms-category-icons/);
  assert.doesNotMatch(js,/ms-category-card/);
});

test('pacotes canônicos de categoria de Êxodo estão automatizados',()=>{
  for(const token of ["attrs:{for:3,agi:2,prn:1}","['Atletismo',2]","['Pontaria',2]","['Luta',2]","attrs:{vig:3,agi:3}","['Tratamento',3]","['Intuição',3]","attrs:{int:4,prn:1}","['Especialidade',4]","['Tecnologia',4]","pe:15"]) assert.ok(js.includes(token),token);
  assert.match(js,/categoryPreset/);
  assert.match(js,/equipmentBonusPE/);
});

test('camada da Forja V2.8.10 carrega sob demanda e não infla o boot principal',()=>{
  assert.match(loader,/css\/forja-overhaul-v2\.8\.10\.css/);
  assert.match(loader,/js\/forja-overhaul-v2\.8\.10\.js/);
  assert.doesNotMatch(html,/forja-overhaul-v2\.8\.10/);
});

test('campanha em movimento continua integrada à Mesa do Mestre',()=>{
  const shell=read('js/table-shell-v3.js');
  assert.match(shell,/vtt-campaign-window/);
  assert.match(shell,/MasterCommandCenter/);
  assert.match(shell,/CAMPANHA/);
  assert.doesNotMatch(js,/function ensureCampaignInTable|function renderCampaignWindow/);
});

test('responsivo redefine Mesa e Forja em tablet/mobile',()=>{
  assert.match(css,/@media\(max-width:960px\)/);
  assert.match(css,/@media\(max-width:640px\)/);
  assert.match(css,/\.ms-table-v3-body\{display:flex;flex-direction:column/);
});


test('Forja V2.8.10 não usa MutationObserver autorreferente',()=>{
  assert.doesNotMatch(js,/MutationObserver/);
});

test('sandbox integrado possui runtime integral e namespace próprio',{skip:!hasSandbox},()=>{
  const sandboxHtml=read('sandbox-offline/index.html');
  const runtime=read('sandbox-offline/js/ms-runtime-config.js');
  const qa=read('sandbox-offline/js/offline-sandbox-ui.js');
  assert.match(sandboxHtml,/js\/script\.js/);
  assert.match(sandboxHtml,/js\/offline-sandbox-ui-loader\.js/);
  assert.match(runtime,/sandboxMode:\s*true/);
  assert.match(runtime,/ms-sandbox-v(?:2811|290|2100|2101)/);
  assert.match(qa,/SANDBOX INTEGRAL/);
});


test('supabase-production consolidado inclui presença, status ao vivo e sumários atuais',()=>{
  const sql=read('supabase-production.sql');
  for(const fn of ['touch_table_presence','set_table_live_status','fetch_my_table_summaries','delete_table_secure']) assert.match(sql,new RegExp(`function public\\.${fn}`));
  assert.match(sql,/CHARACTER_CATEGORY_REQUIRED/);
});
