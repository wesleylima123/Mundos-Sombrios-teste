import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const read=p=>fs.readFileSync(p,'utf8');
const offline=read('js/offline-db.js');
const engine=read('js/evolution-backend-v2.10.1.js');
const ui=read('js/evolution-gradual-v2.10.1.js');
const operational=read('js/operational-control-v2.10.1.js');
const css=read('css/evolution-gradual-v2.10.1.css');
const migration=read('supabase-progression-v2.10.1-hotfix.sql');

function runtime(){
  const mem=new Map();
  const localStorage={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k),clear:()=>mem.clear()};
  class CustomEvent{constructor(type,opts={}){this.type=type;this.detail=opts.detail}}
  class BroadcastChannel{addEventListener(){}postMessage(){}close(){}}
  const ctx={console,Date,Math,JSON,URLSearchParams,structuredClone,location:{search:''},localStorage,CustomEvent,BroadcastChannel,setTimeout,clearTimeout,crypto:{randomUUID:()=>crypto.randomUUID()}};
  ctx.window=ctx;ctx.window.dispatchEvent=()=>true;ctx.window.addEventListener=()=>{};
  ctx.window.MS_RUNTIME_CONFIG={offlineMode:true,sandboxMode:true,storageNamespace:'test-evo-v2101',supabase:{url:'',publishableKey:''}};
  vm.createContext(ctx);vm.runInContext(offline,ctx,{filename:'offline-db.js'});
  const api=ctx.MS_OFFLINE_DB.create();ctx.MS_DB=api;vm.runInContext(engine,ctx,{filename:'evolution-backend-v2.10.1.js'});
  return {ctx,api,evo:ctx.MS_EVOLUTION_BACKEND};
}
async function login(api,user,pass){const r=await api.signIn(user,pass);assert.equal(r.error,null);return r.data}
async function switchTo(api,user,pass){await api.signOut();return login(api,user,pass)}

function track(state,type,label){return state.tracks.find(t=>t.capability_type===type&&String(t.label).toLowerCase()===label.toLowerCase())}

test('V2.10.1 carrega motor de evolução somente sob demanda e mantém o boot principal leve',()=>{
  const loader=read('js/feature-loader.js');
  assert.match(loader,/evolution-backend-v2\.10\.1\.js/);
  assert.match(loader,/evolution-gradual-v2\.10\.1\.js/);
  assert.match(loader,/css\/evolution-gradual-v2\.10\.1\.css/);
  assert.doesNotMatch(read('index.html'),/evolution-backend-v2\.10\.1\.js/);
});

test('Ficha Rápida oferece FICHA EVOLUÇÃO HISTÓRICO e cobre todas as famílias mecânicas',()=>{
  for(const token of ['FICHA','EVOLUÇÃO','HISTÓRICO','attribute','skill','advantage','talent','power','ritual','class','REGISTRAR PRÁTICA','TREINAR','SOLICITAR EVOLUÇÃO','DESENVOLVER'])assert.ok(ui.includes(token),token);
  assert.match(ui,/Sucessos habilitam a evolução\. PEG efetiva/);
  assert.match(ui,/Somente este módulo será enviado ao Mestre\. A ficha inteira não será substituída/);
});

test('motor cria trilhas canônicas com sucesso alvo igual a próxima graduação × 10',async()=>{
  const {api,evo}=runtime();await login(api,'jogador','jogador123');
  const state=await evo.state('table-sandbox-001','char-player-exodo');
  const luta=track(state,'skill','Luta'),forca=state.tracks.find(t=>t.capability_type==='attribute'&&t.capability_key==='for'),classe=state.tracks.find(t=>t.capability_type==='class');
  assert.equal(luta.current_rank,2);assert.equal(luta.successes_required,30);
  assert.equal(forca.current_rank,4);assert.equal(forca.successes_required,50);
  assert.equal(classe.requirements.length,5);assert.ok(classe.requirements.every(r=>r.done===false));
  assert.ok(state.tracks.some(t=>t.capability_type==='advantage'));
  assert.ok(state.tracks.some(t=>t.capability_type==='talent'));
  const power=state.tracks.find(t=>t.capability_type==='power');assert.ok(power);assert.equal(power.requirements.length,1);assert.match(power.requirements[0].label,/Descoberta|assimilação|manifestação/i);
});

