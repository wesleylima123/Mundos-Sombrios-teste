/* Mundos Sombrios — UX online e confiabilidade da Forja v0.67 */
(function(){
  'use strict';
  const DRAFT_KEY='mundosSombriosBuilderDraftV2';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const $=id=>document.getElementById(id);
  let timer=null,lastBuilderActive=false;
  function active(){return !!$('screen-builder')?.classList.contains('active') || !!$('screen-builder')?.classList.contains('overlay');}
  function draftOwner(){try{return String(currentUser?.id||'guest')}catch(_){return 'guest'}}
  function readStore(){try{return JSON.parse(localStorage.getItem(DRAFT_KEY)||'{}')}catch(_){return {}}}
  function writeStore(s){try{localStorage.setItem(DRAFT_KEY,JSON.stringify(s))}catch(e){console.warn('[Mundos Sombrios] rascunho local:',e)}}
  function saveBuilderDraft(payload){
    if(!active())return;
    try{payload=payload||buildCharacterPayloadFromBuilder();const store=readStore();store[draftOwner()]={savedAt:new Date().toISOString(),payload};writeStore(store);updateSummary(payload);}catch(_){ }
  }
  function clearBuilderDraft(){const store=readStore();delete store[draftOwner()];writeStore(store);document.querySelector('.ms-draft-banner')?.remove();}
  function restorePayload(char){
    if(!char||!active())return false;
    try{
      const set=(id,val)=>{const el=$(id);if(el)el.value=val??''};
      if(char.mode && typeof startBuilder==='function'){currentMode=char.mode;startBuilder(char.mode);populateSelects?.(char.mode);}
      if(char.nature)selectNature?.(char.nature); if(char.className)selectClass?.(char.className,true);
      set('char-name',char.name); const c=char.concept||{};[['char-origin','origin'],['char-occupation','occupation'],['char-institution','institution'],['char-status','status'],['char-bonds','bonds'],['char-motivation','motivation'],['char-world-relation','worldRelation']].forEach(([id,k])=>set(id,c[k]));
      Object.entries(char.stats||{}).forEach(([k,v])=>set('attr-'+(k==='for'?'for':k),v)); set('pts-count',char.points||0);
      Object.entries(char.resources||{}).forEach(([k,v])=>{const el=document.querySelector(`#resource-panel .res-val-input[data-type="${CSS.escape(k)}"]`);if(el)el.value=v});
      const skills=$('skills-list');if(skills&&Array.isArray(char.skillsHtml)){skills.innerHTML='';char.skillsHtml.forEach(h=>{const d=document.createElement('div');d.className='list-item';d.innerHTML=h;skills.appendChild(d)})}
      const powers=$('powers-list');if(powers){powers.innerHTML='';if(Array.isArray(char.powers)&&char.powers.length){char.powers.forEach(p=>powers.appendChild(renderPowerItem(p)))}else(char.powersHtml||[]).forEach(h=>{const d=document.createElement('div');d.className='list-item';d.innerHTML=h;powers.appendChild(d)})}
      if(typeof currentEvolutionLog!=='undefined'){currentEvolutionLog=Array.isArray(char.evolution)?JSON.parse(JSON.stringify(char.evolution)):[];renderEvolutionEntries?.();}
      window.MS_PLATFORM?.toast('Rascunho recuperado. Revise e salve para sincronizar.','success');updateSummary(char);return true;
    }catch(e){console.warn('[Mundos Sombrios] restauração do rascunho:',e);window.MS_PLATFORM?.toast('O rascunho não pôde ser restaurado integralmente.','error');return false}
  }
  function offerRecovery(){
    const old=document.querySelector('.ms-draft-banner');if(old)old.remove();const item=readStore()[draftOwner()];if(!item?.payload)return;
    const host=$('screen-builder')?.querySelector('.builder-header');if(!host)return;
    const banner=document.createElement('div');banner.className='ms-draft-banner';const when=item.savedAt?new Date(item.savedAt).toLocaleString('pt-BR'):'recentemente';banner.innerHTML=`<div><b>Rascunho recuperável</b><br><small>Alterações locais preservadas em ${esc(when)}. Nada será perdido se a sincronização falhar.</small></div><div class="ms-draft-actions"><button type="button" class="souls-btn small-btn" data-restore>RECUPERAR</button><button type="button" class="souls-btn small-btn" data-discard>DESCARTAR</button></div>`;host.insertAdjacentElement('afterend',banner);banner.querySelector('[data-restore]').onclick=()=>{if(restorePayload(item.payload))banner.remove()};banner.querySelector('[data-discard]').onclick=()=>clearBuilderDraft();
  }
  function installGuide(){
    const screen=$('screen-builder');if(!screen||screen.querySelector('.ms-forge-guide'))return;
    const guide=document.createElement('div');guide.className='ms-forge-guide hide-on-pdf';guide.innerHTML=`<nav class="ms-forge-steps" aria-label="Etapas da Forja"><button class="ms-forge-step active" data-tab="tab-identity">1 Conceito</button><button class="ms-forge-step" data-tab="tab-stats">2 Recursos</button><button class="ms-forge-step" data-tab="tab-skills">3 Capacidades</button><button class="ms-forge-step" data-tab="tab-evolution">4 Evolução</button><button class="ms-forge-step" data-tab="tab-powers">5 Poderes</button><button class="ms-forge-step" data-tab="tab-equipment">6 Equipamento</button></nav><div class="ms-build-summary" id="ms-build-summary"><div><b>Alma sem nome</b><br><small>Natureza e classe pendentes</small></div><span>6 atributos · 0 pts</span></div>`;
    screen.querySelector('.builder-header')?.insertAdjacentElement('afterend',guide);
    guide.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{openTab?.(b.dataset.tab);syncSteps(b.dataset.tab)});
  }
  function syncSteps(tab){document.querySelectorAll('.ms-forge-step').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));}
  function updateSummary(payload){
    const box=$('ms-build-summary');if(!box)return;try{payload=payload||buildCharacterPayloadFromBuilder()}catch(_){payload=null}if(!payload)return;
    const stats=payload.stats||{},sum=Object.values(stats).reduce((n,v)=>n+(Number(v)||0),0),pending=[!payload.category?'categoria':null,!payload.nature?'natureza':null,!payload.className?'classe':null,!payload.concept?.motivation?'motivação':null].filter(Boolean);
    box.innerHTML=`<div><b>${esc(payload.name||'Alma sem nome')}</b><br><small>${esc(payload.nature||'Natureza pendente')} · ${esc(payload.className||'Classe pendente')}</small></div><span>Σ atributos ${sum} · ${esc(payload.points||0)} pts${pending.length?` · pendente: ${esc(pending.join(', '))}`:''}</span>`;
    const modeHelp=$('concept-mode-help');if(modeHelp)modeHelp.textContent=String(payload.mode)==='ocultatun'?'Em Ocultatun, registre vínculo institucional, especialidade e histórico de contato com o paranormal.':'Em Êxodo, origem, nacionalidade e situação diante do Tratado podem alterar como o mundo responde ao personagem.';
  }
  async function openCharacterHistory(){
    let payload;try{payload=buildCharacterPayloadFromBuilder()}catch(_){payload=null}const id=payload?.id;if(!id||!window.MS_SERVICES?.Characters){window.MS_PLATFORM?.toast('Salve a ficha uma vez antes de consultar versões.','error');return}
    let versions=[];try{const r=await window.MS_SERVICES.Characters.getHistory(id);versions=r?.data||r||[]}catch(e){window.MS_PLATFORM?.toast('Não foi possível consultar o histórico online.','error');return}
    document.querySelector('.ms-history-modal')?.remove();const modal=document.createElement('div');modal.className='ms-history-modal';modal.innerHTML=`<section class="ms-history-dialog" role="dialog" aria-modal="true"><header class="ms-history-head"><div><small>VERSÕES DA FICHA</small><h3>${esc(payload.name||'Personagem')}</h3></div><button type="button" data-close>×</button></header><div class="ms-version-list">${versions.length?versions.map(v=>`<article class="ms-version"><div><b>Versão ${esc(v.version_no??'—')}</b><br><small>${esc(v.created_at?new Date(v.created_at).toLocaleString('pt-BR'):'data não informada')}</small></div><button type="button" class="souls-btn small-btn" data-restore-version="${esc(v.id)}">RESTAURAR</button></article>`).join(''):'<div class="gm-empty">Ainda não há versões anteriores desta ficha.</div>'}</div></section>`;document.body.appendChild(modal);modal.querySelector('[data-close]').onclick=()=>modal.remove();modal.onclick=e=>{if(e.target===modal)modal.remove()};modal.querySelectorAll('[data-restore-version]').forEach(b=>b.onclick=async()=>{if(!confirm('Restaurar esta versão e criar um novo registro no histórico?'))return;try{await window.MS_SERVICES.Characters.restore(id,b.dataset.restoreVersion);if(typeof msHydrateRemoteGameState==='function')await msHydrateRemoteGameState();window.MS_PLATFORM?.toast('Versão restaurada. Reabra a ficha para ver os dados sincronizados.','success');modal.remove()}catch(e){window.MS_PLATFORM?.toast(e.message||'Falha ao restaurar a versão.','error')}});
  }
  function hookInputs(){const form=$('char-form');if(!form||form.dataset.msDraftHook)return;form.dataset.msDraftHook='1';form.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>saveBuilderDraft(),500);updateSummary()});form.addEventListener('change',()=>{clearTimeout(timer);timer=setTimeout(()=>saveBuilderDraft(),250);updateSummary()});document.querySelectorAll('#dynamic-tabs .tab-btn').forEach(b=>b.addEventListener('click',()=>{const m=(b.getAttribute('onclick')||'').match(/'(tab-[^']+)'/);if(m)syncSteps(m[1])}));}
  function lifecycle(){const now=active();if(now&&!lastBuilderActive){installGuide();hookInputs();setTimeout(()=>{offerRecovery();updateSummary()},80)}lastBuilderActive=now;}
  window.MS_ONLINE_UI={saveBuilderDraft,clearBuilderDraft,restoreBuilderDraft:restorePayload,offerRecovery,updateSummary};window.openCharacterHistory=openCharacterHistory;
  document.addEventListener('DOMContentLoaded',()=>{installGuide();hookInputs();const screen=$('screen-builder');if(screen)new MutationObserver(lifecycle).observe(screen,{attributes:true,attributeFilter:['class']});lifecycle()});window.addEventListener('screen:changing',()=>queueMicrotask(lifecycle));
})();
