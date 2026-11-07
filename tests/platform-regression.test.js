import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const root=fileURLToPath(new URL('..',import.meta.url));
const read=f=>readFileSync(join(root,f),'utf8');
test('arquivos de plataforma referenciados existem',()=>{for(const f of ['css/ms-platform.css','js/ms-online-ui.js','tests/syntax-check.mjs'])assert.ok(existsSync(join(root,f)),f)});
test('carrossel usa um card focal e imagens temáticas',()=>{const s=read('js/script.js'),a=read('js/archetype-art-direction.js');assert.match(s,/ms-archetype-carousel/);assert.match(s,/carousel-prev|archetype-carousel-prev/);assert.match(a,/assets\/archetypes\/classes/);assert.equal(readdirSync(join(root,'assets/archetypes/classes')).filter(x=>x.endsWith('.svg')).length,23);assert.equal(readdirSync(join(root,'assets/archetypes/natures')).filter(x=>x.endsWith('.svg')).length,8)});
test('validação aceita negativos previstos e limita atributos a 10',()=>{const s=read('js/ms-platform.js');assert.match(s,/-2/);assert.match(s,/10/);assert.doesNotMatch(s,/value\s*<\s*0[^\n]*Atributo/)});
test('régua é funcional e escala é configurável',()=>{const js=read('js/script.js'),html=read('index.html');assert.match(js,/msInstallRulerHandlers/);assert.match(js,/Math\.hypot/);assert.doesNotMatch(js,/Régua: Clique e arraste para medir \(Simulado\)/);assert.match(html,/vtt-grid-scale/)});
test('tokens preservam identidade e propriedade na serialização',()=>{const s=read('js/master-tools.js');for(const prop of ['msTokenId','ownerId','characterId'])assert.match(s,new RegExp(prop));assert.match(s,/!o\.isGridLine&&!o\.isRuler/)});
test('Escudo implementa as nove visões',()=>{const s=read('js/master-shield.js');for(const id of ['linha','mapa','economia','exodo','ocultatun','ordem','envolto','arvores','arquivos'])assert.match(s,new RegExp(`ms-v-${id}`))});
test('Forja inclui conceito, evolução, poderes estruturados e rascunho',()=>{const html=read('index.html'),js=read('js/script.js'),ui=read('js/ms-online-ui.js');for(const id of ['char-origin','char-motivation','tab-evolution','pb-effect','pb-range','pb-duration','pb-targets','pb-cost','pb-test','pb-consequence'])assert.match(html,new RegExp(id));assert.match(js,/structuredPowers/);assert.match(js,/currentEvolutionLog/);assert.match(ui,/BuilderDraftV2/);assert.match(ui,/openCharacterHistory/)});
test('SQL autoriza Broadcast e Presence apenas para membros da mesa',()=>{for(const f of ['supabase-online-migration.sql','supabase-production.sql']){const s=read(f);assert.match(s,/ms_realtime_table_select/);assert.match(s,/ms_realtime_table_insert/);assert.match(s,/can_access_ms_realtime_topic/);assert.match(s,/realtime\.messages\.extension in \('broadcast','presence'\)/)}});
test('Sala dos Mestres possui preparação por campanha/sessão e ferramentas operacionais',()=>{const s=read('js/master-tools.js');for(const fn of ['renderEncounters','renderCombat','renderClues','renderWorld','renderSessions'])assert.match(s,new RegExp(`function ${fn}`));assert.match(read('js/master-room.js'),/data-prepare/)});
test('31 cards de seleção possuem arte temática própria',()=>{
  const a=read('js/archetype-art-direction.js');
  const paths=[
    'assets/archetypes/natures/exo-nexo.webp',
    'assets/archetypes/natures/exo-classer.webp',
    'assets/archetypes/natures/exo-player.webp',
    'assets/archetypes/natures/exo-aprimorador.webp',
    'assets/archetypes/natures/ocu-carreira.webp',
    'assets/archetypes/natures/ocu-designado.webp',
    'assets/archetypes/natures/ocu-ordem.webp',
    'assets/archetypes/natures/ocu-envolto.webp',
    'assets/archetypes/classes/combatente.webp',
    'assets/archetypes/classes/sobrevivente.webp',
    'assets/archetypes/classes/especialista.webp',
    'assets/archetypes/classes/engenheiro-biologico.webp',
    'assets/archetypes/classes/ia-virtudes.webp',
    'assets/archetypes/classes/ia-dominios.webp',
    'assets/archetypes/classes/ia-principados.webp',
    'assets/archetypes/classes/velocitus-bellator.webp',
    'assets/archetypes/classes/aeternus-vitalis.webp',
    'assets/archetypes/classes/mentis-aurorae.webp',
    'assets/archetypes/classes/mercador-da-morte.webp',
    'assets/archetypes/classes/carrasco-cinzento.webp',
    'assets/archetypes/classes/alquerino.webp',
    'assets/archetypes/classes/hermetico.webp',
    'assets/archetypes/classes/taumaturgico.webp',
    'assets/archetypes/classes/esoterico.webp',
    'assets/archetypes/classes/o-arauto.webp',
    'assets/archetypes/classes/o-tocado.webp',
    'assets/archetypes/classes/o-condenado.webp',
    'assets/archetypes/classes/inquisidor.webp',
    'assets/archetypes/classes/interprete.webp',
    'assets/archetypes/classes/sentinela.webp',
    'assets/archetypes/classes/juizo.webp'
  ];
  assert.equal(paths.length,31);
  for(const path of paths){
    assert.ok(existsSync(join(root,path)),path);
    assert.match(a,new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  }
  assert.equal(readdirSync(join(root,'assets/archetypes/classes')).filter(x=>x.endsWith('.webp')).length,23);
  assert.equal(readdirSync(join(root,'assets/archetypes/natures')).filter(x=>x.endsWith('.webp')).length,8);
  assert.match(a,/entry\.image\|\|/);
});

test('hidratação remota promove fichas ao cache antes da visão legada',()=>{
  const s=read('js/script.js');
  const hydrate=s.slice(s.indexOf('async function msHydrateRemoteGameState'),s.indexOf('window.msHydrateRemoteGameState'));
  assert.match(hydrate,/currentRepo\.characters = characters\.map\(msClone\)/);
  assert.ok(hydrate.indexOf('currentRepo.characters = characters.map(msClone)') < hydrate.indexOf('msSyncCurrentUserView()'));
});

test('nova ficha recebe ID estável antes do primeiro salvamento',()=>{
  const s=read('js/script.js');
  assert.match(s,/window\.__msBuilderCharacterId/);
  assert.match(s,/const characterId = editingId \|\| window\.__msBuilderCharacterId/);
  assert.doesNotMatch(s,/id:\s*editingIndex !== null &&/);
});

test('Ancoragem renderiza conexões para jogador e mantém ações de entrada e saída',()=>{
  const s=read('js/master-room.js');
  assert.match(s,/function renderPlayerConnections/);
  assert.match(s,/player-tables-list/);
  assert.match(s,/data-player-enter/);
  assert.match(s,/data-player-leave/);
  assert.ok(s.indexOf('renderPlayerConnections();syncGmTab();') < s.indexOf('if(!canUseGmLobby())return;'));
});

test('Cofre do Mestre é idempotente e não duplica suítes em renderizações concorrentes',()=>{
  const s=read('js/master-tools.js');
  assert.match(s,/querySelectorAll\('\.gm-tools-suite'\)\.forEach\(node=>node\.remove\(\)\)/);
});

test('preview sem arquétipo não requisita caminho vazio de SVG',()=>{
  const s=read('js/archetype-art-direction.js');
  assert.match(s,/const image=artId\?/);
  assert.match(s,/:'';/);
});

test('Escudo identifica autoridade Mestre ou ADM ao abrir',()=>{
  const s=read('js/master-shield.js');
  assert.match(s,/ARCONTE · ADM/);
  assert.match(s,/MESTRE AUTORIZADO/);
});
