/* Mundos Sombrios — Ancoragem V3 / V2.8.1
 * Lobby canônico: table_members/summaries definem associação; participants é legado.
 */
(function(){
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const accountRole=()=>String(window.currentUser?.role||'').toLowerCase();
  const isAdmin=()=>accountRole()==='admin';
  const canForge=()=>['mestre','admin'].includes(accountRole());
  const room=()=>document.getElementById('ancoragem-gm-tab');
  const all=()=>Array.isArray(window.allTablesDB)?window.allTablesDB:(typeof allTablesDB!=='undefined'&&Array.isArray(allTablesDB)?allTablesDB:[]);
  const memberRole=t=>String(t?.myMemberRole||t?.my_member_role||'').toLowerCase();
  const isOwner=t=>isAdmin()||!!t?.isOwner||!!t?.is_owner||String(t?.ownerId||t?.owner_id||'')===String(window.currentUser?.id||'');
  const canManage=t=>isOwner(t)||['mestre','co_mestre'].includes(memberRole(t));
  const managed=()=>all().filter(canManage);
  const joined=()=>all().filter(t=>t.status!=='archived'&&!canManage(t)&&!!memberRole(t));
  const canUseGmLobby=()=>canForge()||managed().length>0;
  function myCharacter(table){const id=table?.myCharacterId||table?.my_character_id;if(!id)return null;return (window.msGetCurrentCharacters?.()||[]).find(c=>String(c.id)===String(id))||null;}
  const modeLabel=m=>m==='ocultatun'?'OCULTATUN · ECOS':m==='hybrid'?'HÍBRIDA · ÊXODO + OCULTATUN':'ÊXODO · ASSIMILAÇÃO';
  function syncGmTab(){const tab=document.getElementById('tab-btn-gm');if(tab)tab.style.display=canUseGmLobby()?'inline-block':'none';}

  function renderPlayerConnections(){
    const root=document.getElementById('player-tables-list');if(!root)return;
    const rows=joined();
    root.className='player-fenda-grid';
    root.innerHTML=rows.length?rows.map(t=>{
      const ch=myCharacter(t),mode=String(t.gameMode||t.game_mode||'exodo').toLowerCase(),modeClass=['exodo','ocultatun','hybrid'].includes(mode)?mode:'exodo';
      return `<article class="player-fenda-card player-fenda-${modeClass}"><div class="player-fenda-art" aria-hidden="true"></div><div class="player-fenda-rune" aria-hidden="true">${modeClass==='ocultatun'?'◉':modeClass==='hybrid'?'◇':'⌬'}</div><div class="player-fenda-main"><small>FENDA VINCULADA · ${esc(modeLabel(mode))}</small><h4>${esc(t.name||'Mesa sem nome')}</h4><p>${esc(t.settings?.description||'Campanha conectada ao Nexo.')}</p><div class="player-fenda-meta"><span>CÓDIGO <b>${esc(t.code||'—')}</b></span><span>${Number(t.activeMembers||0)} MEMBROS</span><span>${ch?`ALMA · ${esc(ch.name)}`:'ALMA VINCULADA'}</span></div></div><div class="player-fenda-actions"><button class="player-fenda-enter" data-player-enter="${esc(t.id)}"><span>ATRAVESSAR</span><b>ENTRAR NA SESSÃO</b></button><button class="danger" data-player-leave="${esc(t.code||'')}">ABANDONAR CAMPANHA</button></div></article>`;
    }).join(''):`<div class="player-fenda-empty"><span aria-hidden="true">∴</span><strong>Nenhuma Fenda vinculada</strong><p>Use “Atravessar o Véu” e informe o código recebido do Mestre para ancorar uma campanha.</p></div>`;
    root.querySelectorAll('[data-player-enter]').forEach(b=>b.onclick=()=>window.enterVTT?.(b.dataset.playerEnter,false));
    root.querySelectorAll('[data-player-leave]').forEach(b=>b.onclick=async()=>{if(await window.leaveJoinedTable?.(b.dataset.playerLeave))await render();});
  }

  async function refreshRemote(silent=false){
    if(!window.currentUser||!window.msHydrateRemoteGameState)return;
    try{await window.msHydrateRemoteGameState();if(!silent)window.MS_PLATFORM?.toast('Ancoragem sincronizada com o servidor.','success');}
    catch(e){if(!silent)window.MS_PLATFORM?.toast(e?.message||'Falha ao sincronizar a Ancoragem.','error');}
  }

  async function render(){
    renderPlayerConnections();syncGmTab();
    if(!canUseGmLobby())return;
    try{await window.MS_FEATURES?.ensureMasterHistory?.();}catch(error){window.MS_PLATFORM?.toast?.('Os registros históricos serão exibidos assim que o acervo carregar.','error');}
    const root=room();if(!root)return;
    const tables=managed();const active=tables.filter(t=>t.status!=='archived');const archived=tables.filter(t=>t.status==='archived');
    const selectedId=String(window.__msMasterRoomTableId||active[0]?.id||archived[0]?.id||'');
    const selected=tables.find(t=>String(t.id)===selectedId)||active[0]||archived[0]||null;if(selected)window.__msMasterRoomTableId=selected.id;
    const memberCount=active.reduce((n,t)=>n+Number(t.activeMembers||0),0);
    const limit=window.MS_SOUL?.tableCapacity?.()??(isAdmin()?Infinity:3);const limitLabel=limit===Infinity?'∞':String(limit);
    const createButton=canForge()?`<button id="mr-create" class="primary">＋ FORJAR NOVA MESA<small>${active.filter(isOwner).length}/${limitLabel} sob propriedade</small></button>`:'';
    root.innerHTML=`<div class="anchor-v3 master-anchor-v3"><header class="anchor-v3-hero"><div><span class="mr-kicker">CENTRO DE ANCORAGEM</span><h2>${isAdmin()?'Comando do Arconte':'Sala dos Mestres'}</h2><p>Campanhas, participantes e sessões conectados a uma única fonte de verdade.</p></div><div class="anchor-v3-role">${isAdmin()?'ARCONTE':'DIREÇÃO'}<small>V2.8.1 · RECRUTAMENTO</small></div></header><section class="anchor-v3-command">${createButton}<button id="mr-refresh">↻ SINCRONIZAR<small>Banco + associação</small></button><button id="mr-player-view">👁 VISÃO DO JOGADOR<small>Campanhas conectadas</small></button></section><section class="anchor-v3-metrics"><article><b>${active.length}</b><span>Fendas dirigidas</span></article><article><b>${memberCount}</b><span>Membros ativos</span></article><article><b>${archived.length}</b><span>Arquivadas</span></article><article><b>${joined().length}</b><span>Conexões como jogador</span></article></section><section class="anchor-v3-registry"><header><div><span class="mr-kicker">REGISTRO OPERACIONAL</span><h3>Mesas sob sua direção</h3></div></header><div class="anchor-v3-list">${active.length?active.map(t=>tableCard(t,selected)).join(''):'<div class="anchor-v3-empty"><strong>Nenhuma Fenda dirigida.</strong></div>'}</div>${archived.length?`<details class="anchor-v3-archive"><summary>ARQUIVO MORTO · ${archived.length}</summary><div class="anchor-v3-list">${archived.map(t=>tableCard(t,selected)).join('')}</div></details>`:''}</section></div>`;
    bind(root);
    if(selected&&selected.status!=='archived'&&typeof window.renderMasterTools==='function'){
      const commandRoot=root.querySelector(`[data-command-host="${CSS.escape(String(selected.id))}"]`),toolsRoot=root.querySelector(`[data-tools-host="${CSS.escape(String(selected.id))}"]`);
      if(toolsRoot)window.renderMasterTools(toolsRoot,selected,{commandRoot});
    }
  }

  function tableCard(t,selected){
    const isSelected=selected&&String(selected.id)===String(t.id),archived=t.status==='archived',id=esc(t.id),owner=isOwner(t),delegated=!owner;
    const authorityLabel=owner?(isAdmin()&&!t.isOwner?'ADMINISTRAÇÃO':'PROPRIETÁRIO'):'CO-MESTRE';
    let actions='';
    if(archived){actions=owner?`<button data-restore="${id}">RESTAURAR</button><button class="danger" data-delete="${id}">DESTRUIR</button>`:'<span class="anchor-v3-readonly">ARQUIVADA · SOMENTE PROPRIETÁRIO/ADM</span>';}
    else {actions=`<button data-prepare="${id}">${isSelected?'OPERAÇÃO ABERTA':'PREPARAR'}</button><button class="primary" data-enter="${id}">ENTRAR AO VIVO</button><button data-recruit="${id}">RECRUTAMENTO</button><button data-invite="${id}">CÓDIGO PRIVADO</button><button data-copy="${esc(t.code)}">COPIAR CÓDIGO</button>${owner?`<button data-archive="${id}">ARQUIVAR</button><button class="danger" data-delete="${id}">EXCLUIR</button>`:''}`;}
    return `<article class="anchor-v3-card ${isSelected?'selected':''} ${archived?'archived':''}"><div class="anchor-v3-sigil">${archived?'◇':'◈'}</div><div class="anchor-v3-main"><small>${archived?'FENDA ARQUIVADA':(isSelected?'OPERAÇÃO SELECIONADA':'FENDA DISPONÍVEL')} · ${esc(authorityLabel)} · ${esc(modeLabel(t.gameMode||t.game_mode))}</small><h4>${esc(t.name||'Mesa sem nome')}</h4><p>${esc(t.settings?.description||'Sem descrição operacional.')}</p><div class="anchor-v3-meta"><span>CÓDIGO <b>${esc(t.code||'—')}</b></span><span>${Number(t.activeMembers||0)} MEMBROS</span><span>${esc(t.settings?.region||'REGIÃO ABERTA')}</span>${delegated?'<span>GESTÃO DELEGADA</span>':''}</div></div><div class="anchor-v3-actions">${actions}</div>${isSelected&&!archived?`<section class="anchor-v3-operation"><nav><button class="active" data-workspace-tab="command">DIREÇÃO DA CAMPANHA</button><button data-workspace-tab="tools">COFRE DO MESTRE</button></nav><div data-workspace-panel="command"><div data-command-host="${id}"></div></div><div data-workspace-panel="tools" hidden><div data-tools-host="${id}"></div></div></section>`:''}</article>`;
  }

  function bind(root){
    root.querySelector('#mr-create')?.addEventListener('click',()=>window.openCreateTableModal?.());
    root.querySelector('#mr-refresh')?.addEventListener('click',async()=>{await refreshRemote();await render();});
    root.querySelector('#mr-player-view')?.addEventListener('click',()=>window.switchAncoragemTab('player'));
    root.querySelectorAll('[data-prepare]').forEach(b=>b.onclick=async()=>{window.__msMasterRoomTableId=b.dataset.prepare;await render();});
    root.querySelectorAll('[data-enter]').forEach(b=>b.onclick=()=>window.enterVTT?.(b.dataset.enter,true));
    root.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>window.copyCode?.(b.dataset.copy));
    root.querySelectorAll('[data-recruit]').forEach(b=>b.onclick=()=>window.MS_TABLE_DIRECTORY?.openRecruitment?.(b.dataset.recruit));
    root.querySelectorAll('[data-invite]').forEach(b=>b.onclick=()=>createInvite(b.dataset.invite));
    root.querySelectorAll('[data-archive]').forEach(b=>b.onclick=()=>archiveTable(b.dataset.archive,true));
    root.querySelectorAll('[data-restore]').forEach(b=>b.onclick=()=>archiveTable(b.dataset.restore,false));
    root.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{const ok=await window.deleteTable?.(b.dataset.delete);if(ok)await render();});
    root.querySelectorAll('[data-workspace-tab]').forEach(btn=>btn.onclick=()=>{const shell=btn.closest('.anchor-v3-operation');shell?.querySelectorAll('[data-workspace-tab]').forEach(x=>x.classList.toggle('active',x===btn));shell?.querySelectorAll('[data-workspace-panel]').forEach(x=>x.hidden=x.dataset.workspacePanel!==btn.dataset.workspaceTab);});
  }
  async function archiveTable(id,archived){try{const confirmed=await window.MS_SERVICES.Games.archive(id,archived);if(!confirmed?.id)throw new Error('O servidor não confirmou a alteração da Fenda.');await refreshRemote(true);window.MS_PLATFORM?.toast(archived?'Mesa arquivada.':'Mesa restaurada.','success');await render();}catch(e){window.MS_PLATFORM?.toast(e?.message||'Não foi possível alterar o arquivo da mesa.','error');}}
  async function createInvite(tableId){try{const data=await window.MS_SERVICES?.Games?.createInvite?.(tableId,null,1);const code=data?.code||data?.invite_code||data;if(code){try{await navigator.clipboard.writeText(String(code))}catch(_){}window.MS_PLATFORM?.toast(`Convite criado e copiado: ${code}`,'success');}}catch(e){window.MS_PLATFORM?.toast(e?.message||'Não foi possível criar o convite.','error');}}

  window.renderPlayerConnections=renderPlayerConnections;window.renderMasterRoom=render;window.renderAncoragem=async function(){await render();if(document.getElementById('ancoragem-directory-tab')?.style.display!=='none')window.MS_TABLE_DIRECTORY?.refresh?.(true);};
  window.switchAncoragemTab=function(tab){
    const player=document.getElementById('ancoragem-player-tab'),gmRoot=document.getElementById('ancoragem-gm-tab'),directory=document.getElementById('ancoragem-directory-tab');
    const gmActive=tab==='gm'&&canUseGmLobby(),dirActive=tab==='directory';
    if(player)player.style.display=(!gmActive&&!dirActive)?'flex':'none';
    if(gmRoot){gmRoot.style.display=gmActive?'flex':'none';if(!gmActive&&!canUseGmLobby())gmRoot.innerHTML='';}
    if(directory)directory.style.display=dirActive?'block':'none';
    document.querySelectorAll('#screen-ancoragem .tab-btn').forEach(btn=>btn.classList.toggle('active',(gmActive&&btn.id==='tab-btn-gm')||(dirActive&&btn.id==='tab-btn-directory')||(!gmActive&&!dirActive&&btn.id==='tab-btn-player')));
    if(dirActive){window.MS_TABLE_DIRECTORY?.activate?.();return;}
    window.MS_TABLE_DIRECTORY?.deactivate?.();if(gmActive)render();else renderPlayerConnections();
  };
  window.msCanUseGmLobby=canUseGmLobby;
  document.addEventListener('DOMContentLoaded',()=>{if(document.getElementById('screen-ancoragem'))render();});
})();
