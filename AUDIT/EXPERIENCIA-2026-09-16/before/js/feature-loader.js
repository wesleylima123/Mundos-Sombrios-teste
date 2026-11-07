/* Mundos Sombrios — carregamento sob demanda de áreas pesadas V2.4 */
(function(){
  'use strict';
  let builderPromise=null,builderReady=false,dicePromise=null,historyPromise=null,progressionPromise=null,progressionReady=false,operationalPromise=null,operationalReady=false;
  const builderCss=[
    'css/esoterico-surgery.css',
    'css/archetype-art-direction-v0.63.css',
    'css/builder/builder-modern-v0.62.css',
    'css/builder/builder-art-direction-v0.63.css',
    'css/immersive-experience.css',
    'css/forja-overhaul-v2.8.10.css'
  ];
  const builderScripts=[
    'js/hermetico-rituais.js',
    'js/linhagem-tree.js',
    'js/exodo-nexo.js',
    'js/aprimorador-engenharia.js',
    'js/projeto-player-interface.js',
    'js/mundos-updates.js',
    'js/esoterico-surgery.js',
    'js/gallery-editor.js',
    'js/ordem-sete.js',
    'js/power-registry.js',
    'js/immersive-experience.js',
    'js/forja-overhaul-v2.8.10.js'
  ];
  function css(href){return window.MS_ASSETS.style(href,{dataset:{msFeature:'builder'}});}
  function script(src){return window.MS_ASSETS.script(src,{dataset:{msFeatureSrc:src}});}
  async function ensureBuilder(){
    if(builderReady)return true;if(builderPromise)return builderPromise;
    builderPromise=(async()=>{
      document.body.classList.add('ms-feature-loading');window.MS_PLATFORM?.setStatus?.('builder','loading');
      await Promise.all(builderCss.map(css));
      for(const src of builderScripts)await script(src);
      builderReady=true;document.body.classList.remove('ms-feature-loading');window.MS_PLATFORM?.setStatus?.('builder','success');window.MS_PLATFORM?.emit?.('builder:extensions-ready',{});return true;
    })().catch(error=>{builderPromise=null;document.body.classList.remove('ms-feature-loading');window.MS_PLATFORM?.setStatus?.('builder','error',error);throw error});
    return builderPromise;
  }

  async function ensureProgression(){
    if(progressionReady&&window.MS_PROGRESSION)return true;
    if(progressionPromise)return progressionPromise;
    progressionPromise=(async()=>{await Promise.all([css('css/progression-v2.8.9.css'),css('css/evolution-gradual-v2.10.1.css')]);await script('js/progression-v2.8.9.js');await script('js/evolution-backend-v2.10.1.js');await script('js/evolution-gradual-v2.10.1.js');progressionReady=true;window.MS_PLATFORM?.emit?.('progression:ready',{version:'2.10.1'});return true})().catch(error=>{progressionPromise=null;throw error});
    return progressionPromise;
  }


  async function ensureOperational(){
    if(operationalReady&&window.MS_OPERATIONAL_CONTROL)return true;
    if(operationalPromise)return operationalPromise;
    operationalPromise=script('js/operational-control-v2.10.1.js').then(()=>{operationalReady=true;window.MS_PLATFORM?.emit?.('operational:ready',{});return true;}).catch(error=>{operationalPromise=null;throw error});
    return operationalPromise;
  }

  async function ensureDice(){
    if(window.MS_DICE_3D)return true;
    if(!dicePromise)dicePromise=script('js/dice-3d.js').then(()=>true).catch(error=>{dicePromise=null;throw error});
    return dicePromise;
  }
  async function ensureMasterHistory(){
    if(window.MS_MASTER_HISTORY)return true;
    if(!historyPromise)historyPromise=script('js/master-history-data.js').then(()=>true).catch(error=>{historyPromise=null;throw error});
    return historyPromise;
  }
  window.MS_FEATURES={ensureBuilder,ensureDice,ensureMasterHistory,ensureProgression,ensureOperational,isBuilderReady:()=>builderReady,isProgressionReady:()=>progressionReady,isOperationalReady:()=>operationalReady,builderScripts:[...builderScripts]};
})();
