import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const read=p=>fs.readFileSync(p,'utf8');
const offline=read('js/offline-db.js');

function runtime(){
  const mem=new Map();
  const localStorage={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k),clear:()=>mem.clear()};
  class CustomEvent{constructor(type,opts={}){this.type=type;this.detail=opts.detail}}
  class BroadcastChannel{addEventListener(){}postMessage(){}close(){}}
  const events=[];
  const ctx={console,Date,Math,JSON,URLSearchParams,location:{search:''},localStorage,CustomEvent,BroadcastChannel,setTimeout,clearTimeout,crypto:{randomUUID:()=>crypto.randomUUID()}};
  ctx.window=ctx;ctx.window.dispatchEvent=e=>{events.push(e);return true};ctx.window.addEventListener=()=>{};
  ctx.window.MS_RUNTIME_CONFIG={offlineMode:true,sandboxMode:true,storageNamespace:'test-ms-v2100',supabase:{url:'',publishableKey:''}};
  vm.createContext(ctx);vm.runInContext(offline,ctx,{filename:'offline-db.js'});
  return {ctx,api:ctx.MS_OFFLINE_DB.create(),events};
}

async function login(api,user,pass){const r=await api.signIn(user,pass);assert.equal(r.error,null);return r.data}

test('V2.10.1 usa uma versão canônica e sandbox gerado da mesma árvore',()=>{
  assert.equal(read('VERSION.txt').trim(),'2.10.1');
  assert.equal(JSON.parse(read('package.json')).version,'2.10.1');
  assert.match(read('scripts/build-sandbox.mjs'),/mesmos bytes de runtime|MESMO runtime/i);
  for(const p of ['index.html','js/script.js','js/ms-services.js','js/progression-v2.8.9.js','js/forja-overhaul-v2.8.10.js','css/style.css']){
    assert.equal(fs.readFileSync(`sandbox-offline/${p}`).compare(fs.readFileSync(p)),0,`${p} divergiu do runtime principal`);
  }
  assert.match(read('sandbox-offline/js/ms-runtime-config.js'),/ms-sandbox-v2101/);
  assert.match(read('sandbox-offline/js/ms-runtime-config.js'),/sandboxMode:\s*true/);
});

test('papéis offline respeitam autoridade Jogador Mestre ADM',async()=>{
  const {api}=runtime();
  await login(api,'jogador','jogador123');
  const denied=await api.createTableRemote({name:'Não pode'});assert.equal(denied.error?.message,'GM_REQUIRED');
  await api.signOut();await login(api,'mestre','mestre1234');
  const made=await api.createTableRemote({name:'Mesa do Mestre',gameMode:'exodo',recruitment:{levelRules:{exodoMin:'iniciado',exodoMax:'veterano'}}});assert.equal(made.error,null);
  await api.signOut();await login(api,'admin','admin12345');
  const adminMade=await api.createTableRemote({name:'Mesa do ADM',gameMode:'ocultatun'});assert.equal(adminMade.error,null);
});

test('save comum após criação preserva mecânica e recursos da ficha',async()=>{
  const {api}=runtime();await login(api,'jogador','jogador123');
  const before=(await api.fetchMyCharacters()).data.find(c=>c.id==='char-player-exodo');
  const incoming=structuredClone(before.payload);incoming.name='Nome Narrativo Novo';incoming.stats.for=99;incoming.resources['CÊ']=999;incoming.resources.CR=777;incoming.concept={...(incoming.concept||{}),motivation:'Mudança narrativa permitida'};
  const saved=await api.saveCharacter(incoming);assert.equal(saved.error,null);
  const after=(await api.fetchMyCharacters()).data.find(c=>c.id==='char-player-exodo');
  assert.equal(after.payload.stats.for,before.payload.stats.for);
  assert.equal(after.payload.resources['CÊ'],before.payload.resources['CÊ']);
  assert.equal(after.payload.resources.CR,before.payload.resources.CR);
  assert.equal(after.name,'Nome Narrativo Novo');
  assert.equal(after.payload.concept.motivation,'Mudança narrativa permitida');
});

