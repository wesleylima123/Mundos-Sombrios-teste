import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';
const root=fileURLToPath(new URL('..',import.meta.url));
const read=f=>readFileSync(join(root,f),'utf8');

test('modal de criação permanece integralmente enquadrado com rolagem interna',()=>{
  const html=read('index.html'),css=read('css/master-room.css');
  assert.match(html,/create-table-dialog/);assert.match(html,/create-table-scroll/);assert.match(html,/create-table-actions/);
  assert.match(css,/#create-table-modal \.create-table-dialog\{[^}]*max-height:92vh/);
  assert.match(css,/\.create-table-scroll\{[^}]*overflow:auto/);
  assert.match(css,/grid-template-rows:auto minmax\(0,1fr\) auto/);
});

test('Campanha em Movimento é integrada ao card da mesa selecionada',()=>{
  const room=read('js/master-room.js'),tools=read('js/master-tools.js');
  for(const token of ['anchor-v3-operation','data-command-host','data-tools-host','data-workspace-tab="command"','DIREÇÃO DA CAMPANHA'])assert.match(room,new RegExp(token));
  assert.match(tools,/renderMasterTools\(root, table=null, options=\{\}\)/);
  assert.match(tools,/const commandRoot=options\?\.commandRoot\|\|root/);
  assert.match(tools,/MasterCommandCenter\?\.render[^\n]*commandRoot/);
});

test('dados possuem modelos 3D distintos com a quantidade correta de faces',()=>{
  const source=read('js/dice-3d.js');
  const context={window:{matchMedia:()=>({matches:true}),devicePixelRatio:1},document:{addEventListener(){},getElementById(){return null},querySelectorAll(){return[]},body:{appendChild(){}},documentElement:{}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout,Math,Date,console};
  context.window.window=context.window;context.window.document=context.document;context.window.performance=context.performance;context.window.requestAnimationFrame=context.requestAnimationFrame;
  vm.createContext(context);vm.runInContext(source,context);
  const meshes=context.window.MS_DICE_3D.meshes;
  const expected={d4:4,d6:6,d8:8,d10:10,d12:12,d20:20};
  for(const [type,count] of Object.entries(expected)){assert.ok(meshes[type],type);assert.equal(meshes[type].faces.length,count,type);assert.ok(meshes[type].vertices.length>=4,type)}
});

test('rolagens remotas também disparam animação 3D',()=>{
  const tools=read('js/master-tools.js');
  assert.match(tools,/MS_DICE_3D\?\.broadcast\?\.\(p\.type,p\.result,p\.sender/);
});

test('dependências pesadas do VTT e PDF são carregadas apenas sob demanda',()=>{
  const html=read('index.html'),vendor=read('js/vendor-loader.js'),script=read('js/script.js');
  assert.doesNotMatch(html,/html2pdf\.bundle\.min\.js/);assert.doesNotMatch(html,/fabric\.min\.js/);
  assert.match(vendor,/fabric\.js\/5\.3\.1\/fabric\.min\.js/);assert.match(vendor,/html2pdf\.js\/0\.10\.1\/html2pdf\.bundle\.min\.js/);
  assert.match(script,/MS_VENDOR\?\.ensure\('fabric'\)/);assert.match(script,/MS_VENDOR\?\.ensure\('html2pdf'\)/);
});

test('Forja pesada não participa mais do boot do Portal',()=>{
  const html=read('index.html'),loader=read('js/feature-loader.js');
  const deferred=['mundos-updates.js','power-registry.js','linhagem-tree.js','exodo-nexo.js','aprimorador-engenharia.js','projeto-player-interface.js','esoterico-surgery.js','gallery-editor.js','ordem-sete.js','immersive-experience.js'];
  for(const file of deferred){assert.doesNotMatch(html,new RegExp(`<script src="js/${file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"`));assert.match(loader,new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))}
  assert.match(read('js/script.js'),/MS_FEATURES\.ensureBuilder/);
});

test('boot estático cai para menos de 800 KB de JavaScript local',()=>{
  const html=read('index.html');const paths=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(x=>x[1]).filter(x=>!/^https?:/.test(x));
  const total=paths.reduce((n,p)=>n+statSync(join(root,p)).size,0);assert.ok(total<800_000,`boot JS=${total}`);
});

test('loops permanentes de partículas e lifecycle foram removidos',()=>{
  const script=read('js/script.js'),online=read('js/ms-online-ui.js');
  assert.doesNotMatch(script,/setInterval\(\(\) => \{[\s\S]{0,300}classList\.add\('ember'\)/);
  assert.doesNotMatch(online,/setInterval\(lifecycle/);
  assert.match(online,/MutationObserver\(lifecycle\)/);
});
