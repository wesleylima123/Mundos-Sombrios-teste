/* Mundos Sombrios — carregamento sob demanda de áreas pesadas V2.4 */
(function(){
  'use strict';
  let builderPromise=null,builderReady=false,dicePromise=null,historyPromise=null,progressionPromise=null,progressionReady=false,operationalPromise=null,operationalReady=false;
  const stylePromises=new Map();
  const runtimePromises=new Map();
  const builderCss=[
    'css/esoterico-surgery.css',
    'css/archetype-art-direction-v0.63.css',
    'css/builder/builder-modern-v0.62.css',
    'css/builder/builder-art-direction-v0.63.css',
    'css/immersive-experience.css',
    'css/forja-overhaul-v2.8.10.css',
    'css/builder/despertar.css'
  ];
  const builderScripts=[
    'js/alquerino-lab.js',
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

  const featureCss={
    table:['css/table-room.css','css/table-sheets.css','css/table-studio-v2.8.6.css','css/vtt-grid-engine.css','css/grid-architect-integrated.css'],
    master:['css/master-room.css','css/master-tools.css','css/master-command-center.css'],
    shield:['css/master-shield.css','css/master-atlas.css'],
    codex:['css/world-codices.css'],
    soul:['css/soul-economy.css'],
    operational:['css/operational-control-v2.10.1.css']
  };
  function ensureStyles(group){
    if(stylePromises.has(group))return stylePromises.get(group);
    const files=featureCss[group]||[];
    const promise=Promise.all(files.map(css)).then(()=>true).catch(error=>{stylePromises.delete(group);throw error;});
    stylePromises.set(group,promise);return promise;
  }

  const runtimeScripts={
    table:['js/table-session-engine.js','js/vtt-grid-engine.js','js/ms-soundscape-engine.js','js/grid-architect-core.js','js/ms-grid-adapter.js','js/points-ui.js','js/table-windows.js','js/table-room.js','js/table-sheets.js','js/master-tools.js'],
    master:['js/master-command-center.js','js/master-room.js','js/table-directory.js','js/master-tools.js'],
    shield:['js/master-shield-loader.js'],
    codex:['js/world-codices.js']
  };
  function ensureRuntime(group,styleGroup=group){
    if(runtimePromises.has(group))return runtimePromises.get(group);
    const files=runtimeScripts[group]||[];
    const promise=Promise.all([ensureStyles(styleGroup),...files.map(script)]).then(()=>true).catch(error=>{runtimePromises.delete(group);throw error;});
    runtimePromises.set(group,promise);return promise;
  }
  async function ensureTableRuntime(){return ensureRuntime('table','table');}
  async function ensureMasterRuntime(){return ensureRuntime('master','master');}
  async function ensureCodexRuntime(){return ensureRuntime('codex','codex');}
  async function ensureShieldRuntime(){await ensureMasterRuntime();await ensureStyles('shield');return ensureRuntime('shield','shield');}

  // Proxies mantêm os contratos globais existentes enquanto o código real passa a ser carregado sob demanda.
  if(typeof window.switchAncoragemTab!=='function'){const p=(...args)=>ensureMasterRuntime().then(()=>window.switchAncoragemTab!==p?window.switchAncoragemTab?.(...args):undefined);window.switchAncoragemTab=p;}
  if(typeof window.renderAncoragem!=='function'){const p=(...args)=>ensureMasterRuntime().then(()=>window.renderAncoragem!==p?window.renderAncoragem?.(...args):undefined);window.renderAncoragem=p;}
  if(typeof window.openMasterShield!=='function'){const p=(...args)=>ensureShieldRuntime().then(()=>window.openMasterShield!==p?window.openMasterShield?.(...args):undefined);window.openMasterShield=p;}
  if(typeof window.renderWorldCodex!=='function'){const p=(...args)=>ensureCodexRuntime().then(()=>window.renderWorldCodex!==p?window.renderWorldCodex?.(...args):undefined);window.renderWorldCodex=p;}
  async function ensureBuilder(){
    if(builderReady)return true;if(builderPromise)return builderPromise;
    builderPromise=(async()=>{
      document.body.classList.add('ms-feature-loading');window.MS_PLATFORM?.setStatus?.('builder','loading');
      await Promise.all(builderCss.map(css));
      // Scripts dinâmicos com async=false preservam ordem de execução, enquanto os downloads começam em paralelo.
      await Promise.all(builderScripts.map(script));
      builderReady=true;document.body.classList.remove('ms-feature-loading');window.MS_PLATFORM?.setStatus?.('builder','success');window.MS_PLATFORM?.emit?.('builder:extensions-ready',{});return true;
    })().catch(error=>{builderPromise=null;document.body.classList.remove('ms-feature-loading');window.MS_PLATFORM?.setStatus?.('builder','error',error);throw error});
    return builderPromise;
  }

  async function ensureProgression(){
    if(progressionReady&&window.MS_PROGRESSION)return true;
    if(progressionPromise)return progressionPromise;
    progressionPromise=(async()=>{await Promise.all([css('css/progression-v2.8.9.css'),css('css/evolution-gradual-v2.10.1.css')]);await Promise.all(['js/progression-v2.8.9.js','js/evolution-backend-v2.10.1.js','js/evolution-gradual-v2.10.1.js'].map(script));progressionReady=true;window.MS_PLATFORM?.emit?.('progression:ready',{version:'2.10.1'});return true})().catch(error=>{progressionPromise=null;throw error});
    return progressionPromise;
  }


  async function ensureOperational(){
    if(operationalReady&&window.MS_OPERATIONAL_CONTROL)return true;
    if(operationalPromise)return operationalPromise;
    operationalPromise=Promise.all([ensureStyles('operational'),script('js/operational-control-v2.10.1.js')]).then(()=>{operationalReady=true;window.MS_PLATFORM?.emit?.('operational:ready',{});return true;}).catch(error=>{operationalPromise=null;throw error});
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
  window.MS_FEATURES={ensureBuilder,ensureDice,ensureMasterHistory,ensureProgression,ensureOperational,ensureTableRuntime,ensureMasterRuntime,ensureShieldRuntime,ensureCodexRuntime,ensureTableStyles:()=>ensureStyles('table'),ensureMasterStyles:()=>ensureStyles('master'),ensureShieldStyles:()=>ensureStyles('shield'),ensureCodexStyles:()=>ensureStyles('codex'),ensureSoulStyles:()=>ensureStyles('soul'),isBuilderReady:()=>builderReady,isProgressionReady:()=>progressionReady,isOperationalReady:()=>operationalReady,builderScripts:[...builderScripts]};
})();
