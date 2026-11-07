/* Mundos Sombrios — Fichas Globais + Central Operacional TRIPULAÇÃO V2.10.1 */
(function(){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const svc=()=>window.MS_SERVICES;
  const role=()=>String(window.currentUser?.role||'jogador').toLowerCase();
  const context=()=>window.msGetCurrentTableContext?.()||{table:null,asGM:false,players:[]};
  const manager=()=>role()==='admin'||!!context().asGM||!!document.getElementById('ms-table-v3')?.classList.contains('is-gm');
  const unwrap=v=>v?.data!==undefined?v.data:v;
  let crewState={table:null,roster:[],requests:[],progression:null,tab:'participants',evolutionTab:'characters',loading:false};
  let pollTimer=null;

  function toast(message,type='info'){window.MS_PLATFORM?.toast?.(message,type);}
  function errorText(error){return String(error?.message||error||'Operação indisponível.').replace(/^Error:\s*/,'');}
  function lock(open){document.body.classList.toggle('ms-op-lock',!!open);}

  // -----------------------------------------------------------------------
  // FICHAS GLOBAIS — leitura rápida fora do Santuário/Forja.
  // -----------------------------------------------------------------------
  function ensureQuickSheets(){
    let modal=document.getElementById('ms-quick-sheets');
    if(modal)return modal;
    modal=document.createElement('div');modal.id='ms-quick-sheets';modal.className='ms-quick-sheets';
    modal.innerHTML=`<section class="ms-op-shell" role="dialog" aria-modal="true" aria-label="Fichas Rápidas"><header class="ms-op-head"><div><small>ACESSO GLOBAL · SOMENTE LEITURA</small><h2>FICHAS RÁPIDAS</h2></div><button class="ms-op-close" type="button" data-quick-close>×</button></header><nav class="ms-op-tabs"><button class="active" type="button">MINHAS FICHAS</button></nav><main class="ms-op-body" data-quick-body></main></section>`;
    document.body.appendChild(modal);
    modal.querySelector('[data-quick-close]').onclick=closeQuickSheets;
    modal.addEventListener('click',e=>{if(e.target===modal)closeQuickSheets();});
    return modal;
  }
  function closeQuickSheets(){document.getElementById('ms-quick-sheets')?.classList.remove('open');lock(false);}
  function normalizeSheetRow(row){
    const p=row?.payload&&typeof row.payload==='object'?row.payload:row||{};
    return {id:row?.id||p.id||p.sourceCharId||'',name:p.name||row?.name||'Ficha sem nome',mode:p.mode||row?.mode||'exodo',nature:p.nature||row?.nature||'',className:p.className||row?.class_name||'',payload:p};
  }
  async function openQuickSheets(){
    const modal=ensureQuickSheets(),body=modal.querySelector('[data-quick-body]');modal.classList.add('open');lock(true);body.innerHTML='<div class="ms-op-empty">Sincronizando suas Fichas…</div>';
    try{
      let rows=[];
      if(svc()?.Characters?.listMine){const result=await svc().Characters.listMine();rows=unwrap(result)||[];}
      if(!Array.isArray(rows)||!rows.length)rows=(window.msGetCurrentCharacters?.()||[]).map(x=>({id:x.id,payload:x,name:x.name,mode:x.mode,nature:x.nature,class_name:x.className}));
      const sheets=(rows||[]).map(normalizeSheetRow);
      body.innerHTML=sheets.length?`<div class="ms-quick-grid">${sheets.map(x=>`<article class="ms-quick-card"><h3>${esc(x.name)}</h3><p>${esc(String(x.mode).toUpperCase())}${x.nature?' · '+esc(x.nature):''}${x.className?' · '+esc(x.className):''}</p><button type="button" data-quick-view="${esc(x.id)}">VER FICHA · SOMENTE LEITURA</button></article>`).join('')}</div>`:'<div class="ms-op-empty">Nenhuma ficha encontrada para esta conta.</div>';
      body.querySelectorAll('[data-quick-view]').forEach(btn=>btn.onclick=()=>window.msOpenCharacterViewer?.(btn.dataset.quickView,{source:'quick-sheets'}));
    }catch(error){body.innerHTML=`<div class="ms-op-error">${esc(errorText(error))}</div>`;}
  }
  function mountGlobalSheetsButton(){
    const actions=document.querySelector('#screen-mode-select .menu-actions');if(!actions||actions.querySelector('[data-global-sheets]'))return;
    const btn=document.createElement('button');btn.type='button';btn.className='souls-btn';btn.dataset.globalSheets='1';btn.textContent='FICHAS · ACESSO RÁPIDO';btn.style.cssText='border-color:#d4af37;color:#e5cd83;padding:14px 38px;font-size:1.08rem;box-shadow:0 0 18px rgba(212,175,55,.12)';btn.onclick=openQuickSheets;actions.insertBefore(btn,actions.firstChild);
  }

  async function refreshCurrentVttRoster(){
    const table=context().table;if(!table?.id||!svc()?.Games)return [];
    try{
      const [charResult,rosterResult]=await Promise.allSettled([svc().Games.characters(table.id),svc().Games.roster(table.id)]);
      if(charResult.status==='rejected')throw charResult.reason;
      const remote=charResult.status==='fulfilled'?(unwrap(charResult.value)||[]):[],roster=rosterResult.status==='fulfilled'?(unwrap(rosterResult.value)||[]):[];
      const uid=String(window.currentUser?.authUserId||window.currentUser?.id||'');
      const players=remote.map(c=>{const p=c.payload&&typeof c.payload==='object'?clone(c.payload):{};return Object.assign(p,{id:c.id,ownerId:c.owner_id,userId:c.user_id,name:p.name||c.name,mode:p.mode||c.mode,nature:p.nature||c.nature,className:p.className||c.class_name,updatedAt:c.updated_at,isMe:String(c.user_id)===uid,sourceOwnerId:c.owner_id,sourceCharId:c.id,participantUserId:c.user_id});});
      const known=new Set(players.map(x=>String(x.participantUserId||x.userId||'')));
      for(const r of roster){const id=String(r.user_id||r.profile?.id||'');if(!id||known.has(id)||String(r.status||'active')!=='active')continue;const ch=r.character||{};players.push({id:r.character_id||ch.id||`roster-${id}`,sourceCharId:r.character_id||ch.id||null,participantUserId:id,userId:id,name:r.character_name||ch.name||r.profile?.username||r.username||'Participante',username:r.username||r.profile?.username||'jogador',memberRole:r.member_role||r.role||'jogador',isMe:id===uid,isRosterOnly:true,resources:{},stats:{}});known.add(id);}
      return window.msApplyVttRosterSnapshot?.(players)||players;
    }catch(error){toast('Não foi possível atualizar a tripulação da Mesa.','error');return [];}
  }
  window.msRefreshCurrentVttRoster=refreshCurrentVttRoster;

  // -----------------------------------------------------------------------
  // CENTRAL OPERACIONAL — TRIPULAÇÃO.
  // -----------------------------------------------------------------------
  function ensureCrewCenter(){
    let modal=document.getElementById('ms-crew-center');if(modal)return modal;
    modal=document.createElement('div');modal.id='ms-crew-center';modal.className='ms-crew-center';
    modal.innerHTML=`<section class="ms-op-shell" role="dialog" aria-modal="true" aria-label="Central Operacional — Tripulação"><header class="ms-op-head"><div><small>CENTRAL OPERACIONAL</small><h2>TRIPULAÇÃO</h2></div><button class="ms-op-close" type="button" data-crew-close>×</button></header><nav class="ms-op-tabs" data-crew-tabs><button type="button" data-crew-tab="participants" class="active">PARTICIPANTES</button><button type="button" data-crew-tab="requests">SOLICITAÇÕES <span class="ms-op-badge" data-crew-count>0</span></button><button type="button" data-crew-tab="evolution">EVOLUÇÃO</button></nav><main class="ms-op-body" data-crew-body></main></section>`;
    document.body.appendChild(modal);
    modal.querySelector('[data-crew-close]').onclick=closeCrewCenter;
    modal.addEventListener('click',e=>{if(e.target===modal)closeCrewCenter();});
    modal.querySelectorAll('[data-crew-tab]').forEach(b=>b.onclick=()=>{crewState.tab=b.dataset.crewTab;renderCrew();});
    return modal;
  }
  function closeCrewCenter(){document.getElementById('ms-crew-center')?.classList.remove('open');lock(false);}
  function pendingRequests(){return (crewState.requests||[]).filter(r=>String(r.status||'pending')==='pending');}
  function normalizeRoster(row){
    const profile=row?.profile||{},ch=row?.character||{};
    return {userId:row?.user_id||profile.id||'',username:row?.username||profile.username||'jogador',characterId:row?.character_id||ch.id||'',characterName:row?.character_name||ch.name||'Sem ficha',memberRole:row?.member_role||row?.role||'jogador',status:row?.status||'active'};
  }
  function updateCrewCounter(){
    const n=pendingRequests().length;
    document.querySelectorAll('[data-crew-count]').forEach(x=>x.textContent=String(n));
    const manageBtn=document.querySelector('#ms-table-v3 [data-action="manage"]');
    if(manageBtn){manageBtn.innerHTML=n?`TRIPULAÇÃO <span class="ms-op-badge">${n}</span>`:'TRIPULAÇÃO';manageBtn.setAttribute('aria-label',n?`Tripulação, ${n} solicitações pendentes`:'Tripulação');}
  }
  async function loadCrew(silent=false){
    const ctx=context(),table=ctx.table;if(!table?.id||!manager())return false;
    crewState.table=clone(table);crewState.loading=true;if(!silent)renderCrewLoading();
    try{
      const tasks=[svc()?.Games?.roster?.(table.id),svc()?.Games?.joinRequests?.(table.id),svc()?.Progression?.state?.(table.id)];
      const [roster,requests,progression]=await Promise.all(tasks);
      crewState.roster=(unwrap(roster)||[]).map(normalizeRoster);crewState.requests=unwrap(requests)||[];crewState.progression=unwrap(progression)||null;crewState.loading=false;updateCrewCounter();renderCrew();return true;
    }catch(error){crewState.loading=false;if(!silent)renderCrewError(error);return false;}
  }
  function renderCrewLoading(){const m=ensureCrewCenter(),b=m.querySelector('[data-crew-body]');b.innerHTML='<div class="ms-op-empty">Sincronizando tripulação…</div>';}
  function renderCrewError(error){const b=ensureCrewCenter().querySelector('[data-crew-body]');b.innerHTML=`<div class="ms-op-error">${esc(errorText(error))}</div>`;}
  function setActiveTab(){document.querySelectorAll('#ms-crew-center [data-crew-tab]').forEach(b=>b.classList.toggle('active',b.dataset.crewTab===crewState.tab));}
  function accountFor(characterId){return (crewState.progression?.accounts||[]).find(a=>String(a.character_id)===String(characterId));}
  function participantCards(){
    const rows=(crewState.roster||[]).filter(r=>String(r.status)==='active');
    if(!rows.length)return '<div class="ms-op-empty">Nenhum participante ativo.</div>';
    return `<div class="ms-op-list">${rows.map(r=>{const a=accountFor(r.characterId);return `<article class="ms-op-card"><div><strong>${esc(r.characterName||r.username)}</strong><small>@${esc(r.username)} · ${esc(String(r.memberRole).replace('_',' ').toUpperCase())}${a?` · PEG ${Number(a.balance||0)}`:''}</small></div><div class="ms-op-actions">${r.characterId?`<button type="button" data-crew-view="${esc(r.characterId)}">VER FICHA</button><button type="button" class="approve" data-crew-grant="${esc(r.characterId)}" data-crew-name="${esc(r.characterName)}">CONCEDER PEG</button>`:''}</div></article>`}).join('')}</div>`;
  }
  function requestCards(){
    const rows=pendingRequests();
    if(!rows.length)return '<div class="ms-op-empty">Nenhuma solicitação pendente. Solicitações processadas permanecem registradas no backend, mas saem desta fila operacional.</div>';
    return `<div class="ms-op-list">${rows.map(r=>`<article class="ms-op-card"><div><strong>${esc(r.character_name||r.username||'Solicitante')}</strong><small>@${esc(r.username||'jogador')} · ${esc(r.character_mode||'')} ${r.character_nature?'· '+esc(r.character_nature):''} ${r.character_class?'· '+esc(r.character_class):''}</small></div><div class="ms-op-actions"><button type="button" data-request-view="${esc(r.character_id||'')}">VER FICHA</button><button type="button" class="approve" data-request-accept="${esc(r.id)}">ACEITAR</button><button type="button" class="danger" data-request-reject="${esc(r.id)}">RECUSAR</button></div></article>`).join('')}</div>`;
  }
  function evoTracksFor(characterId){const p=crewState.progression||{};return p.tracksByCharacter?.[String(characterId)]||p.tracks?.filter?.(t=>String(t.character_id)===String(characterId))||[];}
  function evoPendingCount(){const p=crewState.progression||{};return ['evidenceRequests','upgradeRequests','developmentRequests','trainingRequests'].reduce((n,k)=>n+(p[k]||[]).filter(x=>String(x.status||'pending')==='pending').length,0);}
  function evoCharacterCards(){
    const rows=(crewState.roster||[]).filter(r=>String(r.status)==='active'&&r.characterId);
    if(!rows.length)return '<div class="ms-op-empty">Nenhuma ficha vinculada à tripulação.</div>';
    return `<div class="ms-op-list">${rows.map(r=>{const a=accountFor(r.characterId)||{},tracks=evoTracksFor(r.characterId),ready=tracks.filter(t=>String(t.status)==='ready').length,progress=tracks.filter(t=>String(t.status)!=='ready').length,pending=(crewState.progression?.upgradeRequests||[]).filter(x=>String(x.character_id)===String(r.characterId)&&String(x.status||'pending')==='pending').length;return `<article class="ms-op-card"><div><strong>${esc(r.characterName||r.username)}</strong><small>${Number(a.balance||0)} PEG · ${ready} pronta(s) · ${progress} em progresso${pending?` · ${pending} solicitação(ões)`:''}</small></div><div class="ms-op-actions"><button type="button" data-crew-view="${esc(r.characterId)}">VER FICHA</button><button type="button" data-evo-manage="${esc(r.characterId)}">GERENCIAR EVOLUÇÃO</button>${ready?`<button type="button" class="approve" data-evo-direct="${esc(r.characterId)}">CONCEDER EVOLUÇÃO</button>`:''}<button type="button" class="approve" data-crew-grant="${esc(r.characterId)}" data-crew-name="${esc(r.characterName)}">CONCEDER PEG</button></div></article>`}).join('')}</div>`;
  }
  function evoRequestsPane(){
    const p=crewState.progression||{},items=[];
    for(const r of (p.upgradeRequests||[]).filter(x=>String(x.status||'pending')==='pending')){const a=accountFor(r.character_id)||{},cost=Number(r.recommended_cost||0),missing=Math.max(0,cost-Number(a.balance||0));items.push({kind:'upgrade',id:r.id,char:r.character_id,title:`${r.label||'Capacidade'} · ${Number(r.from_rank||0)} → ${Number(r.to_rank||0)}`,detail:`Evolução mecânica · custo ${cost} PEG · saldo ${Number(a.balance||0)}${missing?` · faltam ${missing} PEG`:''}`,note:r.note||''});}
    for(const r of (p.evidenceRequests||[]).filter(x=>String(x.status||'pending')==='pending'))items.push({kind:'evidence',id:r.id,char:r.character_id,title:`${r.label||'Capacidade'} · +${Number(r.successes||0)} sucesso(s)`,detail:`Reconhecimento de prática${r.session_label?' · '+r.session_label:''}`,note:r.note||''});
    for(const r of (p.developmentRequests||[]).filter(x=>String(x.status||'pending')==='pending'))items.push({kind:'development',id:r.id,char:r.character_id,title:`Desenvolvimento · ${String(r.focus_type||'power').toUpperCase()}`,detail:`Mudança autoral focada · ${Number(r.requested_cost||0)} PEG solicitado(s)`,note:r.note||''});
    if(!items.length)return '<div class="ms-op-empty">Nenhuma solicitação de evolução pendente.</div>';
    return `<div class="ms-op-list">${items.map(x=>`<article class="ms-op-card"><div><strong>${esc(x.title)}</strong><small>${esc(x.detail)}${x.note?`<br>${esc(x.note)}`:''}</small></div><div class="ms-op-actions"><button type="button" data-evo-view-history="${esc(x.char)}">VER HISTÓRICO</button><button type="button" class="approve" data-evo-resolve="${esc(x.id)}" data-evo-kind="${esc(x.kind)}" data-evo-approved="1">ACEITAR</button><button type="button" class="danger" data-evo-resolve="${esc(x.id)}" data-evo-kind="${esc(x.kind)}" data-evo-approved="0">RECUSAR</button></div></article>`).join('')}</div>`;
  }
  function evoTrainingPane(){
    const rows=(crewState.progression?.trainingRequests||[]).filter(x=>String(x.status||'pending')==='pending');
    if(!rows.length)return '<div class="ms-op-empty">Nenhum treinamento aguardando validação.</div>';
    const labels={basic:'BÁSICO · CD 13 · +1',practical:'PRÁTICO · CD 18 · +2',difficult:'DIFÍCIL · CD 23 · +3'};
    return `<div class="ms-op-list">${rows.map(r=>`<article class="ms-op-card"><div><strong>${esc(r.label||'Capacidade')} · ${esc(labels[r.training_type]||r.training_type||'TREINO')}</strong><small>${r.session_label?esc(r.session_label)+' · ':''}Ambiente ${Number(r.environment_modifier||0)>=0?'+':''}${Number(r.environment_modifier||0)}${r.note?`<br>${esc(r.note)}`:''}</small></div><div class="ms-op-actions"><button type="button" data-evo-view-history="${esc(r.character_id)}">VER FICHA</button><button type="button" class="approve" data-evo-training="${esc(r.id)}" data-evo-approved="1">APROVAR E ROLAR</button><button type="button" class="danger" data-evo-training="${esc(r.id)}" data-evo-approved="0">RECUSAR</button></div></article>`).join('')}</div>`;
  }
  function evoLedgerPane(){
    const events=crewState.progression?.evolutionEvents||[],tx=crewState.progression?.recentTransactions||crewState.progression?.transactions||[],rows=[...events.map(e=>({date:e.created_at,title:e.event_type||'EVOLUÇÃO',detail:`${e.successes?`${Number(e.successes)} sucesso(s) · `:''}${e.note||''}`})),...tx.slice(0,40).map(t=>({date:t.created_at,title:t.tx_type||'PEG',detail:`${Number(t.amount||0)>0?'+':''}${Number(t.amount||0)} PEG · ${t.reason||''}`}))].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,80);
    return rows.length?`<div class="ms-op-list">${rows.map(r=>`<article class="ms-op-card"><div><strong>${esc(r.title)}</strong><small>${esc(r.detail||'Registro operacional')} · ${esc(r.date?new Date(r.date).toLocaleString('pt-BR'):'')}</small></div></article>`).join('')}</div>`:'<div class="ms-op-empty">O Ledger de evolução ainda não possui registros.</div>';
  }
  function evolutionPane(){
    const wallet=crewState.progression?.wallet||{},tab=crewState.evolutionTab||'characters',pending=evoPendingCount();
    const nav=`<nav class="ms-op-subtabs"><button type="button" data-evo-tab="characters" class="${tab==='characters'?'active':''}">PERSONAGENS</button><button type="button" data-evo-tab="requests" class="${tab==='requests'?'active':''}">SOLICITAÇÕES${pending?` <span class="ms-op-badge">${pending}</span>`:''}</button><button type="button" data-evo-tab="training" class="${tab==='training'?'active':''}">TREINAMENTOS</button><button type="button" data-evo-tab="ledger" class="${tab==='ledger'?'active':''}">LEDGER</button></nav>`;
    let content='';
    if(tab==='characters')content=`<div class="ms-op-evolution"><section class="ms-op-panel"><h3>RESERVA DA MESA</h3><div class="ms-op-summary"><span class="ms-op-chip">Disponível <b>${Number(wallet.balance||0)} PEG</b></span><span class="ms-op-chip">Comprado <b>${Number(wallet.lifetime_purchased||0)}</b></span><span class="ms-op-chip">Distribuído <b>${Number(wallet.lifetime_distributed||0)}</b></span></div><div class="ms-op-form"><label>Comprar com SoulDrakma<input data-buy-peg type="number" min="1" max="9999" value="10"></label><button type="button" class="ms-op-primary" data-buy-peg-btn>COMPRAR PEG</button></div><small class="ms-op-note">SoulDrakma é debitada e a reserva é creditada pelo mesmo contrato atômico.</small></section><section class="ms-op-panel"><h3>EVOLUÇÃO DA TRIPULAÇÃO</h3><p class="ms-op-note">Sucessos tornam a trilha elegível; PEG efetiva o avanço. Gerencie cada ficha sem abrir o editor completo.</p>${evoCharacterCards()}</section></div>`;
    else if(tab==='requests')content=evoRequestsPane();
    else if(tab==='training')content=evoTrainingPane();
    else content=evoLedgerPane();
    return nav+content;
  }
  function renderCrew(){
    const modal=ensureCrewCenter(),body=modal.querySelector('[data-crew-body]');setActiveTab();updateCrewCounter();
    const table=crewState.table||context().table||{};
    const top=`<div class="ms-op-summary"><span class="ms-op-chip">Mesa <b>${esc(table.name||'Fenda')}</b></span><span class="ms-op-chip">Participantes <b>${crewState.roster.filter(x=>x.status==='active').length}</b></span><span class="ms-op-chip">Ingressos <b>${pendingRequests().length}</b></span>${crewState.tab==='evolution'?`<span class="ms-op-chip">Evolução pendente <b>${evoPendingCount()}</b></span>`:''}</div>`;
    body.innerHTML=top+(crewState.tab==='requests'?requestCards():crewState.tab==='evolution'?evolutionPane():participantCards());
    bindCrewActions(body);
  }
  function bindCrewActions(root){
    root.querySelectorAll('[data-crew-view],[data-request-view]').forEach(b=>b.onclick=()=>{const id=b.dataset.crewView||b.dataset.requestView;if(id)window.msOpenCharacterViewer?.(id,{tableId:crewState.table?.id,source:'crew-center'});});
    root.querySelectorAll('[data-crew-grant]').forEach(b=>b.onclick=()=>grantPeg(b.dataset.crewGrant,b.dataset.crewName));
    root.querySelectorAll('[data-request-accept]').forEach(b=>b.onclick=()=>resolveRequest(b.dataset.requestAccept,true));
    root.querySelectorAll('[data-request-reject]').forEach(b=>b.onclick=()=>resolveRequest(b.dataset.requestReject,false));
    root.querySelector('[data-buy-peg-btn]')?.addEventListener('click',buyPeg);
    root.querySelectorAll('[data-evo-tab]').forEach(b=>b.onclick=()=>{crewState.evolutionTab=b.dataset.evoTab;renderCrew()});
    root.querySelectorAll('[data-evo-manage],[data-evo-view-history]').forEach(b=>b.onclick=()=>{const id=b.dataset.evoManage||b.dataset.evoViewHistory;if(id)window.MS_PROGRESSION?.openEvolutionForCharacter?.(id,crewState.table?.id)});
    root.querySelectorAll('[data-evo-resolve]').forEach(b=>b.onclick=()=>resolveEvolutionRequest(b.dataset.evoKind,b.dataset.evoResolve,b.dataset.evoApproved==='1'));
    root.querySelectorAll('[data-evo-training]').forEach(b=>b.onclick=()=>resolveTraining(b.dataset.evoTraining,b.dataset.evoApproved==='1'));
    root.querySelectorAll('[data-evo-direct]').forEach(b=>b.onclick=()=>directGrantEvolution(b.dataset.evoDirect));
  }
  async function resolveEvolutionRequest(kind,id,approved){
    if(!window.MS_EVOLUTION_BACKEND||!id)return;const reason=String(prompt(approved?'Observação da decisão (opcional):':'Motivo da recusa:','')||'');
    try{
      if(kind==='evidence')await window.MS_EVOLUTION_BACKEND.resolveEvidence(id,approved,reason);
      else if(kind==='upgrade'){
        const req=(crewState.progression?.upgradeRequests||[]).find(x=>String(x.id)===String(id)),acc=accountFor(req?.character_id)||{},cost=Number(req?.recommended_cost||0),missing=Math.max(0,cost-Number(acc.balance||0));let autoFund=false;
        if(approved&&missing>0){const wallet=crewState.progression?.wallet||{};if(Number(wallet.balance||0)<missing)throw new Error(`A ficha precisa de ${missing} PEG adicionais, mas a reserva da Mesa possui ${Number(wallet.balance||0)}.`);autoFund=confirm(`A ficha possui ${Number(acc.balance||0)} PEG e precisa de ${cost}. Transferir automaticamente ${missing} PEG da reserva da Mesa e aprovar a evolução?`);if(!autoFund)return;}
        await window.MS_EVOLUTION_BACKEND.resolveUpgrade(id,approved,null,reason,autoFund);
      }else if(kind==='development')await window.MS_EVOLUTION_BACKEND.resolveDevelopment(id,approved,null,reason);
      toast(approved?'Solicitação processada.':'Solicitação recusada.',approved?'success':'info');await loadCrew(true)
    }catch(error){toast(errorText(error),'error')}
  }
  async function directGrantEvolution(characterId){
    if(!characterId||!window.MS_EVOLUTION_BACKEND)return;const pendingIds=new Set((crewState.progression?.upgradeRequests||[]).filter(x=>String(x.status||'pending')==='pending').map(x=>String(x.track_id))),tracks=evoTracksFor(characterId).filter(t=>String(t.status)==='ready'&&!pendingIds.has(String(t.id)));
    if(!tracks.length)return toast('Não há trilhas prontas sem solicitação pendente. Use SOLICITAÇÕES para processar pedidos já enviados.','info');
    const menu=tracks.map((t,i)=>`${i+1}. ${t.label} · ${Number(t.current_rank||0)} → ${Number(t.current_rank||0)+1}`).join('\n'),choice=Number(prompt(`Qual evolução conceder?\n${menu}`,'1'))-1;if(!Number.isInteger(choice)||choice<0||choice>=tracks.length)return;const t=tracks[choice];
    try{const raw=await svc()?.Characters?.view?.(characterId,crewState.table?.id),row=unwrap(raw)||{},cost=Number(window.MS_EVOLUTION_BACKEND.costFor(row,t.capability_type,Number(t.current_rank||0)+1)),acc=accountFor(characterId)||{},missing=Math.max(0,cost-Number(acc.balance||0));let autoFund=false;if(missing>0){const wallet=crewState.progression?.wallet||{};if(Number(wallet.balance||0)<missing)throw new Error(`Faltam ${missing} PEG e a reserva da Mesa possui apenas ${Number(wallet.balance||0)}.`);autoFund=confirm(`Esta evolução custa ${cost} PEG. Transferir automaticamente os ${missing} PEG faltantes da reserva da Mesa?`);if(!autoFund)return}const reason=String(prompt('Motivo da concessão de evolução:','Concessão direta do Mestre')||'').trim();if(!reason)return;const out=await window.MS_EVOLUTION_BACKEND.grantUpgrade(crewState.table.id,characterId,t.capability_type,t.capability_key,autoFund,reason);toast(`${t.label} evoluiu para graduação ${Number(t.current_rank||0)+1}.${Number(out?.funded_missing||0)>0?` ${Number(out.funded_missing)} PEG foram transferidos da reserva.`:''}`,'success');await loadCrew(true)}catch(error){toast(errorText(error),'error')}
  }
  async function resolveTraining(id,approved){
    if(!window.MS_EVOLUTION_BACKEND||!id)return;const reason=String(prompt(approved?'Observação do treinamento (opcional):':'Motivo da recusa:','')||'');
    try{const out=await window.MS_EVOLUTION_BACKEND.resolveTraining(id,approved,reason);if(approved)toast(out?.success?`Treino bem-sucedido: +${Number(out.awarded_successes||0)} sucesso(s).`:`Treino falhou. ${out?.consequence||'Consequência registrada.'}`,out?.success?'success':'info');else toast('Treinamento recusado.','info');await loadCrew(true)}catch(error){toast(errorText(error),'error')}
  }
  async function resolveRequest(id,approved){
    if(!id||!crewState.table?.id)return;let reason='';if(!approved)reason=prompt('Motivo da recusa (opcional):','')||'';
    try{
      await svc().Games.resolveJoinRequest(id,approved,reason);
      if(approved){await window.msRefreshCurrentVttRoster?.();toast('Participante aprovado e roster atualizado.','success');}else toast('Solicitação recusada.','info');
      await loadCrew(true);
    }catch(error){toast(errorText(error),'error');}
  }
  async function grantPeg(characterId,name='Participante'){
    if(!characterId||!crewState.table?.id)return;
    const amount=Number(prompt(`Quantos PEG conceder a ${name}?`,'5'));if(!Number.isInteger(amount)||amount<=0)return;
    const reason=prompt('Motivo da concessão:','Concessão operacional do Mestre')||'Concessão operacional do Mestre';
    try{await svc().Progression.grant(crewState.table.id,characterId,amount,reason);toast(`${amount} PEG concedidos. A reserva da Mesa foi debitada.`,'success');await loadCrew(true);}catch(error){toast(errorText(error),'error');}
  }
  async function buyPeg(){
    const input=document.querySelector('#ms-crew-center [data-buy-peg]'),points=Number(input?.value||0);if(!Number.isInteger(points)||points<=0)return toast('Informe uma quantidade inteira de PEG.','error');
    try{await svc().Progression.buy(crewState.table.id,points);toast(`${points} PEG comprados com SoulDrakma.`,'success');await loadCrew(true);}catch(error){toast(errorText(error),'error');}
  }
  async function openCrewCenter(){
    if(!manager())return toast('A Central Operacional exige autoridade de Mestre, Co-Mestre ou Arconte.','error');
    const table=context().table;if(!table?.id)return toast('Entre em uma Mesa para abrir a Tripulação.','error');
    try{await window.MS_FEATURES?.ensureProgression?.()}catch(error){return toast(errorText(error),'error')}
    const modal=ensureCrewCenter();modal.classList.add('open');lock(true);crewState.table=clone(table);await loadCrew(false);
  }
  async function refreshCounter(){if(!manager()||!context().table?.id)return;try{const tableId=context().table.id,[requests,progression]=await Promise.all([svc()?.Games?.joinRequests?.(tableId),svc()?.Progression?.state?.(tableId)]);crewState.requests=unwrap(requests)||[];crewState.progression=unwrap(progression)||crewState.progression;updateCrewCounter();if(document.getElementById('ms-crew-center')?.classList.contains('open'))renderCrew();}catch(_){}}
  function startPolling(){clearInterval(pollTimer);if(manager()&&context().table?.id){refreshCounter();pollTimer=setInterval(refreshCounter,8000);}}
  function stopPolling(){clearInterval(pollTimer);pollTimer=null;}

  function createFabricLite(){
    if(window.fabric)return window.fabric;
    class FObject{
      constructor(props={}){Object.assign(this,{type:'object',left:0,top:0,scaleX:1,scaleY:1,angle:0,visible:true,selectable:true,evented:true,originX:'left',originY:'top'},props);}
      set(a,b){if(typeof a==='string')this[a]=b;else Object.assign(this,a||{});return this;}
      toObject(extra=[]){const skip=new Set(['canvas','_element','clipPath']);const out={};Object.keys(this).forEach(k=>{if(!skip.has(k)&&typeof this[k]!=='function')out[k]=this[k];});for(const k of extra||[])if(this[k]!==undefined)out[k]=this[k];return out;}
      scaleToWidth(w){this.scaleX=w/Math.max(1,Number(this.width||this.radius*2||1));return this;}
      scaleToHeight(h){this.scaleY=h/Math.max(1,Number(this.height||this.radius*2||1));return this;}
    }
    class Line extends FObject{constructor(points=[0,0,0,0],p={}){super(p);this.type='line';[this.x1,this.y1,this.x2,this.y2]=points;}}
    class Circle extends FObject{constructor(p={}){super(p);this.type='circle';this.radius=Number(p.radius||0);this.width=this.radius*2;this.height=this.radius*2;}}
    class Rect extends FObject{constructor(p={}){super(p);this.type='rect';this.width=Number(p.width||0);this.height=Number(p.height||0);}}
    class Triangle extends Rect{constructor(p={}){super(p);this.type='triangle';}}
    class TextObj extends FObject{constructor(text='',p={}){super(p);this.type='text';this.text=String(text);this.fontSize=Number(p.fontSize||14);}}
    class Shadow{constructor(p={}){Object.assign(this,p);}}
    class Group extends FObject{constructor(objects=[],p={}){super(p);this.type='group';this._objects=objects;this.width=Number(p.width||60);this.height=Number(p.height||70);}toObject(extra=[]){return {...super.toObject(extra),objects:this._objects.map(o=>o.toObject?o.toObject(extra):o)};}}
    class ImageObj extends FObject{constructor(el=null,p={}){super(p);this.type='image';this._element=el;this.width=Number(p.width||el?.naturalWidth||el?.width||50);this.height=Number(p.height||el?.naturalHeight||el?.height||50);}}
    ImageObj.fromURL=function(url,cb,_opts){if(!url){cb?.(null);return;}const im=new Image();im.onload=()=>cb?.(new ImageObj(im));im.onerror=()=>cb?.(null);im.src=url;};
    function revive(o={}){const p={...o};switch(String(o.type||'')){case'line':return new Line([o.x1,o.y1,o.x2,o.y2],p);case'circle':return new Circle(p);case'rect':return new Rect(p);case'triangle':return new Triangle(p);case'text':return new TextObj(o.text,p);case'group':return new Group((o.objects||[]).map(revive),p);case'image':return new ImageObj(null,p);default:return new FObject(p);}}
    class CanvasLite{
      constructor(target,opt={}){this.lowerCanvasEl=typeof target==='string'?document.getElementById(target):target;this.contextContainer=this.lowerCanvasEl?.getContext?.('2d')||null;this.width=Number(opt.width||this.lowerCanvasEl?.width||300);this.height=Number(opt.height||this.lowerCanvasEl?.height||150);this.selection=opt.selection!==false;this.isDrawingMode=false;this.skipTargetFind=false;this._objects=[];this._events={};this._active=null;this.backgroundImage=null;this.setWidth(this.width);this.setHeight(this.height);this._bindPointer();}
      on(name,fn){(this._events[name]||(this._events[name]=[])).push(fn);return this;} _fire(n,p){(this._events[n]||[]).forEach(fn=>{try{fn(p||{})}catch(e){console.warn('[Fabric Lite]',e)}});}
      add(...objs){objs.filter(Boolean).forEach(o=>{o.canvas=this;this._objects.push(o);this._fire('object:added',{target:o});});this.requestRenderAll();return this;}
      remove(o){const i=this._objects.indexOf(o);if(i>=0){this._objects.splice(i,1);this._fire('object:removed',{target:o});if(this._active===o)this._active=null;this.requestRenderAll();}return this;}
      getObjects(type){return type?this._objects.filter(o=>o.type===String(type).toLowerCase()):this._objects.slice();}
      sendToBack(...objs){for(const o of objs.reverse()){const i=this._objects.indexOf(o);if(i>=0){this._objects.splice(i,1);this._objects.unshift(o);}}this.requestRenderAll();}
      setActiveObject(o){this._active=o;return this;}getActiveObject(){return this._active;}discardActiveObject(){this._active=null;return this;}
      setWidth(v){this.width=Number(v||0);if(this.lowerCanvasEl)this.lowerCanvasEl.width=this.width;return this;}setHeight(v){this.height=Number(v||0);if(this.lowerCanvasEl)this.lowerCanvasEl.height=this.height;return this;}calcOffset(){return this;}
      getPointer(e={}){const r=this.lowerCanvasEl?.getBoundingClientRect?.()||{left:0,top:0,width:this.width,height:this.height};return{x:(Number(e.clientX||0)-r.left)*(this.width/(r.width||this.width||1)),y:(Number(e.clientY||0)-r.top)*(this.height/(r.height||this.height||1))};}
      setBackgroundImage(img,cb,opts={}){if(img)img.set?.(opts);this.backgroundImage=img;this.requestRenderAll();cb?.();return this;}
      toJSON(extra=[]){return{version:'fabric-lite-1',objects:this._objects.map(o=>o.toObject(extra))};}
      loadFromJSON(data,cb){this._objects=(data?.objects||[]).map(revive);this._objects.forEach(o=>o.canvas=this);this.requestRenderAll();cb?.();return this;}
      requestRenderAll(){return this.renderAll();}
      renderAll(){const c=this.contextContainer;if(!c)return this;c.clearRect(0,0,this.width,this.height);if(this.backgroundImage)this._draw(this.backgroundImage,c);for(const o of this._objects)if(o.visible!==false)this._draw(o,c);return this;}
      _draw(o,c){c.save();c.translate(Number(o.left||0),Number(o.top||0));if(o.angle)c.rotate(Number(o.angle)*Math.PI/180);c.scale(Number(o.scaleX||1),Number(o.scaleY||1));c.globalAlpha=Number(o.opacity??1);c.strokeStyle=o.stroke||'#777';c.fillStyle=o.fill||'transparent';c.lineWidth=Number(o.strokeWidth||1);
        if(o.type==='line'){c.beginPath();c.moveTo(Number(o.x1||0),Number(o.y1||0));c.lineTo(Number(o.x2||0),Number(o.y2||0));c.stroke();}
        else if(o.type==='circle'){c.beginPath();c.arc(Number(o.radius||0),Number(o.radius||0),Number(o.radius||0),0,Math.PI*2);if(o.fill&&o.fill!=='transparent')c.fill();if(o.stroke)c.stroke();}
        else if(o.type==='rect'){if(o.fill&&o.fill!=='transparent')c.fillRect(0,0,Number(o.width||0),Number(o.height||0));if(o.stroke)c.strokeRect(0,0,Number(o.width||0),Number(o.height||0));}
        else if(o.type==='triangle'){c.beginPath();c.moveTo(Number(o.width||0)/2,0);c.lineTo(Number(o.width||0),Number(o.height||0));c.lineTo(0,Number(o.height||0));c.closePath();if(o.fill&&o.fill!=='transparent')c.fill();if(o.stroke)c.stroke();}
        else if(o.type==='text'){c.font=`${Number(o.fontSize||14)}px sans-serif`;c.fillStyle=o.fill||'#fff';c.fillText(String(o.text||''),0,Number(o.fontSize||14));}
        else if(o.type==='image'&&o._element){try{c.drawImage(o._element,0,0,Number(o.width||50),Number(o.height||50));}catch(_){}}
        else if(o.type==='group'){for(const ch of o._objects||[])this._draw(ch,c);}
        c.restore();}
      _hit(o,p){if(!o||o.visible===false||o.selectable===false)return false;const w=Number(o.width||o.radius*2||60)*Number(o.scaleX||1),h=Number(o.height||o.radius*2||60)*Number(o.scaleY||1);return p.x>=Number(o.left||0)&&p.x<=Number(o.left||0)+w&&p.y>=Number(o.top||0)&&p.y<=Number(o.top||0)+h;}
      _bindPointer(){const el=this.lowerCanvasEl;if(!el?.addEventListener)return;let drag=null,start=null,origin=null;el.addEventListener('pointerdown',e=>{const p=this.getPointer(e);this._fire('mouse:down',{e,pointer:p});if(this.skipTargetFind)return;drag=[...this._objects].reverse().find(o=>this._hit(o,p));if(drag){this._active=drag;start=p;origin={left:Number(drag.left||0),top:Number(drag.top||0)};}});el.addEventListener('pointermove',e=>{const p=this.getPointer(e);this._fire('mouse:move',{e,pointer:p});if(drag&&start){const before={left:Number(drag.left||0),top:Number(drag.top||0)};drag.left=origin.left+p.x-start.x;drag.top=origin.top+p.y-start.y;this._fire('object:moving',{target:drag,transform:{original:before}});this.requestRenderAll();}});const up=e=>{this._fire('mouse:up',{e});if(drag)this._fire('object:modified',{target:drag});drag=null;start=null;origin=null;};el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);}
    }
    const lite={version:'lite-1.0',Canvas:CanvasLite,Object:FObject,Line,Circle,Rect,Triangle,Text:TextObj,Group,Image:ImageObj,Shadow,util:{enlivenObjects:(rows,cb)=>cb?.((rows||[]).map(revive))},__msLite:true};window.fabric=lite;return lite;
  }

  function bindRuntime(){
    mountGlobalSheetsButton();
    window.MS_PLATFORM?.on?.('vtt:entered',startPolling);
    window.MS_PLATFORM?.on?.('vtt:left',()=>{stopPolling();closeCrewCenter();crewState.table=null;});
    window.MS_PLATFORM?.on?.('table:roster-refreshed',()=>{if(document.getElementById('ms-crew-center')?.classList.contains('open'))loadCrew(true);});
    window.addEventListener('ms:offline-data',()=>{if(manager()&&context().table?.id)refreshCounter();});
    document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(document.getElementById('ms-character-viewer')?.classList.contains('open'))return;closeCrewCenter();closeQuickSheets();});
    if(document.getElementById('screen-vtt')?.classList.contains('active'))startPolling();
  }

  window.msOpenQuickSheets=openQuickSheets;
  window.msOpenCrewCenter=openCrewCenter;
  window.MS_OPERATIONAL_CONTROL=Object.freeze({version:'2.10.1',openQuickSheets,openCrewCenter,loadCrew,refreshCounter,createFabricLite,getState:()=>clone(crewState)});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindRuntime,{once:true});else bindRuntime();
})();
