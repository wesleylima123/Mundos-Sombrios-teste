/* Mesa: Salão, Grid e PEG são janelas independentes; comunicação persistente. */
(function(){
'use strict';
let mounted=false,activeTable=null,activeAsGM=false,livePaused=false,lastHealth={},activeWindow='salon',navigation=0,gridReady=false,gridPromise=null;
const byId=id=>document.getElementById(id);
const role=()=>String(window.currentUser?.role||'jogador').toLowerCase();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
    const root=document.querySelector('.ms-room-initiative');if(!root)return;
    const c=combatState();
    if(!c){root.innerHTML='<div class="ms-room-initiative-empty">O Combat Director será disponibilizado após o contexto da mesa ser carregado.</div>';return;}
    root.innerHTML=`<header><span>INICIATIVA · RODADA ${c.round}</span>${activeAsGM?'<button data-init-add>＋ COMBATENTE</button>':''}</header><div class="ms-room-initiative-list">${c.entries.length?c.entries.map((x,i)=>`<article class="${i===c.active?'active':''}"><strong>${String(i+1).padStart(2,'0')}</strong><div><b>${esc(x.name||'Combatente')}</b><small>PV ${Number.isFinite(Number(x.hp))?Number(x.hp):'—'}${(x.effects||[]).length?' · '+esc((x.effects||[]).map(e=>e.name).join(', ')):''}</small></div><strong>${Number(x.initiative)||0}</strong></article>`).join(''):'<div class="ms-room-initiative-empty">Nenhuma ordem de iniciativa. O Mestre pode adicionar combatentes aqui ou no Combat Director.</div>'}</div>${activeAsGM?'<div class="ms-room-initiative-actions"><button data-init-prev>◀ TURNO</button><button data-init-next>PRÓXIMO ▶</button></div>':''}`;
    root.querySelector('[data-init-add]')?.addEventListener('click',()=>{const name=prompt('Nome do combatente:','');if(!String(name||'').trim())return;const initiative=Number(prompt('Iniciativa:', '10')||0);const hp=Number(prompt('Pontos de Vida:', '0')||0);const activeRef=c.entries[c.active]||null;c.entries.push({name:String(name).trim(),initiative,hp,effects:[],reactionReady:true});c.entries.sort((a,b)=>Number(b.initiative||0)-Number(a.initiative||0));if(activeRef){const ni=c.entries.indexOf(activeRef);if(ni>=0)c.active=ni;}persistCombat();});
    root.querySelector('[data-init-next]')?.addEventListener('click',()=>{if(!c.entries.length)return;c.active++;if(c.active>=c.entries.length){c.active=0;c.round++;for(const x of c.entries){x.reactionReady=true;(x.effects||[]).forEach(e=>e.remaining=Math.max(0,Number(e.remaining||0)-1));x.effects=(x.effects||[]).filter(e=>Number(e.remaining||0)>0);}}persistCombat();});
    root.querySelector('[data-init-prev]')?.addEventListener('click',()=>{if(!c.entries.length)return;c.active--;if(c.active<0){c.active=c.entries.length-1;c.round=Math.max(1,c.round-1);}persistCombat();});
  }


function renderCampaignWindow(){const root=byId('vtt-campaign-root');if(!root||!activeAsGM)return;root.innerHTML='';try{window.MasterCommandCenter?.render?.(root,activeTable);}catch(e){root.textContent='Não foi possível abrir a campanha: '+e.message;}}
function ensureCampaignWindow(){if(!byId('vtt-campaign-window')){const wrap=document.createElement('section');wrap.id='vtt-campaign-window';wrap.className='vtt-floating-window';wrap.style.display='none';wrap.innerHTML='<header class="vtt-window-header"><h2>Campanha em Movimento</h2><button type="button" data-open="vtt-campaign-window">Fechar</button></header><div class="vtt-window-body"><div id="vtt-campaign-root"></div></div>';byId('ms-room-workspace')?.appendChild(wrap);}renderCampaignWindow();}
function workspaceBounds(){const r=byId('ms-room-workspace')?.getBoundingClientRect?.();return r&&r.width>0&&r.height>0?{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}:null;}
function refreshBounds(){const active=!!byId('screen-vtt')?.classList.contains('active');document.body.classList.toggle('ms-workspace-active',active);const r=workspaceBounds();if(!active||!r)return;for(const [k,v] of Object.entries({left:r.left,top:r.top,width:r.width,height:r.height}))document.body.style.setProperty('--ms-work-'+k,v+'px');window.MS_TABLE_WINDOWS?.reflow();window.MS_TABLE_SHEETS?.reflow?.();if(activeWindow==='grid')window.msResizeVttGrid?.();}
async function openWindow(name,{focus=true}={}){
 const next=['salon','grid','peg'].includes(name)?name:'salon',ticket=++navigation;activeWindow=next;
 document.querySelectorAll('[data-room-window]').forEach(el=>{el.hidden=el.dataset.roomWindow!==next;});
 document.querySelectorAll('[data-room-open]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.roomOpen===next)));
 document.querySelectorAll('#ms-room-workspace>.vtt-floating-window').forEach(el=>el.style.display='none');
 for(const id of ['ms-room-director','ms-room-initiative-window']){const el=byId(id);if(el)el.hidden=true;}
 if(focus)document.querySelector('[data-room-window="'+next+'"] h1')?.focus({preventScroll:true});
 requestAnimationFrame(refreshBounds);
 if(next==='salon')window.MS_TABLE_SHEETS?.renderLobby?.();
 if(next==='grid'){if(!gridReady){if(!gridPromise)gridPromise=Promise.resolve(window.initVttGrid?.()).then(ready=>{gridReady=ready===true;}).finally(()=>{gridPromise=null;});await gridPromise;}if(ticket===navigation)window.msResizeVttGrid?.();}
 if(next==='peg'){
  const host=byId('ms-room-peg-content');if(!host)return;if(!host.firstElementChild)host.innerHTML='<p role="status">Abrindo o Arquivo de Evolução…</p>';
  try{await window.MS_FEATURES.ensureOperational();if(ticket!==navigation)return;await window.MS_OPERATIONAL_CONTROL.mountEvolutionWorkspace(host);}
  catch(e){if(ticket===navigation){host.textContent='Não foi possível abrir a evolução. '+e.message;const retry=document.createElement('button');retry.textContent='Tentar novamente';retry.onclick=()=>openWindow('peg');host.appendChild(retry);}}
 }
}
function toggleAuxiliary(id){if(id==='vtt-grid-window'){openWindow('grid');return;}if(['vtt-chat-box','vtt-dice-box'].includes(id)){window.MS_TABLE_WINDOWS?.expand(id);return;}if(id==='vtt-campaign-window'){if(!activeAsGM)return;ensureCampaignWindow();}const el=byId(id);if(!el)return;const open=el.style.display==='none'||!el.style.display;document.querySelectorAll('#ms-room-workspace>.vtt-floating-window').forEach(x=>x.style.display='none');el.style.display=open?'flex':'none';}
function restoreWindows(){window.MS_TABLE_WINDOWS?.restore();window.MS_TABLE_SHEETS?.restore?.();}
function bind(){if(mounted)return;const shell=byId('ms-table-room');if(!shell)return;mounted=true;

 shell.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;try{
  if(b.dataset.roomOpen)await openWindow(b.dataset.roomOpen);
  if(b.dataset.open)toggleAuxiliary(b.dataset.open);
  const a=b.dataset.roomAction;
  if(a==='restore')restoreWindows();if(a==='leave')await call('leaveVTT');
  if(a==='refresh-roster'){await window.MS_FEATURES.ensureOperational();await window.msRefreshCurrentVttRoster?.();window.MS_TABLE_SHEETS?.sync();}
  if(a==='initiative'){const p=byId('ms-room-initiative-window');p.hidden=!p.hidden;if(!p.hidden)renderInitiative();}
  if(activeAsGM){if(a==='director')toggleDirector(true);if(a==='director-close')toggleDirector(false);if(a==='manage'){await window.MS_FEATURES.ensureOperational();await window.msOpenCrewCenter();}if(a==='shield')call('openMasterShield');if(a==='shop')call('openEquipmentShop');if(a==='forge')call('openForgeWindow');if(a==='theme')call('openThemeEditor');if(a==='hp')call('toggleNPCHealthVisibility');if(a==='pause')await setLiveStatus('paused');if(a==='resume')await setLiveStatus('active');if(a==='notice')await sendNotice();}
  if(b.closest('.ms-room-tool-menu'))b.closest('details').open=false;
 }catch(error){window.MS_PLATFORM?.toast?.(error.message,'error');}});
 byId('ms-lobby-search')?.addEventListener('input',()=>window.MS_TABLE_SHEETS?.renderLobby?.());
 if(typeof ResizeObserver==='function')new ResizeObserver(()=>requestAnimationFrame(refreshBounds)).observe(byId('ms-room-workspace'));
 if(typeof MutationObserver==='function')new MutationObserver(()=>requestAnimationFrame(refreshBounds)).observe(byId('screen-vtt'),{attributes:true,attributeFilter:['class']});
 window.addEventListener('resize',refreshBounds);
}
function mount(table,asGM){if(String(table?.id)!==String(activeTable?.id)||activeAsGM!==!!asGM){gridReady=false;byId('ms-room-peg-content')?.replaceChildren();}activeTable=table||null;activeAsGM=!!asGM;livePaused=table?.status==='paused';window.__msTableLivePaused=livePaused;bind();const shell=byId('ms-table-room');if(!shell)return;
 byId('screen-vtt').classList.add('ms-room-active');shell.classList.toggle('is-gm',activeAsGM);shell.querySelectorAll('[data-gm-only]').forEach(x=>x.hidden=!asGM);
 byId('vtt-table-name').textContent=table?.name||'Nova Fenda';shell.querySelector('[data-ms-table-code]').textContent=table?.code&&table.code!=='RASCUNHO'?'CÓDIGO '+table.code:'RASCUNHO NÃO PERSISTIDO';
 shell.querySelector('[data-conductor]').textContent=activeAsGM?(window.currentUser?.username||'Mestre da sessão'):'Mestre da sessão';
 window.MS_TABLE_WINDOWS?.mount(table);window.MS_TABLE_SHEETS?.sync();openWindow('salon',{focus:false});updateDirector();const health=window.MS_TABLE_SESSION?.current?.();lastHealth=health||{};updateHealth(lastHealth);setRealtimeControlsEnabled(canUseRealtime());requestAnimationFrame(refreshBounds);
}
  function canUseRealtime(){return (['synced','connected','SUBSCRIBED'].includes(String(lastHealth.status||''))||!activeTable?.id||String(activeTable.id)==='draft')&&(activeAsGM||!livePaused);}
  function toggleDirector(show){const panel=byId('ms-room-director');if(panel&&activeAsGM)panel.hidden=show===undefined?!panel.hidden:!show;}
  function updateDirector(){window.__msTableLivePaused=livePaused;const shell=byId('ms-table-room'),panel=byId('ms-room-director'),label=panel?.querySelector('[data-director-state]');shell?.classList.toggle('is-paused',livePaused);if(label)label.textContent=livePaused?'SESSÃO PAUSADA':'SESSÃO ATIVA';if(panel){panel.querySelector('[data-room-action="pause"]')?.toggleAttribute('hidden',livePaused);panel.querySelector('[data-room-action="resume"]')?.toggleAttribute('hidden',!livePaused);}setRealtimeControlsEnabled(canUseRealtime());}
  async function setLiveStatus(status){if(!activeAsGM||!activeTable?.id||String(activeTable.id)==='draft')return;try{const row=await window.MS_SERVICES?.Games?.setLiveStatus?.(activeTable.id,status);if(!row?.id)throw new Error('O servidor não confirmou a alteração.');livePaused=status==='paused';activeTable.status=status;updateDirector();window.MS_PLATFORM?.emit?.('table:live-status',{tableId:activeTable.id,status});window.MS_PLATFORM?.toast?.(livePaused?'Sessão pausada para os jogadores.':'Sessão retomada.','success');}catch(e){window.MS_PLATFORM?.toast?.(e?.message||'Não foi possível alterar o estado da sessão.','error');}}
  async function sendNotice(){if(!activeAsGM||!activeTable?.id)return;const input=document.querySelector('[data-director-notice]'),text=String(input?.value||'').trim();if(!text)return;try{await window.MS_TABLE_SESSION?.send?.('master_notice',{message:text});if(input)input.value='';window.MS_PLATFORM?.toast?.('Aviso transmitido à mesa.','success');}catch(e){window.MS_PLATFORM?.toast?.(e?.message||'Aviso não confirmado.','error');}}
  function updateHealth(h){const shell=byId('ms-table-room');if(!shell)return;const label=shell.querySelector('[data-ms-sync-label]'),box=shell.querySelector('[data-ms-sync-label]'),lat=shell.querySelector('[data-ms-latency]');const status=String(h?.status||'offline');const labels={synced:'SINCRONIZADA',connected:'CONECTADA',connecting:'CONECTANDO',offline:'SEM CONEXÃO',idle:'AGUARDANDO'};if(label)label.textContent=window.MS_DB?.offline?'MESA LOCAL':(labels[status]||status.toUpperCase());if(box)box.dataset.status=status;if(lat)lat.textContent=h?.latency?`${Math.round(h.latency)}ms`:'';}
  function setRealtimeControlsEnabled(enabled){const input=byId('chat-input');if(input){input.disabled=!enabled;input.placeholder=enabled?'Mensagem...':'Aguardando sincronização da mesa…';}document.querySelectorAll('#vtt-chat-box button[onclick*="sendChatMessage"],#vtt-dice-box button[onclick*="roll3DDice"]').forEach(b=>{b.disabled=!enabled;b.title=enabled?'':'Recurso compartilhado indisponível até a mesa sincronizar.';});}


window.addEventListener('ms:table-shell-refresh',e=>mount(e.detail?.table,e.detail?.asGM));
document.addEventListener('DOMContentLoaded',()=>{bind();const bus=window.MS_PLATFORM;bus?.on?.('table:session-health',h=>{lastHealth=h||{};updateHealth(lastHealth);setRealtimeControlsEnabled(canUseRealtime());window.MS_TABLE_SHEETS?.renderLobby?.();});bus?.on?.('table:live-status',e=>{if(String(e?.tableId)!==String(activeTable?.id))return;livePaused=e.status==='paused';updateDirector();});bus?.on?.('vtt:left',()=>{navigation++;activeWindow='salon';gridReady=false;window.MS_TABLE_WINDOWS?.reset();document.body.classList.remove('ms-workspace-active');});});
window.MS_TABLE_SHELL=Object.freeze({version:'3.0.0',mount,openWindow,toggleAuxiliary,workspaceBounds,refreshBounds,restoreWindows,renderInitiative,ensureCampaignWindow,renderCampaignWindow,getActiveWindow:()=>activeWindow});
})();
