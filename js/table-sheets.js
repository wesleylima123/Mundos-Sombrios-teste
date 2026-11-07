/* Fichas na Mesa: janela de participantes e atalhos móveis, sem estado de ficha duplicado. */
(function(){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const context=()=>window.msGetCurrentTableContext?.()||{};
const idOf=p=>String(p.sourceCharId||p.id||'');
const nodes=new Map();let host=null,scope='',epoch=0,positions={};
function visiblePlayers(c,user){return (c.players||[]).filter(p=>!p.isNPC&&idOf(p)&&(c.asGM||p.isMe||[p.participantUserId,p.userId,p.sourceOwnerId,p.ownerId].some(id=>id!=null&&[user?.id,user?.authUserId].filter(Boolean).map(String).includes(String(id)))));}
function clamp(x,y,w=64,h=64){const r=window.MS_TABLE_SHELL?.workspaceBounds?.();let top=r?r.top+4:document.body.dataset.msEnvironment==='local'||document.body.dataset.msEnvironment==='unavailable'?48:8;try{const active=document.querySelector?.('#ms-room-workspace .ms-room-primary:not([hidden])'),head=active?.querySelector?.(':scope > .vtt-window-header, :scope > .ms-room-window-title'),hr=head?.getBoundingClientRect?.();if(r&&Number.isFinite(hr?.bottom))top=Math.max(top,hr.bottom+8)}catch(_){}const left=r?r.left+4:8,right=r?r.right-4:innerWidth-8,bottom=r?r.bottom-4:innerHeight-8;return {x:Math.max(left,Math.min(Number(x)||left,Math.max(left,right-w))),y:Math.max(top,Math.min(Number(y)||top,Math.max(top,bottom-h)))};}

function store(){try{sessionStorage.setItem('ms-sheet-positions:'+scope,JSON.stringify(positions));}catch(_){}}
function move(el,key,x,y){const p=clamp(x,y,el.offsetWidth||64,el.offsetHeight||64);el.style.left=p.x+'px';el.style.top=p.y+'px';positions[key]=p;return p;}
function draggable(el,handle,key,onClick){let drag=null,suppress=false;
 handle.addEventListener('pointerdown',e=>{if(e.button!==0)return;const r=el.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top,moved:false};handle.setPointerCapture?.(e.pointerId);});
 handle.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>5)drag.moved=true;if(drag.moved){move(el,key,drag.left+dx,drag.top+dy);e.preventDefault();}});
 const end=e=>{if(!drag||e.pointerId!==drag.id)return;suppress=drag.moved;if(drag.moved)store();drag=null;};
 handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
 handle.addEventListener('click',e=>{if(suppress){suppress=false;e.preventDefault();return;}onClick?.();});
 handle.addEventListener('keydown',e=>{const d={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]}[e.key];if(!e.altKey||!d)return;e.preventDefault();const r=el.getBoundingClientRect();move(el,key,r.left+d[0],r.top+d[1]);store();});
}
function ensure(){if(host)return host;host=document.createElement('div');host.id='ms-sheet-floats';host.setAttribute('aria-label','Fichas flutuantes da mesa');document.body.appendChild(host);return host;}
function closeMini(entry){entry.panel.hidden=true;entry.button.setAttribute('aria-expanded','false');}
async function toggle(entry){if(!entry.panel.hidden){closeMini(entry);return;}entry.panel.hidden=false;entry.button.setAttribute('aria-expanded','true');const r=entry.button.getBoundingClientRect();const saved=positions['panel:'+entry.id];move(entry.panel,'panel:'+entry.id,saved?.x??r.right+12,saved?.y??r.top);await fill(entry);}
async function fill(entry){const ticket=++entry.ticket,gen=epoch,c=context();entry.body.innerHTML='<p role="status">Carregando ficha…</p>';
 try{await window.MS_FEATURES.ensureProgression();const response=await window.MS_SERVICES.Characters.view(entry.id,c.table.id);const row=response?.data!==undefined?response.data:response;if(!row||response?.error)throw new Error(response?.error?.message||'Ficha indisponível para esta conta.');
 if(gen!==epoch||ticket!==entry.ticket||!visiblePlayers(context(),window.currentUser).some(p=>idOf(p)===entry.id))return;
 entry.body.innerHTML=window.MS_PROGRESSION.renderSheet(row.payload||row);const bounds=entry.panel.getBoundingClientRect();move(entry.panel,'panel:'+entry.id,bounds.left,bounds.top);entry.panel.querySelector('[data-full]').onclick=()=>window.msOpenCharacterViewer?.(entry.id,{tableId:c.table.id,source:'floating-sheet'});
 }catch(e){if(gen===epoch&&ticket===entry.ticket){entry.body.innerHTML=`<p role="alert">${esc(e?.message||'Não foi possível consultar a ficha.')}</p><button type="button" data-retry>Tentar novamente</button>`;entry.body.querySelector('[data-retry]').onclick=()=>fill(entry);}}
}
function defaultPosition(index){const r=window.MS_TABLE_SHELL?.workspaceBounds?.(),rows=Math.max(1,Math.floor(((r?.height??innerHeight)-96)/68)),raw={x:(r?.right??innerWidth)-78-Math.floor(index/rows)*70,y:(r?.top??80)+12+(index%rows)*68};return clamp(raw.x,raw.y,60,60);}
function add(player,index){const id=idOf(player),button=document.createElement('button'),panel=document.createElement('section');button.type='button';button.className='ms-sheet-orb';button.setAttribute('aria-expanded','false');button.title='Clique para abrir/recolher. Arraste para mover. Alt + setas também move.';
 panel.className='ms-sheet-mini';panel.id='ms-sheet-mini-'+encodeURIComponent(id);panel.hidden=true;panel.setAttribute('role','region');button.setAttribute('aria-controls',panel.id);
 panel.innerHTML='<header><button class="ms-sheet-drag" type="button" title="Arraste ou use Alt + setas">⠿ <span></span></button><button data-close type="button" aria-label="Recolher ficha">×</button></header><p class="ms-sheet-private">SOMENTE SUA VISUALIZAÇÃO · LEITURA</p><div class="ms-sheet-mini-body"></div><footer><button data-refresh type="button">Atualizar</button><button data-full type="button">Abrir ficha completa</button></footer>';
 const entry={id,button,panel,body:panel.querySelector('.ms-sheet-mini-body'),ticket:0};nodes.set(id,entry);ensure().append(button,panel);panel.querySelector('[data-close]').onclick=()=>{closeMini(entry);button.focus();};panel.querySelector('[data-refresh]').onclick=()=>fill(entry);
 draggable(button,button,'orb:'+id,()=>toggle(entry));draggable(panel,panel.querySelector('.ms-sheet-drag'),'panel:'+id);
 const saved=positions['orb:'+id]||defaultPosition(index);move(button,'orb:'+id,saved.x,saved.y);return entry;
}
function reset(){epoch++;nodes.clear();host?.remove();host=null;scope='';}
function sync(){const c=context(),active=!!document.getElementById('screen-vtt')?.classList.contains('active');
 if(!c.table?.id||!window.currentUser){reset();return;}
 const key=String(window.currentUser.id)+':'+String(c.table.id)+':'+String(c.asGM);
 if(scope!==key){reset();scope=key;try{positions=JSON.parse(sessionStorage.getItem('ms-sheet-positions:'+scope)||'{}');}catch(_){positions={};}if(!positions||typeof positions!=='object'||Array.isArray(positions))positions={};}
 const root=ensure();root.hidden=!active;
 const players=visiblePlayers(c,window.currentUser),ids=new Set(players.map(idOf));for(const [id,entry] of nodes){if(!ids.has(id)){entry.ticket++;entry.button.remove();entry.panel.remove();nodes.delete(id);}}
 players.forEach((p,i)=>{const entry=nodes.get(idOf(p))||add(p,i);entry.button.innerHTML='<span class="ms-medallion-face">'+portrait(p)+'</span><span class="ms-medallion-name">'+esc(p.name||'Personagem')+'</span>';entry.button.dataset.world=String(p.mode||'').toLowerCase();entry.button.title=(p.name||'Personagem')+' · Clique para abrir/recolher. Arraste ou use Alt + setas para mover.';entry.button.setAttribute('aria-label',`${p.name||'Personagem'}: abrir ou recolher miniatura`);entry.panel.setAttribute('aria-label','Miniatura de '+(p.name||'personagem'));entry.panel.querySelector('.ms-sheet-drag span').textContent=p.name||'Personagem';});
 renderLobby();
}
function avatarUrl(value){const v=String(value||'');return /^(https?:\/\/|data:image\/(png|jpe?g|webp|gif);base64,|assets\/)/i.test(v)?v:'';}
function portrait(p){const url=avatarUrl(p.avatar);return url?`<img src="${esc(url)}" alt="" loading="lazy">`:`<span aria-hidden="true">${esc(String(p.name||'Alma').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase())}</span>`;}
function formationSlots(players){const pages=Math.max(1,Math.ceil(players.length/10));return Array.from({length:pages},(_,page)=>Array.from({length:10},(_,i)=>players[page*10+i]||null));}
function presenceLabel(player){const presence=window.MS_TABLE_SESSION?.current?.()?.presence||{},ids=[player.participantUserId,player.userId,player.sourceOwnerId].filter(Boolean).map(String);if(player.isMe)return 'Você está na mesa';const values=Object.values(presence).flat();return ids.some(id=>Object.hasOwn(presence,id))||values.some(x=>ids.includes(String(x?.user_id||x?.userId||x?.id||'')))?'Conectado':'Presença não confirmada';}
function renderLobby(){const root=document.getElementById('ms-lobby-cards');if(!root)return;const c=context(),query=(document.getElementById('ms-lobby-search')?.value||'').trim().toLocaleLowerCase('pt-BR');
 const players=(c.players||[]).filter(p=>!p.isNPC),allowed=new Set(visiblePlayers(c,window.currentUser).map(idOf)),shown=players.filter(p=>String(p.name||'').toLocaleLowerCase('pt-BR').includes(query));
 const count=document.getElementById('ms-lobby-count');if(count)count.textContent=players.length+' participante'+(players.length===1?'':'s');
 root.innerHTML=shown.length===0&&query?'<p class="ms-lobby-empty">Nenhum participante corresponde à busca.</p>':formationSlots(shown).map((page,pageIndex)=>`<section class="ms-lobby-formation" aria-label="Formação ${pageIndex+1}">${[page.slice(0,5),page.slice(5,10)].map((team,teamIndex)=>`<div class="ms-lobby-team" aria-label="Ala ${teamIndex+1}">${team.map((p,i)=>p?`<article class="ms-lobby-card" data-lobby-character="${esc(idOf(p))}"><span class="ms-lobby-slot-number">${String(pageIndex*10+teamIndex*5+i+1).padStart(2,'0')}</span><div class="ms-lobby-portrait">${portrait(p)}</div><h2>${esc(p.name||'Alma vinculada')}</h2><p>${esc(p.className||p.nature||'Participante da mesa')}</p><small class="ms-lobby-presence">${esc(presenceLabel(p))}</small>${!p.isRosterOnly&&allowed.has(idOf(p))?`<dl>${Object.entries(p.resources||{}).slice(0,3).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`:'<p class="ms-lobby-private">Ficha privada</p>'}<div class="ms-lobby-card-actions">${allowed.has(idOf(p))?`<button type="button" data-mini="${esc(idOf(p))}">Miniatura</button><button type="button" data-full="${esc(idOf(p))}">Abrir ficha</button>`:'<span>Alma vinculada</span>'}</div></article>`:`<article class="ms-lobby-card is-vacant" aria-label="Posição livre"><span class="ms-lobby-slot-number">${String(pageIndex*10+teamIndex*5+i+1).padStart(2,'0')}</span><div class="ms-lobby-portrait"><span aria-hidden="true">◇</span></div><h2>Uma história por vir</h2><p>Aguardando participante</p></article>`).join('')}</div>${teamIndex===0?'<div class="ms-lobby-divider" aria-hidden="true"><span>◆</span> ALMAS REUNIDAS <span>◆</span></div>':''}`).join('')}</section>`).join('');
 root.querySelectorAll('[data-mini]').forEach(b=>b.onclick=()=>{const e=nodes.get(b.dataset.mini);if(e)toggle(e);});
 root.querySelectorAll('[data-full]').forEach(b=>b.onclick=async()=>{try{await window.MS_FEATURES.ensureProgression();await window.msOpenCharacterViewer?.(b.dataset.full,{tableId:c.table?.id,source:'lobby'});}catch(e){window.MS_PLATFORM?.toast?.(e.message,'error');}});
 root.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{img.hidden=true;},{once:true}));
}
function organize(){let i=0;for(const entry of nodes.values()){const p=defaultPosition(i++);move(entry.button,'orb:'+entry.id,p.x,p.y);}store();}
function openParticipants(){window.MS_TABLE_SHELL?.openWindow('salon');}
function reflow(){for(const entry of nodes.values()){for(const [el,key] of [[entry.button,'orb:'+entry.id],[entry.panel,'panel:'+entry.id]]){if(el.hidden)continue;const r=el.getBoundingClientRect();move(el,key,r.left,r.top);}}}
function restore(){positions={};for(const entry of nodes.values())closeMini(entry);organize();}

function init(){const screen=document.getElementById('screen-vtt');if(screen&&typeof MutationObserver==='function')new MutationObserver(sync).observe(screen,{attributes:true,attributeFilter:['class']});const bus=window.MS_PLATFORM;for(const event of ['vtt:entered','table:roster-refreshed','table:cache-updated'])bus?.on?.(event,sync);bus?.on?.('vtt:left',reset);window.addEventListener('ms-auth-state',e=>{reset();if(e.detail?.event!=='SIGNED_OUT')queueMicrotask(sync);});window.addEventListener('screen:changing',()=>queueMicrotask(sync));window.addEventListener('resize',reflow);document.addEventListener('keydown',e=>{if(e.key!=='Escape'||document.querySelector('dialog[open]'))return;for(const entry of nodes.values())closeMini(entry);});sync();}
window.MS_TABLE_SHEETS=Object.freeze({openParticipants,sync,visiblePlayers,clamp,reflow,restore,renderLobby,formationSlots});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