test('requisitos da Mesa rejeitam automaticamente ficha fora do nível e aceitam após correção',async()=>{
  const {api}=runtime();await login(api,'mestre','mestre1234');
  const made=(await api.createTableRemote({name:'Só Iniciados',gameMode:'exodo',recruitment:{published:true,acceptingRequests:true,maxPlayers:6,levelRules:{exodoMin:'iniciado',exodoMax:'iniciado'}}})).data;
  await api.signOut();await login(api,'jogador','jogador123');
  const bad=await api.requestTableJoin(made.id,'char-player-exodo');assert.equal(bad.error,null);assert.equal(bad.data.status,'auto_rejected');assert.equal(bad.data.rejection_reason,'CHARACTER_LEVEL_MISMATCH');
  await api.signOut();await login(api,'mestre','mestre1234');
  await api.updateTableRecruitment(made.id,'exodo','Agora veteranos',{published:true,acceptingRequests:true,maxPlayers:6,allowedExpansions:[],allowedClasses:[],sheetVisibility:'summary',levelRules:{exodoMin:'veterano',exodoMax:'veterano',existenceMin:5,existenceMax:0,patamarMin:1,patamarMax:4}});
  await api.signOut();await login(api,'jogador','jogador123');
  const good=await api.requestTableJoin(made.id,'char-player-exodo');assert.equal(good.data.status,'pending');
});

test('jornada legada: +1 direto fica bloqueado após concessão; V2.10 exige trilha semântica',async()=>{
  const {api}=runtime();await login(api,'mestre','mestre1234');
  const table=(await api.createTableRemote({name:'Progressão',gameMode:'exodo',recruitment:{published:true,acceptingRequests:true,maxPlayers:6,levelRules:{exodoMin:'veterano',exodoMax:'veterano'}}})).data;
  await api.signOut();await login(api,'jogador','jogador123');
  const req=(await api.requestTableJoin(table.id,'char-player-exodo')).data;assert.equal(req.status,'pending');
  await api.signOut();await login(api,'mestre','mestre1234');
  const approved=await api.resolveTableJoinRequest(req.id,true,'');assert.equal(approved.data.status,'approved');
  const bought=await api.buyTableProgressionPoints(table.id,60);assert.equal(bought.error,null);
  const grant=await api.grantCharacterProgression(table.id,'char-player-exodo',60,'Recompensa da sessão');assert.equal(grant.error,null);
  await api.signOut();await login(api,'jogador','jogador123');
  const up=await api.upgradeProgressionAttribute(table.id,'char-player-exodo','for');assert.equal(up.error?.message,'SEMANTIC_EVOLUTION_REQUIRED');
});

test('recursos protegidos exigem solicitação do Jogador e decisão do Mestre',async()=>{
  const {api}=runtime();await login(api,'jogador','jogador123');
  const noReason=await api.requestCharacterResource('table-sandbox-001','char-player-exodo','CR',2,'');assert.equal(noReason.error?.message,'REASON_REQUIRED');
  const req=await api.requestCharacterResource('table-sandbox-001','char-player-exodo','CR',2,'Objetivo concluído');assert.equal(req.error,null);
  const before=(await api.fetchMyCharacters()).data.find(c=>c.id==='char-player-exodo').payload.resources.CR;
  await api.signOut();await login(api,'mestre','mestre1234');
  const done=await api.resolveCharacterResourceRequest(req.data.id,true);assert.equal(done.error,null);
  await api.signOut();await login(api,'jogador','jogador123');
  const after=(await api.fetchMyCharacters()).data.find(c=>c.id==='char-player-exodo').payload.resources.CR;assert.equal(after,before+2);
});

