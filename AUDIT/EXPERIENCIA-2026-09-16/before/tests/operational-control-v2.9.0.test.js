import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const read=p=>fs.readFileSync(p,'utf8');
const index=read('index.html');
const op=read('js/operational-control-v2.10.1.js');
const css=read('css/operational-control-v2.10.1.css');
const shell=read('js/table-shell-v3.js');
const loader=read('js/feature-loader.js');
const offline=read('js/offline-db.js');
const progression=read('js/progression-v2.8.9.js');

function runtime(){
  const mem=new Map();
  const localStorage={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
  class CustomEvent{constructor(type,opts={}){this.type=type;this.detail=opts.detail}}
  class BroadcastChannel{addEventListener(){}postMessage(){}close(){}}
  const ctx={console,Date,Math,JSON,URLSearchParams,location:{search:''},localStorage,CustomEvent,BroadcastChannel,setTimeout,clearTimeout,crypto:{randomUUID:()=>crypto.randomUUID()}};
  ctx.window=ctx;ctx.window.dispatchEvent=()=>true;ctx.window.addEventListener=()=>{};
  ctx.window.MS_RUNTIME_CONFIG={offlineMode:true,sandboxMode:true,storageNamespace:'test-ms-operational',supabase:{url:'',publishableKey:''}};
  vm.createContext(ctx);vm.runInContext(offline,ctx,{filename:'offline-db.js'});
  return ctx.MS_OFFLINE_DB.create();
}
async function login(api,user,pass){const r=await api.signIn(user,pass);assert.equal(r.error,null);return r.data;}

test('Jogador possui FICHAS global com Fichas Rápidas e viewer somente leitura lazy',()=>{
  assert.match(index,/FICHAS · ACESSO RÁPIDO/);
  assert.match(index,/ensureOperational/);
  assert.doesNotMatch(index,/<script src="js\/operational-control-v2\.9\.0\.js"/);
  assert.match(loader,/ensureOperational/);
  assert.match(op,/FICHAS RÁPIDAS/);
  assert.match(op,/msOpenCharacterViewer/);
  assert.match(progression,/VIEWER UNIVERSAL/);
});

test('Central Operacional TRIPULAÇÃO contém Participantes Solicitações Evolução e ações de ficha/admissão/PEG',()=>{
  for(const token of ['PARTICIPANTES','SOLICITAÇÕES','EVOLUÇÃO','VER FICHA','ACEITAR','RECUSAR','CONCEDER PEG','COMPRAR PEG']) assert.match(op,new RegExp(token));
  assert.match(op,/data-crew-count/);
  assert.match(shell,/msOpenCrewCenter|ensureOperational/);
  assert.match(op,/msRefreshCurrentVttRoster/);
});

test('sandbox dá ao ADM todas as Mesas e Co-Mestre recebe a mesma autoridade operacional',async()=>{
  const api=runtime();
  await login(api,'mestre','mestre1234');
  const extra=(await api.createTableRemote({name:'Mesa fora do Arconte',gameMode:'exodo'})).data;
  const promoted=await api.setTableMemberRole('table-sandbox-001','u-player','co_mestre');assert.equal(promoted.error,null);
  await api.signOut();await login(api,'jogador','jogador123');
  const coMaster=await api.fetchTableJoinRequests('table-sandbox-001');assert.equal(coMaster.error,null);
  await api.signOut();await login(api,'admin','admin12345');
  const rows=(await api.fetchMyTables()).data;assert.ok(rows.some(x=>x.id===extra.id));
});

test('jornada operacional persiste solicitação, aprova roster, compra PEG com SoulDrakma, debita reserva e Arconte concede à Mesa',async()=>{
  const api=runtime();await login(api,'mestre','mestre1234');
  const table=(await api.createTableRemote({name:'Jornada Operacional',gameMode:'exodo',recruitment:{published:true,acceptingRequests:true,maxPlayers:6,levelRules:{exodoMin:'veterano',exodoMax:'veterano'}}})).data;
  await api.signOut();await login(api,'jogador','jogador123');
  const req=(await api.requestTableJoin(table.id,'char-player-exodo')).data;assert.equal(req.status,'pending');
  await api.signOut();await login(api,'mestre','mestre1234');
  assert.ok((await api.fetchTableJoinRequests(table.id)).data.some(x=>x.id===req.id&&x.status==='pending'));
  const approved=await api.resolveTableJoinRequest(req.id,true,'');assert.equal(approved.data.status,'approved');
  assert.ok((await api.fetchTableRoster(table.id)).data.some(x=>x.character_id==='char-player-exodo'&&x.status==='active'));
  assert.ok((await api.fetchTableJoinRequests(table.id)).data.some(x=>x.id===req.id&&x.status==='approved'));
  const soulBefore=(await api.fetchSoulAccountState()).data.wallet.balance;
  const walletBefore=(await api.fetchProgressionTableState(table.id)).data.wallet.balance;
  const bought=await api.buyTableProgressionPoints(table.id,10);assert.equal(bought.error,null);
  const soulAfter=(await api.fetchSoulAccountState()).data.wallet.balance;assert.equal(soulBefore-soulAfter,10000);
  const walletBought=(await api.fetchProgressionTableState(table.id)).data.wallet.balance;assert.equal(walletBought,walletBefore+10);
  await api.grantCharacterProgression(table.id,'char-player-exodo',4,'Central Operacional');
  const walletGranted=(await api.fetchProgressionTableState(table.id)).data.wallet.balance;assert.equal(walletGranted,walletBought-4);
  await api.signOut();await login(api,'admin','admin12345');
  const arconte=await api.adminAdjustTableProgression(table.id,7,'Arconte');assert.equal(arconte.error,null);assert.equal(arconte.data.balance,walletGranted+7);
});

test('Fabric Lite é local no sandbox e cobre canvas, grid, formas, régua, serialização e movimento sem CDN',()=>{
  const vendor=read('js/vendor-loader.js');
  assert.match(vendor,/offlineRuntime\(\)/);assert.match(vendor,/fabricLite\(\)/);assert.match(vendor,/ensureOperational/);
  for(const token of ['class CanvasLite','class Line','class Circle','class Rect','class Triangle','class Group','toJSON(extra','loadFromJSON','getPointer','object:moving','enlivenObjects']) assert.match(op,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(op,/__msLite:true/);
});

test('390x844: Fichas Rápidas e Central usam drawer sem overflow e ficam acima das janelas da Mesa',()=>{
  assert.match(css,/@media\(max-width:390px\)/);
  assert.match(css,/width:100vw;max-width:100vw/);
  assert.match(css,/overflow-x:hidden/);
  assert.match(css,/#ms-crew-center\{z-index:15050\}/);
  assert.match(css,/align-items:flex-end/);
  assert.match(css,/\.ms-op-tabs\{overflow-x:auto/);
  assert.match(css,/#ms-table-v3 \.ms-table-v3-nav/);
});


test('V2.10.1 expõe concessão direta de evolução e sincroniza filas operacionais',()=>{
  assert.match(op,/CONCEDER EVOLUÇÃO/);
  assert.match(op,/data-evo-direct/);
  assert.match(op,/Progression\?\.state/);
  assert.match(op,/setInterval\(refreshCounter,8000\)/);
});