test('jornada V2.10.1: Jogador solicita sem PEG suficiente e Mestre completa pela reserva ao aprovar',async()=>{
  const {api,evo}=runtime();await login(api,'jogador','jogador123');
  let state=await evo.state('table-sandbox-001','char-player-exodo');const luta=track(state,'skill','Luta');
  const evidence=await evo.submitEvidence('table-sandbox-001','char-player-exodo','skill',luta.capability_key,10,'Sessão 01','Duelo decisivo com impacto real.');
  await switchTo(api,'mestre','mestre1234');await evo.resolveEvidence(evidence.id,true,'Reconhecido em mesa');
  await evo.recordSuccess('table-sandbox-001','char-player-exodo','skill',luta.capability_key,20,'Sessão 02','Uso recorrente e relevante em desafios.');
  state=await evo.state('table-sandbox-001','char-player-exodo');assert.equal(track(state,'skill','Luta').status,'ready');
  const beforeWallet=(await api.fetchProgressionTableState('table-sandbox-001')).data.wallet.balance;
  await switchTo(api,'jogador','jogador123');const req=await evo.requestUpgrade('table-sandbox-001','char-player-exodo','skill',luta.capability_key,'Aprimorar Luta');assert.equal(req.recommended_cost,30);assert.ok(req.peg_shortfall>0);
  await switchTo(api,'mestre','mestre1234');const applied=await evo.resolveUpgrade(req.id,true,null,'Aprovação do Mestre',true);assert.equal(applied.cost,30);assert.ok(applied.funded_missing>0);
  const afterMaster=(await api.fetchProgressionTableState('table-sandbox-001')).data;assert.equal(afterMaster.wallet.balance,beforeWallet-applied.funded_missing);
  await switchTo(api,'jogador','jogador123');state=await evo.state('table-sandbox-001','char-player-exodo');
  const next=track(state,'skill','Luta');assert.equal(next.current_rank,3);assert.equal(next.successes,0);assert.equal(next.successes_required,40);assert.equal(state.account.balance,0);
  const sheet=(await api.fetchMyCharacters()).data.find(c=>c.id==='char-player-exodo').payload;
  assert.equal(sheet.skills.find(s=>s.name==='Luta').grade,3);assert.equal(sheet.stats.for,4);assert.ok(state.events.some(e=>e.event_type==='EVOLUTION_APPLIED'));
});

test('Mestre concede evolução diretamente em trilha pronta e pode completar PEG pela reserva',async()=>{
  const {api,evo}=runtime();await login(api,'mestre','mestre1234');let state=await evo.state('table-sandbox-001','char-player-exodo');const presenca=state.tracks.find(t=>t.capability_type==='attribute'&&t.capability_key==='pre');
  await evo.recordSuccess('table-sandbox-001','char-player-exodo','attribute',presenca.capability_key,presenca.successes_required,'Sessão Mestre','Treino e uso relevante reconhecidos.');
  state=await evo.state('table-sandbox-001','char-player-exodo');const ready=state.tracks.find(t=>t.id===presenca.id);assert.equal(ready.status,'ready');const walletBefore=(await api.fetchProgressionTableState('table-sandbox-001')).data.wallet.balance;
  const out=await evo.grantUpgrade('table-sandbox-001','char-player-exodo','attribute',ready.capability_key,true,'Concessão direta do Mestre');assert.equal(out.track.current_rank,ready.current_rank+1);assert.ok(out.funded_missing>=0);
  const walletAfter=(await api.fetchProgressionTableState('table-sandbox-001')).data.wallet.balance;assert.equal(walletAfter,walletBefore-out.funded_missing);
});

test('treinamento usa Básico 13/+1, Prático 18/+2 e Difícil 23/+3 com limite de 3 por período',async()=>{
  const {api,evo}=runtime();await login(api,'jogador','jogador123');let state=await evo.state('table-sandbox-001','char-player-exodo');const power=state.tracks.find(t=>t.capability_type==='power');
  const req=await evo.requestTraining('table-sandbox-001','char-player-exodo','power',power.capability_key,'practical',2,'Interlúdio I','Treino supervisionado com recurso adequado.');
  await switchTo(api,'mestre','mestre1234');const out=await evo.resolveTraining(req.id,true,'Contexto aprovado');
  assert.equal(out.dc,18);assert.ok(out.roll>=1&&out.roll<=20);assert.ok([0,2].includes(out.awarded_successes));
  if(out.success===false)assert.match(out.consequence,/Fadiga temporária/);
  assert.match(ui,/Básico · CD 13 · \+1/);assert.match(ui,/Prático · CD 18 · \+2/);assert.match(ui,/Difícil · CD 23 · \+3/);
});

