/* Mundos Sombrios — Ferramentas do Mestre + Memórias do Mundo V2.7.3
   Proprietário único das ferramentas privadas da Sala dos Mestres e do assistente de regras.
   Não substitui o motor VTT: integra-se por hooks explícitos.
*/
(function(){
  'use strict';
  const FILES='mundosSombriosGMFilesV1', NOTES='mundosSombriosGMNotesV1', NPCS='mundosSombriosGMNPCsV1', VTT='mundosSombriosVttStateV1';
  const MAX_FILE=3*1024*1024;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const gm=()=>{try{return typeof window.msCanUseMasterAuthority==='function'?window.msCanUseMasterAuthority(contextTable||currentTableData||null):!!(currentUser&&(currentUser.role==='mestre'||currentUser.role==='admin'))}catch(_){return false}};
  const canAccessShield=()=>{try{return typeof window.msCanAccessMasterShield==='function'?window.msCanAccessMasterShield(contextTable||currentTableData||null):!!(currentUser&&(currentUser.role==='mestre'||currentUser.role==='admin'))}catch(_){return false}};
  const uid=()=>{try{return String(currentUser?.id||'')}catch(_){return ''}};
  let contextTable=null;
  const tableId=()=>{try{return String(contextTable?.id||currentTableData?.id||'draft')}catch(_){return 'draft'}};
  const online={notes:[],npcs:[],files:[],vtt:{chat:[],dice:[],gallery:[]},hydrated:false,unsubscribe:null};
  const keyKind=k=>k===NOTES?'notes':k===NPCS?'npcs':k===FILES?'files':k===VTT?'vtt':null;
  const scoped=(key)=>{const kind=keyKind(key); if(kind) return Array.isArray(online[kind])?online[kind]:[]; return [];};
  async function persistScoped(key,val,previous=[]){
    if(!window.MS_DB?.ready || !gm() || tableId()==='draft') return;
    const kind=keyKind(key); const next=Array.isArray(val)?val:[]; const old=Array.isArray(previous)?previous:[];
    if(kind==='notes'){ for(const n of next) await window.MS_DB.saveGMNote(tableId(),n); for(const n of old) if(!next.some(x=>String(x.id)===String(n.id))) await window.MS_DB.deleteGMNote(n.id); }
    if(kind==='npcs'){ for(const n of next) await window.MS_DB.saveGMNpc(tableId(),n); for(const n of old) if(!next.some(x=>String(x.id)===String(n.id))) await window.MS_DB.deleteGMNpc(n.id); }
  }
  const setScoped=(key,val)=>{const kind=keyKind(key);const next=Array.isArray(val)?val:[];const prev=kind&&Array.isArray(online[kind])?online[kind].slice():[];if(kind) online[kind]=next;persistScoped(key,next,prev).catch(e=>console.warn('[Mundos Sombrios] persistência GM:',e));};
  async function hydrateOnline(options={}){
    if(!window.MS_DB?.ready || !gm() || tableId()==='draft' || online.hydrated) return;
    try{
      const [notes,npcs,files,state]=await Promise.all([window.MS_DB.fetchGMNotes(tableId()),window.MS_DB.fetchGMNpcs(tableId()),window.MS_DB.fetchGMFiles(tableId()),window.MS_DB.fetchTableState(tableId())]);
      online.notes=notes.data||[]; online.npcs=npcs.data||[]; online.files=files.data||[]; if(!options.keepVtt) online.vtt=window.MS_TABLE_SESSION?.normalizeState?.(state.data||online.vtt)||state.data||online.vtt||{chat:[],dice:[],gallery:[]}; online.hydrated=true;
    }catch(e){console.warn('[Mundos Sombrios] hidratação das ferramentas do Mestre:',e);}
  }
  const mode=()=>{try{return contextTable?.gameMode || currentTableData?.gameMode || (typeof currentDraftGameMode!=='undefined'?currentDraftGameMode:null) || (typeof currentMode!=='undefined'?currentMode:'exodo')}catch(_){return 'exodo'}};
  const DEFAULT_GRID=()=>window.MS_GRID_ENGINE?.DEFAULT_CONFIG||{schemaVersion:1,type:'square',columns:16,rows:16,cellWidth:64,cellHeight:64,boardWidth:1024,boardHeight:1024,offsetX:0,offsetY:0,rotation:0,snap:true,showGrid:true,showCoordinates:false,showToPlayers:true,lineWidth:1,opacity:.45,lineColor:'#65717a',unitName:'m',unitsPerCell:1.5};
  const cloneSafe=v=>{try{return JSON.parse(JSON.stringify(v));}catch(_){return v;}};

  const state={activeTool:'files', shield:null};
  const MEMORY_POS_KEY='ms:ui:world-memory:position:v1';
  function readMemoryPosition(){
    try{const v=JSON.parse(localStorage.getItem(MEMORY_POS_KEY)||'null');return v&&Number.isFinite(v.left)&&Number.isFinite(v.top)?v:null;}catch(_){return null;}
  }
  function saveMemoryPosition(left,top){try{localStorage.setItem(MEMORY_POS_KEY,JSON.stringify({left,top}));}catch(_){}}
  function clampMemoryPanel(box,left,top){
    const pad=8,w=box.offsetWidth||500,h=box.offsetHeight||300;
    return {left:Math.max(pad,Math.min(Number(left)||pad,Math.max(pad,innerWidth-w-pad))),top:Math.max(pad,Math.min(Number(top)||pad,Math.max(pad,innerHeight-h-pad)))};
  }
  function positionMemoryPanel(box){
    const saved=readMemoryPosition();if(!saved)return;
    const p=clampMemoryPanel(box,saved.left,saved.top);box.style.left=p.left+'px';box.style.top=p.top+'px';box.style.right='auto';box.style.bottom='auto';
  }
  function setMemoryPanelOpen(open){
    const button=state.shield?.button,box=state.shield?.box;if(!button||!box)return;
    box.hidden=!open;button.classList.toggle('is-open',!!open);button.setAttribute('aria-expanded',open?'true':'false');
    if(open){positionMemoryPanel(box);setTimeout(()=>box.querySelector('#shield-query')?.focus(),0);}
  }
  function makeMemoryPanelDraggable(box){
    const handle=box.querySelector('[data-memory-drag]');if(!handle)return;let drag=null;
    handle.addEventListener('pointerdown',e=>{
      if(e.button!==0||e.target.closest('button,input,textarea,a'))return;
      const r=box.getBoundingClientRect();drag={dx:e.clientX-r.left,dy:e.clientY-r.top,id:e.pointerId};
      box.classList.add('is-dragging');handle.setPointerCapture?.(e.pointerId);e.preventDefault();
    });
    handle.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const p=clampMemoryPanel(box,e.clientX-drag.dx,e.clientY-drag.dy);box.style.left=p.left+'px';box.style.top=p.top+'px';box.style.right='auto';box.style.bottom='auto';});
    const finish=e=>{if(!drag||e.pointerId!==drag.id)return;const r=box.getBoundingClientRect();saveMemoryPosition(r.left,r.top);box.classList.remove('is-dragging');drag=null;};
    handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);
    const onResize=()=>{if(!box.hidden)positionMemoryPanel(box);};
    window.addEventListener('resize',onResize);
    return ()=>window.removeEventListener('resize',onResize);
  }

  function makeShieldIconDraggable(button,onClick){
    const key='ms:ui:shield-icon:'+String(window.currentUser?.id||'guest');let drag=null,suppress=false;
    function place(left,top){const p=clampMemoryPanel(button,left,top);Object.assign(button.style,{left:p.left+'px',top:p.top+'px',right:'auto',bottom:'auto'});return p;}
    function save(){const r=button.getBoundingClientRect();try{localStorage.setItem(key,JSON.stringify({left:r.left,top:r.top}));}catch(_){}}
    try{const p=JSON.parse(localStorage.getItem(key)||'null');if(p&&Number.isFinite(p.left)&&Number.isFinite(p.top))place(p.left,p.top);}catch(_){}
    button.title='Clique para abrir ou recolher · Arraste ou use Alt + setas para mover';
    button.addEventListener('pointerdown',e=>{if(e.button!==0)return;const r=button.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top,moved:false};suppress=false;button.setPointerCapture?.(e.pointerId);});
    button.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>5)drag.moved=true;if(drag.moved){place(drag.left+dx,drag.top+dy);e.preventDefault();}});
    const finish=e=>{if(!drag||e.pointerId!==drag.id)return;suppress=drag.moved;drag=null;save();};button.addEventListener('pointerup',finish);button.addEventListener('pointercancel',finish);
    button.addEventListener('click',e=>{if(suppress){suppress=false;e.preventDefault();return;}onClick();});
    button.addEventListener('keydown',e=>{const d={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]}[e.key];if(!e.altKey||!d)return;e.preventDefault();const r=button.getBoundingClientRect();place(r.left+d[0],r.top+d[1]);save();});
    const resize=()=>{const r=button.getBoundingClientRect();place(r.left,r.top);};window.addEventListener('resize',resize);return ()=>window.removeEventListener('resize',resize);
  }

  async function renderMasterTools(root, table=null, options={}){
    if(table && String(table?.id||'')!==String(contextTable?.id||'')){ contextTable=table; online.hydrated=false; online.notes=[]; online.npcs=[]; online.files=[]; }
    else if(table) contextTable=table;
    if(!gm()) return;
    await hydrateOnline();
    // Renderização idempotente: chamadas concorrentes da Ancoragem não podem
    // empilhar duas suítes do Cofre do Mestre no mesmo contêiner.
    root.querySelectorAll('.gm-tools-suite').forEach(node=>node.remove());
    const wrap=document.createElement('section');
    wrap.className='gm-tools-suite';
    wrap.innerHTML=`
      <header class="gm-tools-head"><div><span class="mr-kicker">ACERVO PRIVADO · ${esc(contextTable?.name||currentTableData?.name||'Fenda em preparação')}</span><h3>Cofre do Mestre</h3><p>Preparação, condução e consequências desta campanha em um contexto de mesa inequívoco.</p></div><span class="gm-tools-lock">♛ RESTRITO</span></header>
      <div class="master-suite-context"><div><b>${esc(contextTable?.name||currentTableData?.name||'Rascunho')}</b><small>${esc(contextTable?.settings?.era||'Época não definida')} · ${esc(contextTable?.settings?.region||'Região não definida')} · ${esc(mode()==='exodo'?'Êxodo · Assimilação':'Ocultatun · Ecos')}</small></div><span>${esc(contextTable?.code||currentTableData?.code||'SEM CÓDIGO')}</span></div>
      <nav class="gm-tools-tabs master-tabs" role="tablist" aria-label="Ferramentas privadas"><button type="button" class="gm-tools-tab master-tab active" data-tool="files">Arquivos</button><button type="button" class="gm-tools-tab master-tab" data-tool="notes">Notas</button><button type="button" class="gm-tools-tab master-tab" data-tool="npcs">NPCs</button><button type="button" class="gm-tools-tab master-tab" data-tool="encounters">Encontros</button><button type="button" class="gm-tools-tab master-tab" data-tool="combat">Combate</button><button type="button" class="gm-tools-tab master-tab" data-tool="clues">Pistas</button><button type="button" class="gm-tools-tab master-tab" data-tool="world">Mundo</button><button type="button" class="gm-tools-tab master-tab" data-tool="sessions">Sessões</button></nav>
      <div class="gm-tools-panel" id="gm-tools-panel"></div>`;
    root.appendChild(wrap);
    const commandRoot=options?.commandRoot||root;
    if(window.MasterCommandCenter?.render && commandRoot) window.MasterCommandCenter.render(commandRoot, contextTable);
    wrap.querySelectorAll('.gm-tools-tab').forEach(b=>b.addEventListener('click',()=>{state.activeTool=b.dataset.tool;wrap.querySelectorAll('.gm-tools-tab').forEach(x=>x.classList.toggle('active',x===b));renderPanel(wrap.querySelector('#gm-tools-panel'));}));
    renderPanel(wrap.querySelector('#gm-tools-panel'));
  }

  function renderPanel(panel){
    if(!panel||!gm())return;
    if(state.activeTool==='files') renderFiles(panel);
    else if(state.activeTool==='notes') renderNotes(panel);
    else if(state.activeTool==='npcs') renderNPCs(panel);
    else if(state.activeTool==='encounters') renderEncounters(panel);
    else if(state.activeTool==='combat') renderCombat(panel);
    else if(state.activeTool==='clues') renderClues(panel);
    else if(state.activeTool==='world') renderWorld(panel);
    else renderSessions(panel);
  }

  function renderFiles(panel){
    const files=scoped(FILES);
    panel.innerHTML=`<div class="gm-tool-toolbar"><label class="gm-upload-btn">＋ ENVIAR ARQUIVOS<input id="gm-file-input" type="file" multiple hidden></label><span class="gm-storage-hint">Máx. ${Math.round(MAX_FILE/1024/1024)} MB por arquivo · armazenamento privado online</span></div><div id="gm-file-list" class="gm-file-list"></div>`;
    const list=panel.querySelector('#gm-file-list'); if(!files.length) list.innerHTML='<div class="gm-empty">Nenhum arquivo privado protocolado.</div>';
    files.forEach(f=>{list.insertAdjacentHTML('beforeend',`<article class="gm-file-card"><div class="gm-file-icon">▣</div><div><b>${esc(f.name)}</b><small>${esc(f.mime_type||f.type||'arquivo')} · ${Math.round((f.size_bytes||f.size||0)/1024)} KB</small></div><button type="button" data-download="${esc(f.id)}">BAIXAR</button><button type="button" class="danger" data-delete="${esc(f.id)}">EXCLUIR</button></article>`);});
    panel.querySelector('#gm-file-input').addEventListener('change',e=>uploadFiles(e.target.files,panel));
    panel.querySelectorAll('[data-download]').forEach(b=>b.addEventListener('click',()=>downloadFile(b.dataset.download)));
    panel.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>deleteFile(b.dataset.delete,panel)));
  }
  async function uploadFiles(fileList,panel){
    if(!window.MS_DB?.ready || tableId()==='draft'){alert('Salve a Fenda antes de enviar arquivos.');return;}
    for(const file of [...(fileList||[])]){
      if(file.size>MAX_FILE){alert(`O arquivo ${file.name} excede ${Math.round(MAX_FILE/1024/1024)} MB.`);continue;}
      try{const {data,error}=await window.MS_DB.uploadGMFile(tableId(),file);if(error)throw error;if(data){online.files.unshift(data);renderFiles(panel);}}catch(e){console.warn('[Mundos Sombrios] Upload GM:',e);alert(`Não foi possível enviar ${file.name}.`);}
    }
  }
  async function downloadFile(id){
    if(!gm())return; const f=scoped(FILES).find(x=>String(x.id)===String(id));if(!f)return;
    if(f.path&&window.MS_DB?.createSignedGMFileUrl){const {data,error}=await window.MS_DB.createSignedGMFileUrl(f.path);if(!error&&data?.signedUrl){window.open(data.signedUrl,'_blank','noopener');return;}}
    if(f.data){const a=document.createElement('a');a.href=f.data;a.download=f.name;document.body.appendChild(a);a.click();a.remove();}
  }
  async function deleteFile(id,panel){if(!gm()||!confirm('Excluir este arquivo privado?'))return;const f=scoped(FILES).find(x=>String(x.id)===String(id));if(!f)return;try{const {error}=await window.MS_DB.deleteGMFile(id,f.path);if(error)throw error;online.files=online.files.filter(x=>String(x.id)!==String(id));renderFiles(panel);}catch(e){console.warn('[Mundos Sombrios] Delete GM file:',e);alert('Não foi possível excluir o arquivo.');}}
  function renderNotes(panel){
    const notes=scoped(NOTES); const text=notes.length?notes[0].text:''; const title=notes.length?notes[0].title:'Caderno do Mestre';
    panel.innerHTML=`<div class="gm-note-editor"><input id="gm-note-title" value="${esc(title)}" maxlength="80" placeholder="Título"><textarea id="gm-note-body" rows="13" placeholder="Anote pistas, cenas, decisões, segredos...">${esc(text)}</textarea><div class="gm-note-actions"><button type="button" id="gm-note-save">SALVAR NOTA</button><span id="gm-note-status" class="gm-status"></span></div></div>`;
    panel.querySelector('#gm-note-save').addEventListener('click',()=>{const note={title:panel.querySelector('#gm-note-title').value.trim()||'Caderno do Mestre',text:panel.querySelector('#gm-note-body').value,updatedAt:Date.now()};setScoped(NOTES,[note]);panel.querySelector('#gm-note-status').textContent='Nota salva.';});
  }

  function renderNPCs(panel){
    const npcs=scoped(NPCS);
    panel.innerHTML=`<div class="gm-npc-grid"><form class="gm-npc-form" id="gm-npc-form"><h4>NPC completo / recorrente</h4><input id="npc-name" required placeholder="Nome do NPC"><input id="npc-role" placeholder="Função / ameaça"><div class="gm-npc-stats"><input id="npc-pv" type="number" min="0" placeholder="PV"><input id="npc-def" type="number" placeholder="Defesa"><input id="npc-cd" type="number" placeholder="CD"><input id="npc-mode" value="${mode()}" readonly></div><input id="npc-faction" placeholder="Facção / organização"><div class="gm-npc-stats"><input id="npc-loyalty" placeholder="Lealdade"><input id="npc-fear" placeholder="Medo"><input id="npc-relation" placeholder="Relação com o grupo"><input id="npc-token" placeholder="Token vinculado"></div><textarea id="npc-attacks" rows="2" placeholder="Ataques / ações"></textarea><textarea id="npc-resistances" rows="2" placeholder="Resistências / vulnerabilidades"></textarea><textarea id="npc-powers" rows="2" placeholder="Poderes / recursos"></textarea><textarea id="npc-behavior" rows="2" placeholder="Comportamento e tática"></textarea><textarea id="npc-objectives" rows="2" placeholder="Objetivos e interesses"></textarea><textarea id="npc-history" rows="3" placeholder="Histórico de aparições, promessas, ameaças e mudanças de relação"></textarea><textarea id="npc-notes" rows="3" placeholder="Notas adicionais"></textarea><button type="submit">REGISTRAR NPC</button></form><div class="gm-npc-list" id="gm-npc-list"></div></div>`;
    const list=panel.querySelector('#gm-npc-list'); if(!npcs.length){list.innerHTML='<div class="gm-empty">Nenhum NPC registrado.</div>';} else npcs.forEach(n=>{list.insertAdjacentHTML('beforeend',`<article class="gm-npc-card"><div><b>${esc(n.name)}</b><small>${esc(n.role||'NPC')} · ${esc(n.mode)}${n.faction?' · '+esc(n.faction):''}</small></div><p>PV ${esc(n.pv??'—')} · DEF ${esc(n.def??'—')} · CD ${esc(n.cd??'—')}</p><p><b>Relação:</b> ${esc(n.relationship||'—')} · <b>Lealdade:</b> ${esc(n.loyalty||'—')} · <b>Medo:</b> ${esc(n.fear||'—')}</p><p><b>Ações:</b> ${esc(n.attacks||'—')}<br><b>Comportamento:</b> ${esc(n.behavior||'—')}<br><b>Objetivo:</b> ${esc(n.objectives||'—')}</p>${n.history?`<details><summary>MEMÓRIA DO NPC</summary><p>${esc(n.history)}</p></details>`:''}<div><button type="button" data-edit-npc="${esc(n.id)}">EDITAR</button><button type="button" class="danger" data-delete-npc="${esc(n.id)}">EXCLUIR</button></div></article>`) });
    panel.querySelector('#gm-npc-form').addEventListener('submit',e=>{e.preventDefault();const form=e.currentTarget,editId=form.dataset.editingNpcId||'',get=id=>panel.querySelector('#'+id)?.value?.trim()||'';const name=get('npc-name');if(!name)return;const data={id:editId||(crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random())),name,role:get('npc-role'),pv:Number(get('npc-pv')||0),def:Number(get('npc-def')||0),cd:Number(get('npc-cd')||0),mode:mode(),faction:get('npc-faction'),loyalty:get('npc-loyalty'),fear:get('npc-fear'),relationship:get('npc-relation'),attacks:get('npc-attacks'),resistances:get('npc-resistances'),powers:get('npc-powers'),behavior:get('npc-behavior'),objectives:get('npc-objectives'),history:get('npc-history'),tokenLink:get('npc-token'),notes:get('npc-notes'),updatedAt:Date.now()};const current=scoped(NPCS);setScoped(NPCS,editId?current.map(x=>String(x.id)===String(editId)?data:x):[...current,data]);window.MasterCommandCenter?.log?.('npc',editId?`NPC atualizado: ${name}`:`NPC registrado: ${name}`);renderNPCs(panel);});
    panel.querySelectorAll('[data-delete-npc]').forEach(b=>b.addEventListener('click',()=>{if(confirm('Excluir este NPC?')){setScoped(NPCS,scoped(NPCS).filter(x=>String(x.id)!==String(b.dataset.deleteNpc)));renderNPCs(panel);}}));
    panel.querySelectorAll('[data-edit-npc]').forEach(b=>b.addEventListener('click',()=>{const n=scoped(NPCS).find(x=>String(x.id)===String(b.dataset.editNpc));if(!n)return;const form=panel.querySelector('#gm-npc-form');if(form){form.dataset.editingNpcId=String(n.id);const submitBtn=form.querySelector('button[type="submit"]');if(submitBtn)submitBtn.textContent='ATUALIZAR NPC';}const map={name:'name',role:'role',pv:'pv',def:'def',cd:'cd',faction:'faction',loyalty:'loyalty',fear:'fear',relation:'relationship',attacks:'attacks',resistances:'resistances',powers:'powers',behavior:'behavior',objectives:'objectives',history:'history',notes:'notes'};Object.entries(map).forEach(([id,k])=>{const el=panel.querySelector('#npc-'+id);if(el)el.value=n[k]??'';});const tok=panel.querySelector('#npc-token');if(tok)tok.value=n.tokenLink||'';}));
  }
  function workbench(){const s=vttState();s.gmWorkbench=s.gmWorkbench||{encounters:[],combat:{round:1,active:0,entries:[]},clues:[],world:[]};s.gmWorkbench.encounters=s.gmWorkbench.encounters||[];s.gmWorkbench.combat=s.gmWorkbench.combat||{round:1,active:0,entries:[]};s.gmWorkbench.clues=s.gmWorkbench.clues||[];s.gmWorkbench.world=s.gmWorkbench.world||[];return s.gmWorkbench;}
  function persistWorkbench(){const s=vttState();s.gmWorkbench=workbench();saveVtt(s);}
  function renderEncounters(panel){const w=workbench();panel.innerHTML=`<div class="master-work-grid"><form class="master-card" id="enc-form"><h4>Preparar encontro</h4><input id="enc-name" required placeholder="Nome / cena"><textarea id="enc-objective" placeholder="Objetivo dramático e tático"></textarea><textarea id="enc-threats" placeholder="Adversários / NPCs"></textarea><textarea id="enc-hazards" placeholder="Perigos ambientais"></textarea><textarea id="enc-outcomes" placeholder="Vitória, retirada e falha"></textarea><div class="master-kpis"><label>Controle<input id="enc-control" type="number" min="0" max="10" value="0"></label><label>Resistência<input id="enc-resistance" type="number" min="0" max="10" value="0"></label><label>Letalidade<input id="enc-lethality" type="number" min="0" max="10" value="0"></label><label>Complexidade<input id="enc-complexity" type="number" min="0" max="10" value="0"></label></div><button>ADICIONAR ENCONTRO</button></form><div class="master-list" id="enc-list">${(w.encounters||[]).map((x,i)=>`<article class="master-list-item"><b>${esc(x.name)}</b><p>${esc(x.objective||'')}</p><div class="master-kpis"><span>Controle<b>${x.control}</b></span><span>Resist.<b>${x.resistance}</b></span><span>Letal.<b>${x.lethality}</b></span><span>Complex.<b>${x.complexity}</b></span></div><button data-del-enc="${i}">REMOVER</button></article>`).join('')||'<div class="gm-empty">Nenhum encontro preparado.</div>'}</div></div>`;panel.querySelector('#enc-form').onsubmit=e=>{e.preventDefault();const g=id=>panel.querySelector('#'+id)?.value||'';w.encounters.push({id:crypto.randomUUID?crypto.randomUUID():'enc-'+Date.now(),name:g('enc-name').trim(),objective:g('enc-objective'),threats:g('enc-threats'),hazards:g('enc-hazards'),outcomes:g('enc-outcomes'),control:Number(g('enc-control')),resistance:Number(g('enc-resistance')),lethality:Number(g('enc-lethality')),complexity:Number(g('enc-complexity'))});persistWorkbench();renderEncounters(panel)};panel.querySelectorAll('[data-del-enc]').forEach(b=>b.onclick=()=>{w.encounters.splice(Number(b.dataset.delEnc),1);persistWorkbench();renderEncounters(panel)});}
  function renderCombat(panel){
    const w=workbench(),c=w.combat||(w.combat={round:1,active:0,entries:[]});
    c.entries=(c.entries||[]).map(x=>({...x,effects:Array.isArray(x.effects)?x.effects:(x.conditions?[{name:x.conditions,remaining:1}]:[]),reactionReady:x.reactionReady!==false}));
    const tickEffects=()=>{c.entries.forEach(x=>{x.effects=(x.effects||[]).map(e=>({...e,remaining:Math.max(0,Number(e.remaining||0)-1)})).filter(e=>e.remaining>0);x.reactionReady=true;});};
    panel.innerHTML=`<div class="master-card combat-director"><div class="gm-tool-toolbar"><button id="combat-prev">◀ TURNO</button><div><small>COMBAT DIRECTOR</small><b>RODADA ${Number(c.round)||1}</b></div><button id="combat-next">PRÓXIMO ▶</button></div><form id="combat-add" class="ms-table-meta-grid"><input id="combat-name" required placeholder="Combatente"><input id="combat-init" type="number" placeholder="Iniciativa"><input id="combat-hp" type="number" placeholder="PV"><input id="combat-cond" placeholder="Condição inicial"><button class="ms-span-2">ADICIONAR À ORDEM</button></form><div class="master-list">${(c.entries||[]).map((x,i)=>`<article class="master-list-item combat-entry ${i===c.active?'active':''}"><div class="combat-entry-head"><b>${i===c.active?'▶ ':''}${esc(x.name)}</b><span>INI ${x.initiative}</span></div><div class="combat-hp"><button data-hp="-1" data-ci="${i}">−</button><strong>PV ${x.hp??'—'}</strong><button data-hp="1" data-ci="${i}">＋</button><button data-react="${i}" class="${x.reactionReady?'ready':'spent'}">REAÇÃO ${x.reactionReady?'PRONTA':'GASTA'}</button></div><div class="combat-effects">${(x.effects||[]).map((ef,ei)=>`<span>${esc(ef.name)} · ${ef.remaining}r <button data-del-effect="${i}:${ei}">×</button></span>`).join('')||'<small>Sem efeitos temporários</small>'}</div><form data-effect-form="${i}" class="combat-effect-form"><input required placeholder="Condição / efeito"><input type="number" min="1" max="20" value="1" title="Rodadas"><button>APLICAR</button></form><button data-del-combat="${i}">REMOVER</button></article>`).join('')||'<div class="gm-empty">A iniciativa ainda não começou.</div>'}</div></div>`;
    panel.querySelector('#combat-add').onsubmit=e=>{e.preventDefault();const activeRef=c.entries[c.active]||null;const cond=panel.querySelector('#combat-cond').value.trim();c.entries.push({name:panel.querySelector('#combat-name').value.trim(),initiative:Number(panel.querySelector('#combat-init').value||0),hp:Number(panel.querySelector('#combat-hp').value||0),effects:cond?[{name:cond,remaining:1}]:[],reactionReady:true});c.entries.sort((a,b)=>b.initiative-a.initiative);if(activeRef){const ni=c.entries.indexOf(activeRef);if(ni>=0)c.active=ni;}persistWorkbench();window.MasterCommandCenter?.log?.('combat','Participante adicionado à iniciativa');renderCombat(panel)};
    panel.querySelector('#combat-next').onclick=()=>{if(c.entries.length){c.active++;if(c.active>=c.entries.length){c.active=0;c.round=(Number(c.round)||1)+1;tickEffects();window.MasterCommandCenter?.log?.('combat',`Rodada ${c.round} iniciada`)}persistWorkbench();renderCombat(panel)}};
    panel.querySelector('#combat-prev').onclick=()=>{if(c.entries.length){c.active--;if(c.active<0){c.active=c.entries.length-1;c.round=Math.max(1,(Number(c.round)||1)-1)}persistWorkbench();renderCombat(panel)}};
    panel.querySelectorAll('[data-hp]').forEach(b=>b.onclick=()=>{const x=c.entries[Number(b.dataset.ci)];x.hp=Number(x.hp||0)+Number(b.dataset.hp);persistWorkbench();renderCombat(panel)});
    panel.querySelectorAll('[data-react]').forEach(b=>b.onclick=()=>{const x=c.entries[Number(b.dataset.react)];x.reactionReady=!x.reactionReady;persistWorkbench();renderCombat(panel)});
    panel.querySelectorAll('[data-effect-form]').forEach(f=>f.onsubmit=e=>{e.preventDefault();const i=Number(f.dataset.effectForm),inputs=f.querySelectorAll('input');c.entries[i].effects.push({name:inputs[0].value.trim(),remaining:Number(inputs[1].value||1)});persistWorkbench();renderCombat(panel)});
    panel.querySelectorAll('[data-del-effect]').forEach(b=>b.onclick=()=>{const [i,e]=b.dataset.delEffect.split(':').map(Number);c.entries[i].effects.splice(e,1);persistWorkbench();renderCombat(panel)});
    panel.querySelectorAll('[data-del-combat]').forEach(b=>b.onclick=()=>{c.entries.splice(Number(b.dataset.delCombat),1);c.active=Math.min(c.active,Math.max(0,c.entries.length-1));persistWorkbench();renderCombat(panel)});
  }
  function renderClues(panel){
    const w=workbench();
    panel.innerHTML=`<div class="master-work-grid"><form id="clue-form" class="master-card"><h4>Pista / revelação</h4><input id="clue-title" required placeholder="Título"><textarea id="clue-body" placeholder="Informação preparada"></textarea><input id="clue-links" placeholder="Conexões: NPC, local, outra pista"><button>GUARDAR PISTA</button></form><div class="master-list">${(w.clues||[]).map((x,i)=>`<article class="master-list-item clue-state-${esc(x.state||'prepared')}"><b>${esc(x.title)}</b><p>${esc(x.body)}</p><small>${x.state==='understood'?'COMPREENDIDA':x.revealed||x.state==='discovered'?'DESCOBERTA':'PREPARADA'}${x.links?.length?' · '+esc(x.links.join(', ')):''}</small><div><button data-reveal="${i}">${x.revealed?'REVELAR NOVAMENTE':'REVELAR'}</button><button data-understand="${i}">MARCAR COMPREENDIDA</button><button data-del-clue="${i}">REMOVER</button></div></article>`).join('')||'<div class="gm-empty">Nenhuma pista preparada.</div>'}</div></div>`;
    panel.querySelector('#clue-form').onsubmit=e=>{e.preventDefault();w.clues.push({id:crypto.randomUUID?crypto.randomUUID():'clue-'+Date.now(),title:panel.querySelector('#clue-title').value.trim(),body:panel.querySelector('#clue-body').value.trim(),revealed:false,state:'prepared',links:panel.querySelector('#clue-links').value.split(',').map(x=>x.trim()).filter(Boolean)});persistWorkbench();renderClues(panel)};
    panel.querySelectorAll('[data-reveal]').forEach(b=>b.onclick=()=>{const x=w.clues[Number(b.dataset.reveal)];x.revealed=true;x.state=x.state==='understood'?'understood':'discovered';persistWorkbench();window.MasterCommandCenter?.log?.('clue',`Pista revelada: ${x.title}`);window.MS_SERVICES?.VTT?.event?.(tableId(),'reveal',{title:x.title,body:x.body});window.MS_PLATFORM?.toast('Pista revelada aos participantes.','success');renderClues(panel)});
    panel.querySelectorAll('[data-understand]').forEach(b=>b.onclick=()=>{const x=w.clues[Number(b.dataset.understand)];x.state='understood';x.revealed=true;window.MasterCommandCenter?.log?.('clue',`Pista compreendida: ${x.title}`);persistWorkbench();renderClues(panel)});
    panel.querySelectorAll('[data-del-clue]').forEach(b=>b.onclick=()=>{w.clues.splice(Number(b.dataset.delClue),1);persistWorkbench();renderClues(panel)});
  }
  function renderWorld(panel){
    const w=workbench();
    panel.innerHTML=`<div class="master-work-grid"><form id="world-form" class="master-card"><h4>Consequência no mundo</h4><input id="world-faction" placeholder="Facção / local / ator"><input id="world-relation" placeholder="Relação ou estado"><textarea id="world-event" required placeholder="Acontecimento e consequência"></textarea><button>REGISTRAR CONSEQUÊNCIA</button></form><div class="master-list">${(w.world||[]).map((x,i)=>`<article class="master-list-item ${x.resolved?'resolved':''}"><b>${esc(x.faction||'Mundo')}</b><small>${esc(x.relation||'')} · ${x.resolved?'RESOLVIDA':'PENDENTE'}</small><p>${esc(x.event)}</p><div><button data-resolve-world="${i}">${x.resolved?'REABRIR':'RESOLVER'}</button><button data-del-world="${i}">REMOVER</button></div></article>`).join('')||'<div class="gm-empty">O mundo ainda não possui consequências registradas.</div>'}</div></div>`;
    panel.querySelector('#world-form').onsubmit=e=>{e.preventDefault();const event=panel.querySelector('#world-event').value.trim();w.world.push({id:'world-'+Date.now(),faction:panel.querySelector('#world-faction').value.trim(),relation:panel.querySelector('#world-relation').value.trim(),event,at:new Date().toISOString(),resolved:false});persistWorkbench();window.MasterCommandCenter?.log?.('world',`Consequência: ${event.slice(0,70)}`);renderWorld(panel)};
    panel.querySelectorAll('[data-resolve-world]').forEach(b=>b.onclick=()=>{const x=w.world[Number(b.dataset.resolveWorld)];x.resolved=!x.resolved;persistWorkbench();renderWorld(panel)});
    panel.querySelectorAll('[data-del-world]').forEach(b=>b.onclick=()=>{w.world.splice(Number(b.dataset.delWorld),1);persistWorkbench();renderWorld(panel)});
  }
  async function renderSessions(panel){
    panel.innerHTML='<div class="gm-empty">Carregando calendário da campanha…</div>';
    if(tableId()==='draft'||!window.MS_SERVICES?.Campaigns){panel.innerHTML='<div class="gm-empty">Salve a mesa para organizar campanhas e sessões.</div>';return}
    try{
      let campResult=await window.MS_SERVICES.Campaigns.get(tableId()); let camp=campResult?.data||campResult||null;
      if(!camp){const created=await window.MS_SERVICES.Campaigns.create(tableId(),contextTable?.name||currentTableData?.name||'Campanha',contextTable?.settings?.description||'');camp=created?.data||created;}
      const result=await window.MS_SERVICES.Sessions.list(tableId()); const sessions=result?.data||result||[];
      panel.innerHTML=`<div class="master-work-grid"><form id="session-form" class="master-card"><h4>${esc(camp?.name||'Campanha')}</h4><p>${esc(camp?.description||contextTable?.settings?.description||'')}</p><input id="session-title" required placeholder="Título da sessão"><button>CRIAR SESSÃO PLANEJADA</button><hr><small>Contexto inicial</small><p>${esc(contextTable?.settings?.initialConditions||'Sem condições iniciais registradas.')}</p><small>Regras da mesa</small><p>${esc(contextTable?.settings?.houseRules||'Sem regras específicas registradas.')}</p></form><div class="master-list">${sessions.map(x=>`<article class="master-list-item"><b>${esc(x.title||'Sessão')}</b><small>${esc(x.status||'planned')} · ${esc(x.started_at||x.created_at||'')}</small><div><button data-session-status="active" data-session-id="${esc(x.id)}">INICIAR</button><button data-session-status="ended" data-session-id="${esc(x.id)}">ENCERRAR</button></div></article>`).join('')||'<div class="gm-empty">Nenhuma sessão planejada.</div>'}</div></div>`;
      panel.querySelector('#session-form').onsubmit=async e=>{e.preventDefault();await window.MS_SERVICES.Sessions.create(tableId(),panel.querySelector('#session-title').value.trim(),camp?.id||null);renderSessions(panel)};
      panel.querySelectorAll('[data-session-status]').forEach(b=>b.onclick=async()=>{await window.MS_SERVICES.Sessions.updateStatus(b.dataset.sessionId,b.dataset.sessionStatus);renderSessions(panel)});
    }catch(e){console.warn('[Mundos Sombrios] sessões:',e);panel.innerHTML='<div class="gm-empty">Não foi possível carregar as sessões desta campanha.</div>'}
  }

  function mountShield(isGM){
    unmountShield();
    try{window.__msVttIsGM=!!isGM}catch(_){}
    if(!canAccessShield())return;
    const button=document.createElement('button');button.type='button';button.id='master-shield-cube';button.className='master-shield-cube';button.setAttribute('aria-label','Abrir Memórias do Mundo');button.setAttribute('aria-expanded','false');button.innerHTML='<span>◈</span><small>MEMÓRIAS</small>';document.body.appendChild(button);
    const box=document.createElement('section');box.id='master-shield-panel';box.className='master-shield-panel world-memory-panel';box.hidden=true;box.setAttribute('role','dialog');box.setAttribute('aria-label','Memórias do Mundo');box.innerHTML=`<header data-memory-drag title="Arraste para mover as Memórias do Mundo"><div><span class="mr-kicker">ACERVO CONTEXTUAL</span><h3>Memórias do Mundo</h3><p id="shield-context"></p></div><div class="world-memory-head-actions"><button type="button" id="shield-full" aria-label="Abrir Escudo do Mestre completo">◇</button><button type="button" id="shield-close" aria-label="Recolher Memórias do Mundo">×</button></div></header><div class="world-memory-hint">ARRASTE PELO CABEÇALHO · CLIQUE NO ÍCONE PARA RECOLHER</div><div class="shield-search"><input id="shield-query" placeholder="Pergunte sobre regras, testes, alcance, CDs..."><button type="button" id="shield-ask">CONSULTAR</button></div><div id="shield-answer" class="shield-answer"><div class="shield-empty">Digite uma pergunta. As Memórias consultam apenas o compêndio oficial carregado no site.</div></div>`;document.body.appendChild(box);
    state.shield={button,box,cleanup:null};const panelCleanup=makeMemoryPanelDraggable(box),iconCleanup=makeShieldIconDraggable(button,()=>setMemoryPanelOpen(box.hidden));state.shield.cleanup=()=>{panelCleanup?.();iconCleanup();};
    box.querySelector('#shield-close').addEventListener('click',()=>setMemoryPanelOpen(false));
    box.querySelector('#shield-full').addEventListener('click',()=>{setMemoryPanelOpen(false);window.openMasterShield?.();});
    box.querySelector('#shield-ask').addEventListener('click',()=>answer(box));box.querySelector('#shield-query').addEventListener('keydown',e=>{if(e.key==='Enter')answer(box)});setContext(box);
  }
  function setContext(box){const m=mode();box.querySelector('#shield-context').textContent=m==='ocultatun'?'Ocultatun · Ecos da Decadência':'Êxodo · Assimilação';}
  let rulesLoadPromise=null;
  function ensureShieldRules(){
    if(Array.isArray(window.MASTER_SHIELD_RULES)) return Promise.resolve(window.MASTER_SHIELD_RULES);
    if(rulesLoadPromise) return rulesLoadPromise;
    rulesLoadPromise=new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-master-shield-rules]');
      if(existing){ existing.addEventListener('load',()=>resolve(window.MASTER_SHIELD_RULES||[]),{once:true}); existing.addEventListener('error',reject,{once:true}); return; }
      const script=document.createElement('script');
      script.src='js/master-shield-rules.js';
      script.dataset.masterShieldRules='1';
      script.async=true;
      script.onload=()=>resolve(Array.isArray(window.MASTER_SHIELD_RULES)?window.MASTER_SHIELD_RULES:[]);
      script.onerror=()=>reject(new Error('Não foi possível carregar o compêndio do Escudo.'));
      document.head.appendChild(script);
    }).catch(err=>{rulesLoadPromise=null;throw err;});
    return rulesLoadPromise;
  }
  async function answer(box){
    const q=box.querySelector('#shield-query').value.trim();
    const out=box.querySelector('#shield-answer');
    if(!q){out.innerHTML='<div class="shield-error">Faça uma pergunta.</div>';return;}
    out.innerHTML='<div class="shield-empty">Consultando o compêndio oficial…</div>';
    let rules=[];
    try{rules=await ensureShieldRules();}catch(err){out.innerHTML='<div class="shield-error">O compêndio do Escudo não pôde ser carregado. Tente novamente.</div>';return;}
    const qn=q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');const terms=qn.split(/[^a-z0-9]+/).filter(x=>x.length>2);const preferred=mode();const scored=rules.map(r=>{const text=(r.text+' '+r.keywords.join(' ')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');let score=0;terms.forEach(t=>{if(text.includes(t))score+=2;if(r.keywords.includes(t))score+=1});if(r.mode===preferred)score+=3;return {...r,score};}).filter(r=>r.score>4).sort((a,b)=>b.score-a.score).slice(0,3);const history=(window.MS_MASTER_HISTORY?.search?.(q)||[]).slice(0,2);if(!scored.length&&!history.length){out.innerHTML='<div class="shield-error">Não encontrei uma referência suficientemente próxima. Tente mencionar o modo, a regra, o evento, a facção ou o período histórico.</div>';return;}out.innerHTML=`<div class="shield-response"><strong>Consulta contextual</strong><p>Modo priorizado: <b>${esc(preferred==='exodo'?'Êxodo':'Ocultatun')}</b></p>${scored.map(r=>`<article><b>${esc(r.title)}</b><p>${esc(r.text)}</p><small>Regra · ${esc(r.source)} · índice ${r.line}</small></article>`).join('')}${history.map(h=>`<article><b>${esc(h.label)} · ${esc(h.title)}</b><p>${esc(h.summary)}</p><small>Registro histórico canônico · ${esc(window.MS_MASTER_HISTORY.source)}</small></article>`).join('')}</div>`;
  }
  function unmountShield(){try{state.shield?.cleanup?.();}catch(_){}document.getElementById('master-shield-cube')?.remove();document.getElementById('master-shield-panel')?.remove();state.shield=null;try{window.__msVttIsGM=false}catch(_){}}

  function vttState(){online.vtt=window.MS_TABLE_SESSION?.normalizeState?.(online.vtt)||online.vtt||{chat:[],dice:[],gallery:[]};return online.vtt;}
  function saveVtt(nextState){
    online.vtt=window.MS_TABLE_SESSION?.normalizeState?.(nextState)||nextState;
    // Snapshot é apenas estrutural. Chat/dados são event log e não dependem deste write.
    if(window.MS_DB?.ready&&tableId()!=='draft'&&gm()) window.MS_SERVICES?.VTT?.saveState?.(tableId(),online.vtt).catch(e=>console.warn('[Mundos Sombrios] Estado VTT:',e));
  }
  async function onVttEnter(table,isGM){
    try{window.__msVttIsGM=!!isGM}catch(_){}
    if(table) contextTable=table;
    if(online.unsubscribe){try{online.unsubscribe();}catch(_){} online.unsubscribe=null;}
    online.hydrated=false; online.notes=[];online.npcs=[];online.files=[];online.vtt=window.MS_TABLE_SESSION?.normalizeState?.(null)||{chat:[],dice:[],gallery:[]};
    if(table?.id&&window.MS_DB?.ready){
      try{
        const boot=await window.MS_TABLE_SESSION.connect(table.id,applyRemoteEvent);
        online.vtt=window.MS_TABLE_SESSION.normalizeState(boot.state);
        // Chat/dados são reconstituídos do event log; snapshot fica reservado ao estado estrutural.
        replayBootstrapEvents(boot.events||[]);
        online.hydrated=false; await hydrateOnline({keepVtt:true});
        restoreVttState();
      }catch(e){
        console.warn('[Mundos Sombrios] Sessão da mesa:',e);
        window.MS_PLATFORM?.toast('A mesa não conseguiu concluir a sincronização. Recursos locais foram bloqueados até a reconexão.','error');
      }
    }
  }

  function replayBootstrapEvents(events){
    const rows=Array.isArray(events)?events:[];
    const chatRows=rows.filter(e=>e?.event_type==='chat');
    const diceRows=rows.filter(e=>e?.event_type==='dice');
    if(chatRows.length) online.vtt.chat=chatRows.slice(-150).map(e=>({id:e.id,sender:e.payload?.sender||'Jogador',msg:e.payload?.msg||'',color:e.payload?.color||'#00ffcc',at:Date.parse(e.created_at||'')||Date.now()}));
    if(diceRows.length) online.vtt.dice=diceRows.slice(-100).map(e=>({id:e.id,type:e.payload?.type||'d20',result:e.payload?.result,sender:e.payload?.sender||'Jogador',at:Date.parse(e.created_at||'')||Date.now()}));
    const control=[...rows].reverse().find(e=>e?.event_type==='control');
    if(control?.payload&&typeof control.payload.chatLocked==='boolean'){online.vtt.controls={...(online.vtt.controls||{}),chatLocked:control.payload.chatLocked};online.vtt.chatLocked=control.payload.chatLocked;}
    // Totens também são event-sourced: quem entra depois reconstrói adições,
    // movimentos e remoções mesmo que nenhum Mestre estivesse online para salvar snapshot.
    rows.filter(e=>['token_add','token_move','token_remove'].includes(e?.event_type)).forEach(applyTokenEventToState);
  }
  function gridObjects(){const s=vttState();s.grid=s.grid&&typeof s.grid==='object'?s.grid:{};s.grid.objects=Array.isArray(s.grid.objects)?s.grid.objects:[];return s.grid.objects;}
  function applyTokenEventToState(event){
    const p=event?.payload||{},id=String(p.tokenId||p.token?.msTokenId||'');if(!id)return;
    const objects=gridObjects(),idx=objects.findIndex(o=>String(o?.msTokenId||'')===id);
    if(event.event_type==='token_add'&&p.token&&typeof p.token==='object'){
      if(p.actorCanManage!==true&&String(p.token.ownerAuthId||'')!==String(event?.actor_id||''))return;
      if(idx<0)objects.push({...p.token,msTokenId:id});else objects[idx]={...objects[idx],...p.token,msTokenId:id};return;
    }
    if(idx<0||!tokenActorAllowed(event,objects[idx]))return;
    if(event.event_type==='token_remove'){objects.splice(idx,1);return;}
    if(event.event_type==='token_move')objects[idx]={...objects[idx],left:Number(p.left)||0,top:Number(p.top)||0,angle:Number(p.angle)||0,scaleX:Number(p.scaleX)||objects[idx].scaleX||1,scaleY:Number(p.scaleY)||objects[idx].scaleY||1,msTokenWidthCells:Number(p.msTokenWidthCells)||objects[idx].msTokenWidthCells||null,msTokenHeightCells:Number(p.msTokenHeightCells)||objects[idx].msTokenHeightCells||null};
  }
  function tokenActorAllowed(event,obj){
    const p=event?.payload||{};if(p.actorCanManage===true)return true;
    const actor=String(event?.actor_id||'');if(!actor)return false;
    const direct=String(obj?.ownerAuthId||'');if(direct)return direct===actor;
    const linked=(Array.isArray(tablePlayers)?tablePlayers:[]).find(x=>String(x?.sourceCharId||x?.id||'')===String(obj?.characterId||''));
    return !!linked&&String(linked.participantUserId||'')===actor;
  }

  async function verifyCurrentMembership(){
    if(!currentTableData?.id||!window.MS_SERVICES?.Games?.summaries)return true;
    try{
      const rows=await window.MS_SERVICES.Games.summaries();
      const summary=(Array.isArray(rows)?rows:[]).find(t=>String(t.id)===String(currentTableData.id));
      if(!summary){window.MS_PLATFORM?.toast('Sua conexão com esta Fenda foi encerrada pelo Mestre.','error');setTimeout(()=>window.leaveVTT?.({force:true,reason:'membership_revoked'}),50);return false;}
      if(String(summary.status||'active')==='archived'){window.MS_PLATFORM?.toast('Esta Fenda foi arquivada e a sessão ao vivo foi encerrada.','error');setTimeout(()=>window.leaveVTT?.({force:true,reason:'table_archived'}),50);return false;}
      window.msRefreshCurrentTableAuthority?.(summary);
      return true;
    }catch(e){console.warn('[Mundos Sombrios] verificação de membro:',e);return true;}
  }
  async function refreshTableRoster(){
    if(!currentTableData?.id || !window.MS_SERVICES?.Games) return;
    try{
      const result=await window.MS_SERVICES.Games.characters(currentTableData.id);
      const remoteCharacters=result?.data||result||[];
      tablePlayers = remoteCharacters.map(c=>{
        const payload=c?.payload&&typeof c.payload==='object'?msClone(c.payload):{};
        payload.id=c.id; payload.ownerId=c.owner_id; payload.userId=c.user_id; payload.name=payload.name||c.name; payload.mode=payload.mode||c.mode; payload.nature=payload.nature||c.nature; payload.className=payload.className||c.class_name; payload.updatedAt=c.updated_at; payload.isMe=String(c.user_id)===String(currentUser?.authUserId||currentUser?.id); payload.sourceOwnerId=c.owner_id; payload.sourceCharId=c.id; payload.participantUserId=c.user_id; return payload;
      });
      renderVttCards?.();
      window.MS_PLATFORM?.emit('table:roster-refreshed',{tableId:currentTableData.id,count:tablePlayers.length});
    }catch(e){console.warn('[Mundos Sombrios] refresh roster:',e);}
  }
  function applyRemoteEvent(event){
    if(!event||!event.event_type)return; const p=event.payload||{};
    if(event.event_type==='table_deleted'){
      window.MS_PLATFORM?.toast('Esta Fenda foi encerrada pelo responsável.','error');
      setTimeout(()=>{try{window.leaveVTT?.({force:true,reason:'table_deleted'});}catch(_){}},30); return;
    }
    if(event.event_type==='table_refresh'){
      if(p.entity==='table_members') verifyCurrentMembership().then(ok=>{if(ok)refreshTableRoster();});
      if(p.entity==='table'&&String(p.status||'')==='archived'){window.MS_PLATFORM?.toast('Esta Fenda foi arquivada. A sessão será encerrada.','error');setTimeout(()=>window.leaveVTT?.({force:true,reason:'table_archived'}),30);return;}
      if(p.entity==='table_state') window.MS_DB?.fetchTableState?.(currentTableData?.id).then(r=>{if(r?.data){online.vtt=window.MS_TABLE_SESSION?.normalizeState?.(r.data)||r.data;restoreVttState();}}).catch(()=>{});
      if(p.entity==='game_sessions') window.MS_PLATFORM?.emit('table:sessions-changed',{tableId:currentTableData?.id});
      return;
    }
    if(event.event_type==='table_state'){ online.vtt=window.MS_TABLE_SESSION?.normalizeState?.(p.state||p||online.vtt)||p.state||p||online.vtt; restoreVttState(); return; }
    if(event.event_type==='table_status'){ const paused=String(p.status)==='paused'; online.vtt.controls={...(online.vtt.controls||{}),paused}; if(currentTableData)currentTableData.status=paused?'paused':'active'; window.__msTableLivePaused=paused; window.MS_PLATFORM?.emit('table:live-status',{tableId:currentTableData?.id,status:paused?'paused':'active'}); window.MS_PLATFORM?.toast(paused?'A sessão foi pausada pelo Mestre.':'A sessão foi retomada.','success'); return; }
    if(event.event_type==='master_notice'){ window.MS_PLATFORM?.toast(String(p.message||'Aviso do Mestre'),'success'); showDramaticReveal({title:'AVISO DO MESTRE',body:String(p.message||'')}); return; }
    if(event.event_type==='evolution_grant'){ window.MS_PLATFORM?.emit('progression:grant-event',p); return; }
    if(event.event_type==='chat'){
      const duplicate=online.vtt.chat.some(x=>String(x.sender)===String(p.sender)&&String(x.msg)===String(p.msg)&&Date.now()-Number(x.at||0)<5000);
      if(!duplicate){ const item={sender:p.sender,msg:p.msg,color:p.color||'#00ffcc',id:event.id,at:Date.now()}; online.vtt.chat.push(item); online.vtt.chat=online.vtt.chat.slice(-150); if(typeof addChatMessage==='function')addChatMessage(item.sender,item.msg,item.color); }
    }
    if(event.event_type==='reveal'){ showDramaticReveal(p); return; }
    if(event.event_type==='grid_preview'){
      // Evento efêmero: altera apenas a camada visual. Nunca entra no estado persistente da Cena.
      if(window.MS_GRID_ENGINE?.isPreviewing?.())return;
      window.MS_GRID_ENGINE?.applySharedPreview?.(p.active===false?null:p.gridConfig);
      return;
    }
    if(event.event_type==='architect_intent'){
      if(isVttGM())window.MS_GRID_ARCHITECT?.handleIntent?.(p);
      return;
    }
    if(event.event_type==='architect_move_intent'){
      if(!isVttGM())return;const canvas=window.vttCanvas||vttCanvas,tokenId=String(p.tokenId||''),obj=canvas?.getObjects?.()?.find(o=>String(o.msTokenId||'')===tokenId);if(!obj)return;
      const actor=String(event.actor_id||''),owner=String(obj.ownerAuthId||'');if(owner&&actor&&owner!==actor)return;
      const from={x:Number(p.fromLeft)||Number(obj.left)||0,y:Number(p.fromTop)||Number(obj.top)||0},to={x:Number(p.left)||0,y:Number(p.top)||0};if(window.MS_GRID_ARCHITECT?.canMoveBetween?.(from,to)===false){window.MS_TABLE_SESSION?.broadcastTransient?.('architect_move_denied',{tokenId,actorId:actor,reason:'Movimento bloqueado pelo cenário.'}).catch?.(()=>{});return;}
      obj.set({left:to.x,top:to.y,angle:Number(p.angle)||0,scaleX:Number(p.scaleX)||obj.scaleX,scaleY:Number(p.scaleY)||obj.scaleY});canvas?.requestRenderAll?.();if(window.MasterTools?.saveGrid)window.MasterTools.saveGrid(canvas);
      window.MS_TABLE_SESSION?.send?.('token_move',{tokenId,left:to.x,top:to.y,angle:Number(p.angle)||0,scaleX:Number(p.scaleX)||1,scaleY:Number(p.scaleY)||1,msTokenWidthCells:Number(p.msTokenWidthCells)||null,msTokenHeightCells:Number(p.msTokenHeightCells)||null}).catch?.(()=>{});return;
    }
    if(event.event_type==='architect_move_denied'){
      if(String(p.actorId||'')===String(currentUser?.authUserId||''))window.MS_PLATFORM?.toast?.(p.reason||'Movimento recusado pelo Mestre.','error');return;
    }
    if(event.event_type==='scene'){
      const s=vttState(),cfg=p.gridConfig&&typeof p.gridConfig==='object'?(window.MS_GRID_ENGINE?.normalize?.(p.gridConfig)||cloneSafe(p.gridConfig)):null;
      s.scene={...(s.scene||{}),id:p.sceneId||s.scene?.id||null,title:p.title||s.scene?.title||'',summary:p.summary||s.scene?.summary||'',location:p.location||s.scene?.location||'',mapUrl:p.mapUrl||s.scene?.mapUrl||'',gridConfig:cfg||s.scene?.gridConfig||cloneSafe(DEFAULT_GRID()),vtt:p.vtt&&typeof p.vtt==='object'?cloneSafe(p.vtt):(s.scene?.vtt||null)};
      if(cfg){s.grid={...(s.grid||{}),config:cloneSafe(cfg)};window.MS_GRID_ENGINE?.applyRemote?.(cfg);}
      if(s.scene.vtt)window.MS_GRID_ARCHITECT?.load?.(s.scene.vtt,{gridConfig:cfg||s.scene.gridConfig});
      window.applyVttSceneContext?.();
      if(!p.gridOnly)window.MS_PLATFORM?.toast(`Cena: ${p.title||'Nova cena'}`,'success');
      return;
    }
    if(['token_add','token_move','token_remove'].includes(event.event_type)){
      const tokenId=String(p.tokenId||p.token?.msTokenId||''),canvas=window.vttCanvas||vttCanvas;
      let obj=canvas?.getObjects?.()?.find(o=>String(o.msTokenId||'')===tokenId)||null;
      if(event.event_type==='token_add'){
        if(obj){applyTokenEventToState(event);return;}
        if(!p.token||typeof p.token!=='object')return;
        // Para jogador comum, o servidor reescreve ownerAuthId e actorCanManage.
        if(p.actorCanManage!==true&&String(p.token.ownerAuthId||'')!==String(event.actor_id||''))return;
        applyTokenEventToState(event);
        if(canvas&&window.fabric?.util?.enlivenObjects){window.__msApplyingRemoteToken=true;try{window.fabric.util.enlivenObjects([p.token],items=>{const item=items?.[0];if(item&&!canvas.getObjects().some(o=>String(o.msTokenId||'')===tokenId)){canvas.add(item);if(Number(item.msTokenWidthCells)>0)window.MS_GRID_ENGINE?.applyTokenSize?.(item,item.msTokenWidthCells,item.msTokenHeightCells||item.msTokenWidthCells,{silent:true});canvas.renderAll();if(isVttGM()&&window.MasterTools?.saveGrid)window.MasterTools.saveGrid(canvas);}window.__msApplyingRemoteToken=false;});}catch(_){window.__msApplyingRemoteToken=false;}}
        return;
      }
      if(!obj){applyTokenEventToState(event);return;}
      if(!tokenActorAllowed(event,obj))return;
      window.__msApplyingRemoteToken=true;
      if(event.event_type==='token_remove')canvas?.remove?.(obj);
      else {obj.set({left:Number(p.left)||0,top:Number(p.top)||0,angle:Number(p.angle)||0,scaleX:Number(p.scaleX)||obj.scaleX,scaleY:Number(p.scaleY)||obj.scaleY,msTokenWidthCells:Number(p.msTokenWidthCells)||obj.msTokenWidthCells||null,msTokenHeightCells:Number(p.msTokenHeightCells)||obj.msTokenHeightCells||null});if(Number(obj.msTokenWidthCells)>0)window.MS_GRID_ENGINE?.applyTokenSize?.(obj,obj.msTokenWidthCells,obj.msTokenHeightCells||obj.msTokenWidthCells,{silent:true});}
      canvas?.renderAll?.();window.__msApplyingRemoteToken=false;applyTokenEventToState(event);if(isVttGM()&&window.MasterTools?.saveGrid)window.MasterTools.saveGrid(canvas);return;
    }
    if(event.event_type==='control'){ if(typeof p.chatLocked==='boolean'){ chatLocked=p.chatLocked; const btn=document.getElementById('btn-lock-chat'); if(btn)btn.innerText=chatLocked?'🔏':'🔓'; } return; }
    if(event.event_type==='dice'){
      const duplicate=online.vtt.dice.some(x=>String(x.type)===String(p.type)&&String(x.result)===String(p.result)&&String(x.sender)===String(p.sender)&&Date.now()-Number(x.at||0)<5000);
      if(!duplicate){
        const item={id:event.id,type:p.type,result:p.result,sender:p.sender,at:Date.now()};
        online.vtt.dice.push(item); online.vtt.dice=online.vtt.dice.slice(-100); diceHistory=online.vtt.dice.slice(-100);
        if(typeof renderDiceHistory==='function')renderDiceHistory();
        window.MS_DICE_3D?.broadcast?.(p.type,p.result,p.sender||'Jogador');
      }
    }
  }
  function showDramaticReveal(p){
    document.getElementById('ms-vtt-reveal')?.remove();
    const box=document.createElement('div');box.id='ms-vtt-reveal';box.className='ms-vtt-reveal';box.innerHTML=`<article><small>INFORMAÇÃO REVELADA</small><h2>${esc(p.title||'Revelação')}</h2><p>${esc(p.body||'')}</p><button>FECHAR</button></article>`;document.body.appendChild(box);box.querySelector('button').onclick=()=>box.remove();setTimeout(()=>box.classList.add('show'),20);
  }
  function restoreVttState(){const s=vttState();const chat=document.getElementById('chat-messages');if(chat){chat.innerHTML='';(s.chat||[]).forEach(x=>{if(typeof addChatMessage==='function')addChatMessage(x.sender,x.msg,x.color);});}if(typeof diceHistory!=='undefined'){diceHistory=Array.isArray(s.dice)?s.dice.slice():[];if(typeof renderDiceHistory==='function')renderDiceHistory();}const c=document.getElementById('camp-gallery-container');if(c){c.innerHTML='';(s.gallery||[]).forEach(f=>addGalleryDom(f));}window.MS_GRID_ENGINE?.applyRemote?.(getGridConfig());window.applyVttSceneContext?.();}
  function addGalleryDom(f){const c=document.getElementById('camp-gallery-container');if(!c)return;c.insertAdjacentHTML('beforeend',`<div class="gallery-thumb"><img src="${f.src}" alt="${esc(f.name||'Imagem')}" onclick="viewFullscreen(this.src)"><button type="button" class="delete-btn hide-on-view" data-gallery-src="${encodeURIComponent(f.src||'')}">X</button></div>`);}
  async function onChatMessage(sender,msg,isGM){const s=vttState();s.chat=Array.isArray(s.chat)?s.chat:[];const local={id:'local-'+Date.now()+'-'+Math.random(),sender,msg,color:isGM?'#ff00ff':'#00ffcc',at:Date.now()};s.chat.push(local);s.chat=s.chat.slice(-150);if(window.MS_DB?.ready&&tableId()!=='draft'){try{return await window.MS_TABLE_SESSION?.send?.('chat',{sender,msg,color:local.color});}catch(error){window.MS_PLATFORM?.toast('Mensagem exibida localmente, mas não foi confirmada pela mesa.','error');throw error;}}return local;}
  async function onDiceRoll(type,result,sender){if(gm())window.MasterCommandCenter?.log?.('dice',`${sender} rolou ${type}: ${result}`);const s=vttState();s.dice=Array.isArray(s.dice)?s.dice:[];s.dice.push({id:'local-'+Date.now()+'-'+Math.random(),type,result,sender,at:Date.now()});s.dice=s.dice.slice(-100);if(window.MS_DB?.ready&&tableId()!=='draft'){try{return await window.MS_TABLE_SESSION?.send?.('dice',{type,result,sender});}catch(error){window.MS_PLATFORM?.toast('Rolagem local concluída, mas não foi confirmada pela mesa.','error');throw error;}}return result;}
  function syncDice(list){const s=vttState();s.dice=Array.isArray(list)?list.slice(-100):[];saveVtt(s);}
  function saveTableControlState(patch){ if(!gm()||tableId()==='draft') return; const s=vttState(); s.controls={...(s.controls||{}),...(patch||{})}; if(typeof patch?.chatLocked==='boolean') s.chatLocked=patch.chatLocked; saveVtt(s); }
  function saveGalleryImage(src,name){if(!isVttGM())return;const s=vttState();s.gallery=Array.isArray(s.gallery)?s.gallery:[];s.gallery.push({src,name:name||'Imagem',at:Date.now()});s.gallery=s.gallery.slice(-40);saveVtt(s);}
  function isVttGM(){try{return !!window.__msVttIsGM}catch(_){return false;}}
  function removeGalleryImage(src){const s=vttState();s.gallery=(s.gallery||[]).filter(f=>f.src!==src);saveVtt(s);document.querySelectorAll('[data-gallery-src]').forEach(b=>{try{if(decodeURIComponent(b.dataset.gallerySrc||'')===src)b.parentElement?.remove()}catch(_){}})}

  function getSceneContext(){const s=vttState();return s.scene&&typeof s.scene==='object'?cloneSafe(s.scene):null;}
  function getGridConfig(){
    const s=vttState(),cmd=s.gmWorkbench?.command,scene=cmd?.scenes?.find?.(x=>x.id===cmd.activeSceneId);
    // Cena ativa sem configuração é uma Cena legada: sempre recebe o fallback 16×16,
    // nunca a matriz da Cena anteriormente aberta.
    const raw=scene?(scene.gridConfig||DEFAULT_GRID()):(s.scene?.gridConfig||s.grid?.config||DEFAULT_GRID());
    return window.MS_GRID_ENGINE?.normalize?.(raw)||cloneSafe(raw);
  }
  function activateSceneContext(scene,options={}){
    if(!scene||typeof scene!=='object')return null;const s=vttState(),base=scene.gridConfig||DEFAULT_GRID(),cfg=window.MS_GRID_ENGINE?.normalize?.(base)||cloneSafe(base);
    scene.gridConfig=cloneSafe(cfg);const architect=scene.vtt&&typeof scene.vtt==='object'?cloneSafe(scene.vtt):(window.MS_GRID_ARCHITECT?.migrateLegacy?.(scene)||null);if(architect)scene.vtt=cloneSafe(architect);s.scene={id:scene.id||scene.sceneId||null,title:scene.title||'',summary:scene.summary||'',location:scene.location||'',mapUrl:scene.mapUrl||'',gridConfig:cloneSafe(cfg),vtt:architect};s.grid={...(s.grid||{}),config:cloneSafe(cfg)};saveVtt(s);window.MS_GRID_ENGINE?.applyRemote?.(cfg);if(architect)window.MS_GRID_ARCHITECT?.load?.(architect,{gridConfig:cfg});if(options.apply!==false)window.applyVttSceneContext?.();return cloneSafe(s.scene);
  }
  async function saveSceneGridConfig(config,options={}){
    if(!gm())return false;const s=vttState(),cfg=window.MS_GRID_ENGINE?.normalize?.(config)||cloneSafe(config||DEFAULT_GRID()),cmd=s.gmWorkbench?.command,scene=cmd?.scenes?.find?.(x=>x.id===cmd.activeSceneId)||null;
    if(scene)scene.gridConfig=cloneSafe(cfg);
    s.scene={...(s.scene||{}),id:scene?.id||s.scene?.id||null,title:scene?.title||s.scene?.title||'',summary:scene?.summary||s.scene?.summary||'',location:scene?.location||s.scene?.location||'',mapUrl:scene?.mapUrl||s.scene?.mapUrl||'',gridConfig:cloneSafe(cfg)};
    s.grid={...(s.grid||{}),config:cloneSafe(cfg)};saveVtt(s);
    if(options.broadcast!==false&&tableId()!=='draft')await window.MS_TABLE_SESSION?.send?.('scene',{sceneId:s.scene.id,title:s.scene.title,summary:s.scene.summary,location:s.scene.location,mapUrl:s.scene.mapUrl,gridConfig:cfg,vtt:s.scene.vtt||window.MS_GRID_ARCHITECT?.serialize?.()||null,gridOnly:true});
    return cloneSafe(cfg);
  }
  function getArchitectLegacyObjects(){const s=vttState();return Array.isArray(s.grid?.objects)?cloneSafe(s.grid.objects):[];}
  function getArchitectState(){const s=vttState(),cmd=s.gmWorkbench?.command,scene=cmd?.scenes?.find?.(x=>x.id===cmd.activeSceneId);return cloneSafe(scene?.vtt||s.scene?.vtt||null);}
  async function saveArchitectState(vtt,options={}){
    if(!gm()||!vtt||typeof vtt!=='object')return false;const s=vttState(),cmd=s.gmWorkbench?.command,scene=cmd?.scenes?.find?.(x=>x.id===cmd.activeSceneId)||null,payload=cloneSafe(vtt);
    if(scene)scene.vtt=payload;s.scene={...(s.scene||{}),id:scene?.id||s.scene?.id||null,title:scene?.title||s.scene?.title||'',summary:scene?.summary||s.scene?.summary||'',location:scene?.location||s.scene?.location||'',mapUrl:scene?.mapUrl||s.scene?.mapUrl||'',gridConfig:cloneSafe(scene?.gridConfig||s.scene?.gridConfig||getGridConfig()),vtt:payload};saveVtt(s);
    if(options.broadcast!==false&&tableId()!=='draft')await window.MS_TABLE_SESSION?.send?.('scene',{sceneId:s.scene.id,title:s.scene.title,summary:s.scene.summary,location:s.scene.location,mapUrl:s.scene.mapUrl,gridConfig:s.scene.gridConfig,vtt:payload,gridOnly:true});return cloneSafe(payload);
  }
  function saveGrid(canvas){if(!canvas)return;const s=vttState(),config=getGridConfig();const props=['owner','ownerId','ownerAuthId','characterId','msTokenId','borderColor','isGridLine','isRuler','msTokenWidthCells','msTokenHeightCells'];const objects=canvas.getObjects().filter(o=>!o.isGridLine&&!o.isRuler);const json=canvas.toJSON(props);s.grid={...json,config:cloneSafe(config)};s.grid.objects=objects.map(o=>o.toObject(props));saveVtt(s);}
  function restoreGrid(canvas){const s=vttState(),cfg=getGridConfig();window.MS_GRID_ENGINE?.applyRemote?.(cfg);if(!canvas||!s.grid||!s.grid.objects?.length){window.MS_GRID_ENGINE?.rescaleManagedTokens?.();return;}try{window.__msRestoringGrid=true;canvas.loadFromJSON({version:s.grid.version||'6.0.0',objects:s.grid.objects},()=>{drawGridLines?.();canvas.getObjects().forEach(o=>o.set('selectable',!o.isGridLine&&!o.isRuler&&(gm()||String(o.ownerId||'')===uid()||String(o.ownerAuthId||'')===String(currentUser?.authUserId||''))));window.MS_GRID_ENGINE?.applyRemote?.(cfg);window.MS_GRID_ENGINE?.rescaleManagedTokens?.();canvas.renderAll();window.__msRestoringGrid=false;});}catch(_){window.__msRestoringGrid=false}}
  window.renderMasterTools=renderMasterTools;
  window.MasterTools={renderMasterTools,mountShield,unmountShield,collapseMemoryPanel:()=>setMemoryPanelOpen(false),toggleMemoryPanel:()=>setMemoryPanelOpen(!!state.shield?.box?.hidden),onVttEnter,restoreVttState,onChatMessage,onDiceRoll,syncDice,saveGalleryImage,removeGalleryImage,saveGrid,restoreGrid,getGridConfig,getSceneContext,activateSceneContext,saveSceneGridConfig,getArchitectState,saveArchitectState,getArchitectLegacyObjects,saveTableControlState,getWorkbench:workbench,persistWorkbench,getNPCs:()=>scoped(NPCS),getContextTable:()=>contextTable,setActiveTool(tool){state.activeTool=tool;const suite=document.querySelector('.gm-tools-suite');if(!suite)return;suite.querySelectorAll('.gm-tools-tab').forEach(b=>b.classList.toggle('active',b.dataset.tool===tool));renderPanel(suite.querySelector('#gm-tools-panel'));}};
})();
