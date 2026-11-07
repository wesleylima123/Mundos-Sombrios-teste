/* Mundos Sombrios — Códices dos Mundos V0.59
   Fonte única de verdade da biblioteca dos mundos.
   Preserva o repositório local V3 e converte a apresentação antiga para:
   • Ocultatun: biblioteca antiga com selos, lacres e estantes proibidas.
   • Êxodo: sala de registros secretos, fichários e protocolos.
*/
(function(){
  'use strict';
  const LIB_KEY = 'mundosSombriosCodexLibraryV3';
  const DISABLED_KEY = 'mundosSombriosCodexLibraryDisabledV1';
  const LEGACY_KEYS = ['mundosSombriosCodexLibraryV1','mundosSombriosCodexLibraryV2'];

  const INFO = {
    ocultatun: {
      name:'Ocultatun', subtitle:'Biblioteca Antiga dos Ecos', kicker:'ARQUIVO SELADO // DECADÊNCIA',
      intro:'Volumes ocultos, códices proibidos e registros de entidades. Cada obra permanece protegida por selos do arquivo.',
      empty:'As estantes desta ala estão silenciosas.', icon:'✦', className:'wc-ocultatun',
      sections:{base:'Tomo-Mestre',expansao:'Códices Selados'}, chip:'SELADO'
    },
    exodo: {
      name:'Êxodo', subtitle:'Sala de Registros Secretos', kicker:'ARQUIVO RESTRITO // ASSIMILAÇÃO',
      intro:'Protocolos, relatórios e registros de campo mantidos pela administração dos mundos de Êxodo.',
      empty:'Nenhum registro foi protocolado nesta sala.', icon:'▣', className:'wc-exodo',
      sections:{base:'Registro Fundamental',expansao:'Dossiês e Expansões'}, chip:'RESTRITO'
    }
  };

  const catalog = Array.isArray(window.CODEX_FILE_CATALOG) ? window.CODEX_FILE_CATALOG : [];
  const state = { mode:null, query:'', reader:null };

  function readJSON(key,fallback){ console.warn('[Mundos Sombrios] Armazenamento local desativado no Códice dos Mundos.'); return fallback; }
  function writeJSON(key,v){ console.warn('[Mundos Sombrios] Armazenamento local desativado no Códice dos Mundos.'); }
  function disabledIds(){ return new Set((readJSON(DISABLED_KEY,[])||[]).map(String)); }
  function isAdmin(){ try{return !!(currentUser && currentUser.role==='admin');}catch(_){return false;} }
  function esc(v){ return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function mergeLibrary(){
    let stored = readJSON(LIB_KEY, []); if(!Array.isArray(stored)) stored=[];
    const legacy = LEGACY_KEYS.flatMap(k=>{const v=readJSON(k,[]);return Array.isArray(v)?v:[];});
    if(!stored.length && legacy.length) stored = legacy;
    const disabled = disabledIds();
    const official = catalog.filter(f=>!disabled.has(String(f.id))).map(f=>({...f,managed:false}));
    const uploads = stored.filter(f=>f && f.managed===true);
    const byId = new Map();
    [...official,...uploads].forEach(f=>{if(f && f.id && !byId.has(String(f.id))) byId.set(String(f.id),f);});
    const merged = [...byId.values()];
    writeJSON(LIB_KEY, merged);
    return merged;
  }

  function modeFiles(mode){ return mergeLibrary().filter(f=>f.mode===mode); }
  function filteredFiles(mode){
    const q=state.query.trim().toLowerCase();
    return modeFiles(mode).filter(f=>!q || `${f.title||''} ${f.name||''} ${f.kind||''}`.toLowerCase().includes(q));
  }

  function shell(){
    const root=document.getElementById('screen-codex'); if(!root)return null;
    root.innerHTML=`<div id="world-codex-root" class="world-codex-root" aria-live="polite"></div>`;
    return document.getElementById('world-codex-root');
  }

  function renderHome(){
    const root=shell(); if(!root)return;
    root.innerHTML=`
      <div class="wc-entrance">
        <div class="wc-home-nav"><button type="button" class="wc-return-portal" id="wc-home-portal">↩ PORTAL OFICIAL</button><button type="button" class="wc-return-mode" id="wc-home-return">↩ RETORNAR À SELEÇÃO DE MODO</button></div>
        <header class="wc-entrance-header">
          <span class="wc-overline">CÓDICES DOS MUNDOS</span>
          <h1>O Arquivo que atravessa as realidades</h1>
          <p>Escolha uma ala. Cada mundo guarda seus próprios registros, símbolos e regras.</p>
        </header>
        <div class="wc-worlds" role="list">
          <button type="button" class="wc-world-card wc-exodo" data-mode="exodo" role="listitem">
            <span class="wc-card-seal">◈</span><span class="wc-card-kicker">ÊXODO</span>
            <strong>Sala de Registros Secretos</strong>
            <span>Fichários, relatórios e protocolos de assimilação.</span>
            <em>ABRIR DOSSIÊ</em>
          </button>
          <button type="button" class="wc-world-card wc-ocultatun" data-mode="ocultatun" role="listitem">
            <span class="wc-card-seal">✦</span><span class="wc-card-kicker">OCULTATUN</span>
            <strong>Biblioteca Antiga</strong>
            <span>Volumes proibidos protegidos por selos do arquivo.</span>
            <em>ROMPER SELO</em>
          </button>
        </div>
      </div>`;
    root.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>renderLibrary(btn.dataset.mode)));
    root.querySelector('#wc-home-portal').addEventListener('click',()=>{ if(typeof window.returnToOfficialPortal==='function') window.returnToOfficialPortal(); });
    root.querySelector('#wc-home-return').addEventListener('click',()=>{ if(typeof showScreen==='function') showScreen('screen-mode-select'); });
  }

  function renderLibrary(mode){
    const root=shell(); if(!root)return;
    state.mode = mode==='ocultatun'?'ocultatun':'exodo'; state.query='';
    const info=INFO[state.mode];
    root.className=`world-codex-root ${info.className}`;
    root.innerHTML=`
      <div class="wc-library-shell">
        <header class="wc-library-header">
          <div class="wc-library-heading">
            <div class="wc-nav-row">
              <button type="button" class="wc-return-portal" id="wc-library-portal">↩ PORTAL OFICIAL</button>
              <button type="button" class="wc-back" id="wc-back">← CÓDICES</button>
              <button type="button" class="wc-return-mode" id="wc-return-mode">↩ RETORNAR À SELEÇÃO DE MODO</button>
            </div>
            <span class="wc-overline">${esc(info.kicker)}</span><h2>${esc(info.name)} — ${esc(info.subtitle)}</h2>
            <p>${esc(info.intro)}</p>
          </div>
          <div class="wc-seal-badge" aria-label="Ala ${esc(info.name)}">${info.icon}<span>${esc(info.chip)}</span></div>
        </header>
        <section class="wc-toolbar" aria-label="Ferramentas do acervo">
          <label class="wc-search"><span>⌕</span><input id="wc-search-input" type="search" placeholder="Pesquisar no acervo" aria-label="Pesquisar no acervo"></label>
          <div class="wc-admin-tools" id="wc-admin-tools" ${isAdmin()?'':'hidden'}>
            <label class="wc-upload">＋ Protocolar arquivo<input id="wc-upload" type="file" multiple hidden></label>
          </div>
        </section>
        <div id="wc-status" class="wc-status" role="status"></div>
        <main id="wc-sections" class="wc-sections"></main>
      </div>`;

    root.querySelector('#wc-library-portal').addEventListener('click',()=>{ if(typeof window.returnToOfficialPortal==='function') window.returnToOfficialPortal(); });
    root.querySelector('#wc-back').addEventListener('click', renderHome);
    root.querySelector('#wc-return-mode').addEventListener('click',()=>{ if(typeof showScreen==='function') showScreen('screen-mode-select'); });
    root.querySelector('#wc-search-input').addEventListener('input',e=>{state.query=e.target.value;renderSections();});
    const upload=root.querySelector('#wc-upload'); if(upload) upload.addEventListener('change',e=>uploadFiles(e.target.files));
    renderSections();
  }

  function renderSections(){
    const sectionRoot=document.getElementById('wc-sections'); if(!sectionRoot)return;
    const info=INFO[state.mode]; const files=filteredFiles(state.mode);
    if(!files.length){ sectionRoot.innerHTML=`<div class="wc-empty"><span>${info.icon}</span><strong>${esc(info.empty)}</strong><p>${state.query?'Tente outro termo de pesquisa.':'O acervo será preenchido quando novos registros forem protocolados.'}</p></div>`; return; }
    const groups={base:files.filter(f=>f.kind==='base'),expansao:files.filter(f=>f.kind!=='base')};
    sectionRoot.innerHTML=['base','expansao'].map(kind=>{
      const list=groups[kind]; if(!list.length)return '';
      return `<section class="wc-shelf"><header><div><span class="wc-shelf-kicker">${kind==='base'?'REGISTRO PRINCIPAL':'ARQUIVO COMPLEMENTAR'}</span><h3>${esc(info.sections[kind])}</h3></div><span class="wc-count">${list.length} volume(s)</span></header><div class="wc-files">${list.map(f=>fileCard(f.id)).join('')}</div></section>`;
    }).join('');
    sectionRoot.querySelectorAll('[data-read]').forEach(btn=>btn.addEventListener('click',()=>openReader(btn.dataset.read)));
    sectionRoot.querySelectorAll('[data-delete]').forEach(btn=>btn.addEventListener('click',()=>deleteFile(btn.dataset.delete)));
  }

  function fileCard(id){
    const f=mergeLibrary().find(x=>String(x.id)===String(id)); if(!f)return '';
    const info=INFO[f.mode];
    return `<article class="wc-file" data-id="${esc(f.id)}">
      <div class="wc-file-seal">${info.icon}</div>
      <div class="wc-file-body"><div class="wc-file-meta"><span>${f.kind==='base'?'BASE':'EXPANSÃO'}</span><span>${f.managed?'ADM':'OFICIAL'}</span></div><h4>${esc(f.title||f.name)}</h4><p>${esc(f.name||'Registro do acervo')}</p></div>
      <div class="wc-file-actions"><button type="button" class="wc-open" data-read="${esc(f.id)}">CONSULTAR</button>${isAdmin()?`<button type="button" class="wc-delete" data-delete="${esc(f.id)}" aria-label="Excluir ${esc(f.title||f.name)}">×</button>`:''}</div>
    </article>`;
  }

  function openReader(id){
    const file=mergeLibrary().find(x=>String(x.id)===String(id)); if(!file)return;
    closeReader();
    const modal=document.createElement('div'); modal.className='wc-reader'; modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true');
    modal.innerHTML=`<div class="wc-reader-card"><header><div><span>${esc(file.mode==='exodo'?'ÊXODO / REGISTRO':'OCULTATUN / CÓDICE')}</span><h3>${esc(file.title||file.name)}</h3></div><button type="button" class="wc-close">Fechar</button></header><iframe title="${esc(file.title||file.name)}" src="${file.dataUrl||encodeURI(file.file)}"></iframe></div>`;
    document.body.appendChild(modal); state.reader=modal;
    modal.querySelector('.wc-close').addEventListener('click',closeReader);
    modal.addEventListener('click',e=>{if(e.target===modal)closeReader();});
  }
  function closeReader(){ if(state.reader){state.reader.remove();state.reader=null;} const old=document.querySelector('.wc-reader'); if(old)old.remove(); }

  function uploadFiles(list){
    if(!isAdmin()){setStatus('Apenas o ADM pode protocolar novos registros.','error');return;}
    const files=Array.from(list||[]); if(!files.length)return;
    let pending=files.length, stored=mergeLibrary();
    files.forEach(file=>{
      if(file.size>8*1024*1024){pending--;setStatus(`"${file.name}" excede o limite de 8 MB.`,'error');return;}
      const reader=new FileReader();
      reader.onload=e=>{
        stored.push({id:'adm-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),title:file.name.replace(/\.[^.]+$/,''),name:file.name,type:file.type||'arquivo',mode:state.mode,kind:'expansao',file:`codex-files/${file.name}`,dataUrl:e.target.result,managed:true,uploadedAt:Date.now()});
        if(--pending===0){writeJSON(LIB_KEY,stored);setStatus('Registro protocolado com sucesso.','success');renderSections();}
      };
      reader.onerror=()=>{pending--;setStatus(`Não foi possível ler "${file.name}".`,'error');}; reader.readAsDataURL(file);
    });
  }
  function deleteFile(id){
    if(!isAdmin())return;
    const file=mergeLibrary().find(x=>String(x.id)===String(id)); if(!file)return;
    if(!window.confirm(`Excluir "${file.title||file.name}" desta instalação?`))return;
    const disabled=disabledIds(); if(!file.managed)disabled.add(String(file.id)); writeJSON(DISABLED_KEY,[...disabled]);
    writeJSON(LIB_KEY,mergeLibrary().filter(x=>String(x.id)!==String(id))); setStatus('Registro removido do índice local.','success'); renderSections();
  }
  function setStatus(text,type){const el=document.getElementById('wc-status'); if(!el)return; el.textContent=text; el.dataset.state=type||'';}

  window.renderWorldCodex=renderHome;
  window.openWorldCodex=renderHome;
  window.closeWorldCodexReader=closeReader;
  window.getWorldCodexState=()=>({...state});
  document.addEventListener('DOMContentLoaded',()=>{if(document.getElementById('screen-codex'))renderHome();});
})();