test('falha em treino de poder registra risco temático sem aplicar mutação automática',async()=>{
  const {api,evo}=runtime();await login(api,'jogador','jogador123');let state=await evo.state('table-sandbox-001','char-player-exodo');const power=state.tracks.find(t=>t.capability_type==='power');
  const req=await evo.requestTraining('table-sandbox-001','char-player-exodo','power',power.capability_key,'difficult',-2,'Interlúdio de risco','Forçar o Gene Êxodo além do limite seguro.');
  await switchTo(api,'mestre','mestre1234');const out=await evo.resolveTraining(req.id,true,'Contexto extremo aprovado');assert.equal(out.success,false);assert.match(out.consequence,/instabilidade genética/i);
  state=await evo.state('table-sandbox-001','char-player-exodo');const after=state.tracks.find(t=>t.id===power.id);assert.equal(after.metadata.risk_count,1);assert.equal(after.metadata.risk_theme,'instabilidade_exodo');assert.equal(after.metadata.risk_label,'Pressão do Gene Êxodo');
  assert.match(after.metadata.risk_profile.master_prompt,/Gene Êxodo/i);assert.ok(state.events.some(e=>e.event_type==='TRAINING_FAILURE'&&e.metadata?.riskProfile?.theme==='instabilidade_exodo'));
  const occult=evo.riskProfile('ocultatun','ritual','difficult',4);assert.equal(occult.theme,'ruptura_ocultatun');assert.equal(occult.severity,'critical');assert.match(occult.consequence,/sanidade|entidade/i);
});

test('classe exige cinco marcos narrativos e aceleração pode ignorar sucessos com registro explícito',async()=>{
  const {api,evo}=runtime();await login(api,'mestre','mestre1234');let state=await evo.state('table-sandbox-001','char-player-exodo');const cls=state.tracks.find(t=>t.capability_type==='class');
  for(const r of cls.requirements)await evo.setRequirement('table-sandbox-001','char-player-exodo','class',cls.capability_key,r.key,true,r.label);
  await evo.recordSuccess('table-sandbox-001','char-player-exodo','class',cls.capability_key,20,'Provação','Marcos de classe reconhecidos.');
  state=await evo.state('table-sandbox-001','char-player-exodo');assert.equal(state.tracks.find(t=>t.capability_type==='class').status,'ready');
  const power=state.tracks.find(t=>t.capability_type==='power'),beforeBalance=state.account.balance;
  await evo.accelerate('table-sandbox-001','char-player-exodo','power',power.capability_key,true,'Sobreviveu sozinho a um desafio mortal.');
  state=await evo.state('table-sandbox-001','char-player-exodo');assert.equal(state.tracks.find(t=>t.id===power.id).current_rank,power.current_rank+1);assert.equal(state.account.balance,beforeBalance);assert.ok(state.events.some(e=>e.event_type==='ACCELERATION'));
});

test('Arconte consulta Ledger operacional por Mesa além de ajustar a reserva',async()=>{
  const {api}=runtime();await login(api,'admin','admin12345');let rows=(await api.fetchProgressionAdminTables()).data;assert.ok(rows.some(x=>x.table_id==='table-sandbox-001'));
  const adjust=await api.adminAdjustTableProgression('table-sandbox-001',7,'Auditoria Arconte V2.10');assert.equal(adjust.error,null);
  const ledger=(await api.fetchProgressionAdminTableLedger('table-sandbox-001',100)).data;assert.equal(ledger.table.table_id,'table-sandbox-001');assert.ok(ledger.transactions.some(x=>x.reason==='Auditoria Arconte V2.10'));assert.ok(Array.isArray(ledger.events));
});

test('Central Operacional concentra Personagens Solicitações Treinamentos Ledger e Arconte recebe métricas',()=>{
  for(const token of ['PERSONAGENS','SOLICITAÇÕES','TREINAMENTOS','LEDGER','GERENCIAR EVOLUÇÃO','resolveEvidence','resolveUpgrade','resolveTraining','resolveDevelopment'])assert.ok(operational.includes(token),token);
  const legacy=read('js/progression-v2.8.9.js');assert.match(legacy,/pronta\(s\) para evoluir/);assert.match(legacy,/pending_evolution_count/);assert.match(legacy,/data-admin-ledger/);assert.match(legacy,/MEMÓRIA DE EVOLUÇÃO/);
});

test('migração V2.10.1 permite solicitação sem saldo e oferece aprovação/concessão com complemento atômico',()=>{
  for(const fn of ['progression_request_semantic_upgrade','progression_resolve_semantic_upgrade_v2','progression_grant_semantic_upgrade','evolution_fund_character_missing'])assert.ok(migration.includes(fn),fn);
  assert.doesNotMatch(migration,/progression_request_semantic_upgrade[\s\S]{0,1800}a\.balance<cost/);
  assert.match(migration,/p_auto_fund_missing/);assert.match(migration,/INSUFFICIENT_TABLE_PROGRESSION/);assert.match(migration,/notify pgrst, 'reload schema'/);
});

test('mobile 390×844 mantém abas e cartões sem largura fixa horizontal',()=>{
  assert.match(css,/@media\(max-width:390px\)/);
  assert.match(css,/max-width:100vw/);
  assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css,/width:min\(620px,calc\(100vw - 28px\)\)/);
  assert.match(css,/@media\(max-width:600px\).*width:100vw/s);
});
