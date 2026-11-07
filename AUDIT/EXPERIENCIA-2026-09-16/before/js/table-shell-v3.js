/* Mundos Sombrios — Mesa ao Vivo V3 · Fenda Studio V2.8.6 */
(function(){
  'use strict';
  let mounted=false,activeTable=null,activeAsGM=false,livePaused=false,lastHealth={};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const role=()=>String(window.currentUser?.role||'jogador').toLowerCase();
  const byId=id=>document.getElementById(id);
  const call=(name,...args)=>typeof window[name]==='function'?window[name](...args):undefined;

  function combatState(){
    const wb=window.MasterTools?.getWorkbench?.();
    if(!wb)return null;
    wb.combat=wb.combat||{round:1,active:0,entries:[]};
    wb.combat.entries=Array.isArray(wb.combat.entries)?wb.combat.entries:[];
    wb.combat.round=Math.max(1,Number(wb.combat.round)||1);
    wb.combat.active=Math.max(0,Math.min(Number(wb.combat.active)||0,Math.max(0,wb.combat.entries.length-1)));
    return wb.combat;
  }
  function persistCombat(){try{window.MasterTools?.persistWorkbench?.();}catch(_){} renderInitiative();}
  function renderInitiative(){
    const root=document.querySelector('.ms-table-v3-initiative');if(!root)return;
    const c=combatState();
    if(!c){root.innerHTML='<div class="ms-table-v3-initiative-empty">O Combat Director será disponibilizado após o contexto da mesa ser carregado.</div>';return;}
    root.innerHTML=`<header><span>INICIATIVA · RODADA ${c.round}</span>${activeAsGM?'<button data-init-add>＋ COMBATENTE</button>':''}</header><div class="ms-table-v3-initiative-list">${c.entries.length?c.entries.map((x,i)=>`<article class="${i===c.active?'active':''}"><strong>${String(i+1).padStart(2,'0')}</strong><div><b>${esc(x.name||'Combatente')}</b><small>PV ${Number.isFinite(Number(x.hp))?Number(x.hp):'—'}${(x.effects||[]).length?' · '+esc((x.effects||[]).map(e=>e.name).join(', ')):''}</small></div><strong>${Number(x.initiative)||0}</strong></article>`).join(''):'<div class="ms-table-v3-initiative-empty">Nenhuma ordem de iniciativa. O Mestre pode adicionar combatentes aqui ou no Combat Director.</div>'}</div>${activeAsGM?'<div class="ms-table-v3-initiative-actions"><button data-init-prev>◀ TURNO</button><button data-init-next>PRÓXIMO ▶</button></div>':''}`;
    root.querySelector('[data-init-add]')?.addEventListener('click',()=>{const name=prompt('Nome do combatente:','');if(!String(name||'').trim())return;const initiative=Number(prompt('Iniciativa:', '10')||0);const hp=Number(prompt('Pontos de Vida:', '0')||0);c.entries.push({name:String(name).trim(),initiative,hp,effects:[],reactionReady:true});c.entries.sort((a,b)=>Number(b.initiative||0)-Number(a.initiative||0));persistCombat();});
    root.querySelector('[data-init-next]')?.addEventListener('click',()=>{if(!c.entries.length)return;c.active++;if(c.active>=c.entries.length){c.active=0;c.round++;for(const x of c.entries){x.reactionReady=true;(x.effects||[]).forEach(e=>e.remaining=Math.max(0,Number(e.remaining||0)-1));x.effects=(x.effects||[]).filter(e=>Number(e.remaining||0)>0);}}persistCombat();});
    root.querySelector('[data-init-prev]')?.addEventListener('click',()=>{if(!c.entries.length)return;c.active--;if(c.active<0){c.active=c.entries.length-1;c.round=Math.max(1,c.round-1);}persistCombat();});
  }

  function renderCampaignWindow(){
    const root=byId('vtt-campaign-root');
    if(!root||!activeAsGM)return;
    root.innerHTML='';
    try{
      window.MasterCommandCenter?.render?.(root,activeTable||window.currentTableData||null);
    }catch(e){
      root.innerHTML=`<div class="gm-empty">Falha ao carregar campanha: ${esc(e?.message||e)}</div>`;
    }
  }

  function ensureCampaignWindow(){
    const shell=byId('ms-table-v3');if(!shell)return;
    const nav=shell.querySelector('.ms-table-v3-nav');
    let btn=nav?.querySelector('[data-open="vtt-campaign-window"]');
    if(nav&&!btn){
      btn=document.createElement('button');btn.type='button';btn.className='gm-only-v3';btn.dataset.open='vtt-campaign-window';btn.textContent='CAMPANHA';
      nav.insertBefore(btn,nav.querySelector('[data-action="director"]')||null);
    }
    if(btn)btn.hidden=!activeAsGM;
    const overlays=shell.querySelector('.ms-table-v3-overlays')||shell;
    if(!byId('vtt-campaign-window')){
      const wrap=document.createElement('div');wrap.id='vtt-campaign-window';wrap.className='vtt-floating-window';
      wrap.innerHTML='<div class="vtt-window-header" id="campaign-window-header"><span class="vtt-font">Campanha em Movimento</span><button class="win-close-btn" type="button" onclick="toggleVttWindow(\'vtt-campaign-window\')">X</button></div><div class="vtt-window-body"><div id="vtt-campaign-root"></div></div>';
      overlays.appendChild(wrap);
      try{window.dragElement?.(wrap,'campaign-window-header');}catch(_){}
    }
    renderCampaignWindow();
  }

  function setRightPane(name){
    document.querySelectorAll('.ms-table-v3-right-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.rightPane===name));
    document.querySelectorAll('.ms-table-v3-pane').forEach(p=>p.hidden=p.dataset.rightPane!==name);
    if(name==='initiative')renderInitiative();
  }
  function setGridButtonState(){
    const root=document.getElementById('ms-table-v3');if(!root)return;
    root.querySelector('[data-grid-action="grid"]')?.classList.toggle('active',window.__msGridVisible!==false);
    root.querySelector('[data-grid-action="snap"]')?.classList.toggle('active',!!window.__msGridSnap);
    root.querySelector('[data-grid-action="ruler"]')?.classList.toggle('active',!!window.__msRulerActive);
  }
  function runGridAction(action){
    if(action==='select')call('canvasSetMode','select');
    if(action==='pc')call('canvasAddPCToken');
    if(action==='npc'&&activeAsGM)call('canvasAddNPCToken');
    if(action==='map'&&activeAsGM)byId('grid-bg-upload')?.click();
    if(action==='ruler')call('canvasToggleRuler');
    if(action==='cone')call('canvasAddShape','cone');
    if(action==='line')call('canvasAddShape','line');
    if(action==='radius')call('canvasAddShape','radius');
    if(action==='delete')call('canvasDeleteSelected');
    if(action==='grid')call('canvasToggleGridVisibility');
    if(action==='snap')call('canvasToggleSnapToGrid');
    if(action==='clear')call('canvasClearMeasurements');
    setTimeout(setGridButtonState,0);
  }

  function buildShell(screen){
    const legacyHeader=screen.querySelector('.vtt-header');
    const legacyTitle=byId('vtt-table-name');
    const saveButton=byId('btn-save-table');
    const cards=document.getElementById('vtt-cards-window'),grid=document.getElementById('vtt-grid-window'),chat=document.getElementById('vtt-chat-box'),dice=document.getElementById('vtt-dice-box');
    const quick=byId('vtt-quick-access'),presence=screen.querySelector('.ms-vtt-presence');
    const shell=document.createElement('div');shell.id='ms-table-v3';shell.className='ms-table-v3';
    shell.innerHTML=`<header class="ms-table-v3-head"><div class="ms-table-v3-identity"><span>FENDA ATIVA</span><strong data-ms-table-title>Mesa</strong><small data-ms-table-code>RASCUNHO</small></div><div class="ms-table-v3-health"><i></i><b data-ms-sync-label>CONECTANDO</b><small data-ms-latency></small></div><div class="ms-table-v3-head-actions"></div></header><div class="ms-table-v3-body"><aside class="ms-table-v3-left"><nav class="ms-table-v3-nav"><button data-left-action="stage" class="active">MAPA</button><button data-open="vtt-gallery-window">ARQUIVOS</button><button data-open="vtt-equipment-window">ARSENAL</button><button class="gm-only-v3" data-action="director">DIREÇÃO</button><button class="gm-only-v3" data-action="manage">TRIPULAÇÃO</button><button class="gm-only-v3" data-action="shield">ESCUDO</button><button class="gm-only-v3" data-action="shop">LOJA</button><button class="gm-only-v3" data-action="forge">FORJA</button></nav><section class="ms-table-v3-gridtools"><span>FERRAMENTAS DO GRID</span><button data-grid-action="select">CURSOR</button><button data-grid-action="pc">MEU TOTEM</button><button class="gm-only-v3" data-grid-action="npc">NPC</button><button class="gm-only-v3" data-grid-action="map">MAPA</button><button data-grid-action="grid" class="active">GRADE</button><button data-grid-action="snap">ENCAIXE</button><button data-grid-action="ruler">RÉGUA</button><button data-grid-action="cone">CONE</button><button data-grid-action="line">LINHA</button><button data-grid-action="radius">RAIO</button><button data-grid-action="clear">LIMPAR MEDIDAS</button><button class="danger" data-grid-action="delete">APAGAR SEL.</button><div class="ms-table-v3-gridmeta"><label>ESCALA<input data-grid-scale-proxy type="number" min="0.1" step="0.1" value="1.5"></label><label>PASSO<input data-grid-size-proxy type="number" min="20" max="120" step="5" value="50"></label></div></section><section class="ms-table-v3-cards"></section></aside><main class="ms-table-v3-stage"></main><aside class="ms-table-v3-right"><nav class="ms-table-v3-right-tabs"><button class="active" data-right-pane="chat">CHAT</button><button data-right-pane="dice">DADOS</button><button data-right-pane="initiative">INICIATIVA</button></nav><div class="ms-table-v3-right-stack"><section class="ms-table-v3-pane ms-table-v3-chat" data-right-pane="chat"></section><section class="ms-table-v3-pane ms-table-v3-dice" data-right-pane="dice" hidden></section><section class="ms-table-v3-pane ms-table-v3-roster-pane" data-right-pane="initiative" hidden><div class="ms-table-v3-initiative"></div></section></div><section class="ms-table-v3-telemetry" hidden></section></aside></div><footer class="ms-table-v3-footer"><div data-ms-table-presence></div><div class="ms-table-v3-footer-actions"><button data-action="theme" class="gm-only-v3">TEMA</button><button data-action="hp" class="gm-only-v3">HP NPC</button><button data-action="leave">SAIR DA MESA</button></div></footer><div class="ms-table-v3-overlays"></div><aside class="ms-table-v3-director" hidden><header><span>DIREÇÃO AO VIVO</span><button data-action="director-close">×</button></header><div class="ms-table-v3-director-state"><i></i><strong data-director-state>SESSÃO ATIVA</strong></div><div class="ms-table-v3-director-actions"><button data-action="pause">PAUSAR SESSÃO</button><button data-action="resume">RETOMAR SESSÃO</button><button data-action="manage">GERIR EQUIPE</button><button data-action="shield">ESCUDO DO MESTRE</button></div><label>AVISO GLOBAL<textarea data-director-notice maxlength="400" placeholder="Mensagem para todos na mesa"></textarea></label><button class="primary" data-action="notice">TRANSMITIR AVISO</button></aside>`;
    screen.insertBefore(shell,legacyHeader||screen.firstChild);
    const headActions=shell.querySelector('.ms-table-v3-head-actions');
    if(saveButton)headActions.appendChild(saveButton);
    const leave=document.createElement('button');leave.type='button';leave.className='souls-btn small-btn';leave.textContent='SAIR DA MESA';leave.dataset.action='leave';headActions.appendChild(leave);
    if(legacyTitle){legacyTitle.classList.add('ms-table-v3-legacy-title');shell.querySelector('.ms-table-v3-identity').appendChild(legacyTitle);}
    legacyHeader?.remove();quick?.remove();presence?.remove();
    if(cards)shell.querySelector('.ms-table-v3-cards').appendChild(cards);
    if(grid)shell.querySelector('.ms-table-v3-stage').appendChild(grid);
    if(chat)shell.querySelector('.ms-table-v3-chat').appendChild(chat);
    if(dice)shell.querySelector('.ms-table-v3-dice').appendChild(dice);
    ['vtt-gallery-window','vtt-equipment-window'].forEach(id=>{const n=byId(id);if(n)shell.querySelector('.ms-table-v3-overlays').appendChild(n);});

    shell.addEventListener('click',async e=>{
      const b=e.target.closest('button');if(!b)return;
      if(b.dataset.open)call('toggleVttWindow',b.dataset.open);
      if(b.dataset.rightPane)setRightPane(b.dataset.rightPane);
      if(b.dataset.gridAction)runGridAction(b.dataset.gridAction);
      const a=b.dataset.action;
      if(a==='director')toggleDirector(true);if(a==='director-close')toggleDirector(false);if(a==='manage'){if(typeof window.msOpenCrewCenter==='function')window.msOpenCrewCenter();else if(window.MS_FEATURES?.ensureOperational)window.MS_FEATURES.ensureOperational().then(()=>window.msOpenCrewCenter?.()).catch(()=>call('openManagePlayers'));else call('openManagePlayers');}if(a==='shield')call('openMasterShield');if(a==='shop')call('openEquipmentShop');if(a==='forge')call('openForgeWindow');if(a==='theme')call('openThemeEditor');if(a==='hp')call('toggleNPCHealthVisibility');if(a==='leave')call('leaveVTT');if(a==='pause')await setLiveStatus('paused');if(a==='resume')await setLiveStatus('active');if(a==='notice')await sendNotice();
    });
    const scaleProxy=shell.querySelector('[data-grid-scale-proxy]');
    const sizeProxy=shell.querySelector('[data-grid-size-proxy]');
    scaleProxy?.addEventListener('change',()=>{const real=byId('vtt-grid-scale');if(real){real.value=scaleProxy.value;real.dispatchEvent(new Event('change',{bubbles:true}));}});
    sizeProxy?.addEventListener('change',()=>{window.__msGridSize=Math.max(20,Math.min(120,Number(sizeProxy.value)||50));call('drawGridLines');});
    mounted=true;
  }

  function mount(table,asGM){
    activeTable=table||null;activeAsGM=!!asGM;livePaused=String(table?.status||'active')==='paused';window.__msTableLivePaused=livePaused;
    const screen=byId('screen-vtt');if(!screen)return;
    if(!mounted)buildShell(screen);
    screen.classList.add('ms-table-v3-active');
    const shell=byId('ms-table-v3');if(!shell)return;
    shell.querySelector('[data-ms-table-title]').textContent=table?.name||byId('vtt-table-name')?.textContent||'Mesa';
    shell.querySelector('[data-ms-table-code]').textContent=table?.code&&table.code!=='RASCUNHO'?`CÓDIGO ${table.code}`:'RASCUNHO NÃO PERSISTIDO';
    shell.classList.toggle('is-gm',!!asGM);shell.classList.toggle('is-admin',role()==='admin');shell.classList.toggle('is-paused',livePaused);
    shell.querySelectorAll('.gm-only-v3').forEach(x=>x.hidden=!asGM);
    ensureCampaignWindow();
    if(asGM&&table?.id&&String(table.id)!=='draft')Promise.resolve(window.MS_SERVICES?.Games?.setLiveStatus?.(table.id,'active')).catch(()=>null);
    [document.getElementById('vtt-cards-window'),document.getElementById('vtt-grid-window'),document.getElementById('vtt-chat-box'),document.getElementById('vtt-dice-box')].forEach(n=>{if(n)n.style.display='flex';});
    updateDirector();renderInitiative();setGridButtonState();
    const health=window.MS_TABLE_SESSION?.current?.();if(health){lastHealth=health;updateHealth(health);}
    const tele=shell.querySelector('.ms-table-v3-telemetry');if(tele)tele.hidden=role()!=='admin';if(role()==='admin')renderTelemetry(health||{});
    setRealtimeControlsEnabled(canUseRealtime());
    setTimeout(()=>{try{window.initVttGrid?.();}catch(_){}},40);
  }

  function canUseRealtime(){return (['synced','connected','SUBSCRIBED'].includes(String(lastHealth.status||''))||!activeTable?.id||String(activeTable.id)==='draft')&&(activeAsGM||!livePaused);}
  function toggleDirector(show){const panel=document.querySelector('.ms-table-v3-director');if(panel&&activeAsGM)panel.hidden=show===undefined?!panel.hidden:!show;}
  function updateDirector(){window.__msTableLivePaused=livePaused;const shell=byId('ms-table-v3'),panel=shell?.querySelector('.ms-table-v3-director'),label=panel?.querySelector('[data-director-state]');shell?.classList.toggle('is-paused',livePaused);if(label)label.textContent=livePaused?'SESSÃO PAUSADA':'SESSÃO ATIVA';if(panel){panel.querySelector('[data-action="pause"]')?.toggleAttribute('hidden',livePaused);panel.querySelector('[data-action="resume"]')?.toggleAttribute('hidden',!livePaused);}setRealtimeControlsEnabled(canUseRealtime());}
  async function setLiveStatus(status){if(!activeAsGM||!activeTable?.id||String(activeTable.id)==='draft')return;try{const row=await window.MS_SERVICES?.Games?.setLiveStatus?.(activeTable.id,status);if(!row?.id)throw new Error('O servidor não confirmou a alteração.');livePaused=status==='paused';activeTable.status=status;updateDirector();window.MS_PLATFORM?.emit?.('table:live-status',{tableId:activeTable.id,status});window.MS_PLATFORM?.toast?.(livePaused?'Sessão pausada para os jogadores.':'Sessão retomada.','success');}catch(e){window.MS_PLATFORM?.toast?.(e?.message||'Não foi possível alterar o estado da sessão.','error');}}
  async function sendNotice(){if(!activeAsGM||!activeTable?.id)return;const input=document.querySelector('[data-director-notice]'),text=String(input?.value||'').trim();if(!text)return;try{await window.MS_TABLE_SESSION?.send?.('master_notice',{message:text});if(input)input.value='';window.MS_PLATFORM?.toast?.('Aviso transmitido à mesa.','success');}catch(e){window.MS_PLATFORM?.toast?.(e?.message||'Aviso não confirmado.','error');}}
  function updateHealth(h){const shell=byId('ms-table-v3');if(!shell)return;const label=shell.querySelector('[data-ms-sync-label]'),box=shell.querySelector('.ms-table-v3-health'),lat=shell.querySelector('[data-ms-latency]');const status=String(h?.status||'offline');if(label)label.textContent=status.toUpperCase();if(box)box.dataset.status=status;if(lat)lat.textContent=h?.latency?`${Math.round(h.latency)}ms`:'';}
  function renderTelemetry(h){const box=document.querySelector('.ms-table-v3-telemetry');if(!box||role()!=='admin')return;const p=Object.keys(h.presence||{}).length;box.innerHTML=`<span>DIAGNÓSTICO DO ARCONTE</span><dl><div><dt>Canal</dt><dd>${esc(h.status||'idle')}</dd></div><div><dt>Evento</dt><dd>#${Number(h.lastEventId||0)}</dd></div><div><dt>Fila</dt><dd>${Number(h.pending||0)}</dd></div><div><dt>Reconexões</dt><dd>${Number(h.reconnects||0)}</dd></div><div><dt>Presença</dt><dd>${p}</dd></div><div><dt>Backend</dt><dd>${esc(window.MS_CONFIG?.supabase?.projectRef||'—')}</dd></div></dl>`;}
  function setRealtimeControlsEnabled(enabled){const input=byId('chat-input');if(input){input.disabled=!enabled;input.placeholder=enabled?'Mensagem...':'Aguardando sincronização da mesa…';}document.querySelectorAll('#vtt-chat-box button[onclick*="sendChatMessage"],#vtt-dice-box button[onclick*="roll3DDice"]').forEach(b=>{b.disabled=!enabled;b.title=enabled?'':'Recurso compartilhado indisponível até a mesa sincronizar.';});}

  window.addEventListener('ms:table-shell-refresh',e=>mount(e.detail?.table,e.detail?.asGM));
  document.addEventListener('DOMContentLoaded',()=>{window.MS_PLATFORM?.on?.('table:session-health',h=>{lastHealth=h||{};updateHealth(h);setRealtimeControlsEnabled(canUseRealtime());renderTelemetry(h);});window.MS_PLATFORM?.on?.('table:live-status',e=>{if(activeTable?.id&&String(e?.tableId||'')!==String(activeTable.id))return;livePaused=String(e?.status)==='paused';if(activeTable)activeTable.status=livePaused?'paused':'active';updateDirector();});window.MS_PLATFORM?.on?.('table:cache-updated',()=>renderInitiative());});
  window.MS_TABLE_SHELL=Object.freeze({version:'2.9.0',mount,renderTelemetry,renderInitiative,setRightPane,ensureCampaignWindow,renderCampaignWindow});
})();
