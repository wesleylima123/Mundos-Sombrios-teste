/* Mundos Sombrios — Grid Architect adapter V2.11.2 */
(function(){
  'use strict';
  const boot=()=>{const A=window.MS_GRID_ARCHITECT;if(!A)return false;A.boot();const G=window.MS_GRID_ENGINE;if(G){const applyRemote=G.applyRemote?.bind(G),setConfig=G.setConfig?.bind(G);window.MS_GRID_ADAPTER=Object.freeze({version:'2.11.2',architect:A,legacy:G,loadScene(scene){A.loadScene(scene);if(scene?.gridConfig)A.updateFromGridConfig(scene.gridConfig);return A.state()},applyGrid(cfg){A.updateFromGridConfig(cfg);return applyRemote?.(cfg)},setGrid(cfg,opts){A.updateFromGridConfig(cfg);return setConfig?.(cfg,opts)},serialize:()=>A.serialize(),migrateLegacy:scene=>A.migrateLegacy(scene)});}
    return true};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
  window.MS_PLATFORM?.on?.('vtt:entered',()=>setTimeout(boot,0));
})();