test('Arconte ajusta PEG diretamente na Mesa e Jogador não enxerga carteira da Mesa',async()=>{
  const {api}=runtime();await login(api,'jogador','jogador123');
  const playerState=await api.fetchProgressionTableState('table-sandbox-001');assert.equal(playerState.data.wallet,null);
  const denied=await api.adminAdjustTableProgression('table-sandbox-001',10,'ADM');assert.equal(denied.error?.message,'ADMIN_REQUIRED');
  await api.signOut();await login(api,'admin','admin12345');
  const rows=await api.fetchProgressionAdminTables();assert.ok(rows.data.some(x=>x.table_id==='table-sandbox-001'));
  const before=rows.data.find(x=>x.table_id==='table-sandbox-001').balance;
  const adj=await api.adminAdjustTableProgression('table-sandbox-001',10,'Concessão do Arconte');assert.equal(adj.error,null);assert.equal(adj.data.balance,before+10);
});

test('visualizador universal respeita visibilidade da Mesa para outro jogador',async()=>{
  const {api}=runtime();await login(api,'mestre','mestre1234');
  await api.updateTableRecruitment('table-sandbox-001','exodo','Privada',{published:true,acceptingRequests:true,maxPlayers:6,allowedExpansions:[],allowedClasses:[],sheetVisibility:'private',levelRules:{exodoMin:'iniciado',exodoMax:'veterano',existenceMin:5,existenceMax:0,patamarMin:1,patamarMax:4}});
  await api.signOut();await login(api,'jogador','jogador123');
  const view=await api.fetchCharacterView('char-master-exodo','table-sandbox-001');assert.equal(view.error,null);assert.equal(view.data.visibility,'private');assert.equal(view.data.payload.stats,undefined);assert.equal(view.data.payload.resources,undefined);assert.equal(view.data.payload.name,'Sentinela do Mestre');
});



test('Ocultatun preserva Sucesso de Carreira e bloqueia o +1 legado fora da trilha semântica',async()=>{
  const {api}=runtime();await login(api,'mestre','mestre1234');
  const table=(await api.createTableRemote({name:'Ocultatun QA',gameMode:'ocultatun',recruitment:{published:true,acceptingRequests:true,maxPlayers:6,levelRules:{existenceMin:5,existenceMax:0,patamarMin:1,patamarMax:4}}})).data;
  await api.signOut();await login(api,'jogador','jogador123');
  const req=(await api.requestTableJoin(table.id,'char-player-ocultatun')).data;assert.equal(req.status,'pending');
  const playerBuy=await api.buyTableProgressionPoints(table.id,10);assert.equal(playerBuy.error?.message,'GM_REQUIRED');
  await api.signOut();await login(api,'mestre','mestre1234');
  await api.resolveTableJoinRequest(req.id,true,'');
  await api.buyTableProgressionPoints(table.id,60);
  await api.grantCharacterProgression(table.id,'char-player-ocultatun',60,'Marcas autorizadas pela Mesa');
  const career=await api.recordCareerSuccess(table.id,'char-player-ocultatun',3,'Prática real em missão');assert.equal(career.error,null);assert.equal(career.data.career_progress,3);
  const exCareer=await api.recordCareerSuccess('table-sandbox-001','char-player-exodo',1,'Teste inválido');assert.equal(exCareer.error?.message,'OCULTATUN_ONLY');
  await api.signOut();await login(api,'jogador','jogador123');
  const up=await api.upgradeProgressionAttribute(table.id,'char-player-ocultatun','int');assert.equal(up.error?.message,'SEMANTIC_EVOLUTION_REQUIRED');
});

test('SQL V2.9.0 reassegura travas, admissão e custos dos dois cenários',()=>{
  const sql=read('supabase-consolidation-v2.9.0.sql');
  for(const token of ['character_merge_narrative','CHARACTER_ARCHETYPE_LOCKED','table_character_rejection','CHARACTER_LEVEL_MISMATCH','progression_upgrade_attribute','cost:=20*newv','cost:=10*greatest(1,newv)','restore_character_version']) assert.match(sql,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});

test('Mesa V2.9.0 integra Campanha e status ao vivo sem depender do carregamento da Forja',()=>{
  const shell=read('js/table-shell-v3.js');
  for(const token of ['vtt-campaign-window','Campanha em Movimento','ensureCampaignWindow','setLiveStatus']) assert.match(shell,new RegExp(token));
});
