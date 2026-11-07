import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {readFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';
const root=fileURLToPath(new URL('..',import.meta.url));
const read=f=>readFileSync(join(root,f),'utf8');

test('Centro de Comando permanece no boot e Registros Históricos carregam sob demanda',()=>{
  const html=read('index.html'),loader=read('js/feature-loader.js'),room=read('js/master-room.js');
  assert.doesNotMatch(html,/css\/master-command-center\.css/);
  assert.match(loader,/css\/master-command-center\.css/);
  assert.match(loader,/ensureMasterStyles/);
  assert.doesNotMatch(html,/<script src="js\/master-history-data\.js"/);
  assert.match(loader,/ensureMasterHistory/);
  assert.match(loader,/js\/master-history-data\.js/);
  assert.match(room,/MS_FEATURES\?\.ensureMasterHistory/);
  assert.doesNotMatch(html,/js\/master-command-center\.js/);
  assert.ok(loader.indexOf('js/master-command-center.js')>0&&loader.indexOf('js/master-room.js')>loader.indexOf('js/master-command-center.js'));
  assert.ok(existsSync(join(root,'codex-files/registros-historicos-mundos-sombrios.pdf')));
});

test('Fundação de campanha registra tom, foco, sigilo, ameaça, marco histórico e perfis por modo',()=>{
  const html=read('index.html'),script=read('js/script.js');
  for(const id of ['new-table-tone','new-table-focus','new-table-secrecy','new-table-threat','new-table-history','new-table-tsin','new-table-tech','new-table-exposure','new-table-institution']) assert.match(html,new RegExp(id));
  for(const key of ['tone','focus','secrecy','threat','historyBaseline','tsinPosture','technologyScale','paranormalExposure','institution']) assert.match(script,new RegExp(key));
  assert.match(script,/updateCreateTableModeGuide/);
});

test('Centro do Mestre cobre sessão, cenas, facções, relações, busca, visão do jogador e encerramento',()=>{
  const js=read('js/master-command-center.js');
  for(const token of ['Campanha em Movimento','STORYBOARD DE MESTRAGEM','MUNDO EM MOVIMENTO','MAPA DE RELAÇÕES','BUSCA UNIVERSAL','VISÃO DO JOGADOR','ENCERRAMENTO DE SESSÃO','CRONOLOGIA AUTOMÁTICA','Registros Históricos']) assert.match(js,new RegExp(token));
  assert.match(js,/draggable="true"/);
  assert.match(js,/Ctrl|ctrlKey/);
});

test('Combat Director controla duração de efeitos, reação e PV',()=>{
  const js=read('js/master-tools.js');
  assert.match(js,/COMBAT DIRECTOR/);
  assert.match(js,/reactionReady/);
  assert.match(js,/remaining/);
  assert.match(js,/data-hp/);
  assert.match(js,/data-effect-form/);
});

test('Pistas têm estados preparada, descoberta e compreendida e revelação dramática',()=>{
  const js=read('js/master-tools.js'),css=read('css/master-command-center.css');
  assert.match(js,/state:'prepared'/);
  assert.match(js,/discovered/);
  assert.match(js,/understood/);
  assert.match(js,/showDramaticReveal/);
  assert.match(css,/\.ms-vtt-reveal/);
});

test('Rolagem de dados V2.4 usa modelos 3D por canvas, animação por frame e entropia segura',()=>{
  const js=read('js/script.js'),dice=read('js/dice-3d.js'),css=read('css/style.css');
  assert.match(js,/secureDieResult/);
  assert.match(js,/crypto\?\.getRandomValues|crypto\.getRandomValues/);
  assert.match(js,/MS_DICE_3D\.play/);
  assert.match(js,/diceRollInProgress/);
  assert.match(dice,/requestAnimationFrame/);
  for(const type of ['d4','d6','d8','d10','d12','d20']) assert.match(dice,new RegExp(`${type}:`));
  assert.match(css,/dice-stage/);
  assert.match(css,/dice-3d-canvas/);
  assert.doesNotMatch(js,/transition 2s cubic-bezier/);
});

test('Papéis Co-Mestre e Observador possuem contrato de banco e serviço explícitos',()=>{
  const migration=read('supabase-master-v2.3-migration.sql');
  const db=read('js/supabase-db.js'),services=read('js/ms-services.js');
  assert.match(migration,/co_mestre/);assert.match(migration,/observador/);assert.match(migration,/can_manage_table/);assert.match(migration,/set_table_member_role/);
  assert.match(db,/setTableMemberRole/);assert.match(services,/setMemberRole/);
});

test('Portal oferece janela operacional exclusiva para Mestre e ADM',()=>{
  const js=read('js/portal/portal-core.js'),css=read('css/portal/portal-editorial-v2.2.css');
  assert.match(js,/CENTRO DE OPERAÇÕES/);
  assert.match(js,/REGISTROS HISTÓRICOS/);
  assert.match(js,/master-history/);
  assert.match(css,/portal-masters-command/);
});
