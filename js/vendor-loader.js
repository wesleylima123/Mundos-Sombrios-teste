/* Mundos Sombrios — carregamento sob demanda de dependências pesadas V2.10.1 */
(function(){
  'use strict';
  const sources={
    fabric:{global:'fabric',src:'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js'},
    html2pdf:{global:'html2pdf',src:'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'},
    leaflet:{global:'L',src:'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',css:'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'}
  };
  async function loadScript(src,key){await window.MS_ASSETS.script(src,{dataset:{msVendor:key}});return window[sources[key].global];}
  function ensureCss(href,key){return href?window.MS_ASSETS.style(href,{dataset:{msVendorCss:key}}):Promise.resolve();}
  async function fabricLite(){
    if(window.fabric)return window.fabric;
    await window.MS_FEATURES?.ensureOperational?.();
    const value=window.MS_OPERATIONAL_CONTROL?.createFabricLite?.();
    if(!value)throw new Error('Fabric Lite local indisponível.');
    return value;
  }
  async function ensure(key){
    const spec=sources[key];if(!spec)throw new Error(`Dependência desconhecida: ${key}`);window.MS_PLATFORM?.setStatus?.('dependency','loading',null,{key});
    try{
      if(key==='fabric'&&window.MS_GRID_ARCHITECT){const value=await fabricLite();window.MS_PLATFORM?.setStatus?.('dependency','success',null,{key,adapter:'fabric-lite-local'});return value;}
      await ensureCss(spec.css,key);let value=window[spec.global];if(!value){try{value=await loadScript(spec.src,key);}catch(error){if(key==='fabric')value=await fabricLite();else throw error;}}
      window.MS_PLATFORM?.setStatus?.('dependency','success',null,{key,adapter:value?.__msLite?'fabric-lite':'full'});return value;
    }catch(error){window.MS_PLATFORM?.setStatus?.('dependency','error',error,{key});throw error;}
  }
  window.MS_VENDOR={ensure,isLoaded:key=>!!window[sources[key]?.global]};
})();
