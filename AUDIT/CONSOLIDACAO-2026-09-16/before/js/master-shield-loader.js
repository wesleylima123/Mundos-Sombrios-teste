/* Mundos Sombrios — carregamento sob demanda do Escudo do Mestre v2.7.3 */
(function(){
  'use strict';
  let pending=null;
  const loaderOpen=async function(){
    const role=String(window.currentUser?.role||'').toLowerCase();
    const allowed=typeof window.msCanAccessMasterShield==='function'?window.msCanAccessMasterShield():(role==='mestre'||role==='admin');
    if(!allowed){alert('Acesso restrito a Mestres e ADM.');return;}
    window.captureMasterShieldReturnContext?.();
    window.MasterTools?.collapseMemoryPanel?.();
    if(typeof window.showScreen==='function')window.showScreen('screen-master-shield');
    window.syncMasterShieldReturnUI?.();
    const root=document.getElementById('master-shield-content');
    if(root&&!window.msShieldNavigate)root.querySelector('.master-shield-body')?.insertAdjacentHTML('afterbegin','<div id="ms-shield-loading" class="panel"><b>ABRINDO ACERVO RESTRITO…</b><p>Carregando cronologia, cartografia e compêndio somente agora.</p></div>');
    if(!pending)pending=(async()=>{await load('js/master-shield-data.js','ms-shield-data');await load('js/master-atlas-data.js','ms-atlas-data');await load('js/master-atlas.js','ms-atlas-core');await load('js/master-shield.js','ms-shield-core');})();
    try{await pending;document.getElementById('ms-shield-loading')?.remove();if(window.openMasterShield!==loaderOpen)return window.openMasterShield();}
    catch(e){pending=null;document.getElementById('ms-shield-loading')?.remove();window.MS_PLATFORM?.toast(e.message||'Não foi possível carregar o Escudo.','error');}
  };
  function load(src,id){return new Promise((resolve,reject)=>{const existing=document.getElementById(id);if(existing){if(existing.dataset.loaded==='1')return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return;}const script=document.createElement('script');script.id=id;script.src=src;script.async=false;script.onload=()=>{script.dataset.loaded='1';resolve()};script.onerror=()=>reject(new Error(`Falha ao carregar ${src}`));document.head.appendChild(script);});}
  window.openMasterShield=loaderOpen;
})();
