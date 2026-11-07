/* Mundos Sombrios — carregamento sob demanda de dependências pesadas V2.10.1 */
(function(){
  'use strict';
  const cache=new Map();
  const sources={
    fabric:{global:'fabric',src:'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js'},
    html2pdf:{global:'html2pdf',src:'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'},
    leaflet:{global:'L',src:'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',css:'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'}
  };
  function loadScript(src,key){
    if(cache.has(key))return cache.get(key);
    const p=new Promise((resolve,reject)=>{const existing=document.querySelector(`script[data-ms-vendor="${key}"]`);if(existing){if(existing.dataset.loaded==='1')return resolve(window[sources[key].global]);existing.addEventListener('load',()=>resolve(window[sources[key].global]),{once:true});existing.addEventListener('error',()=>reject(new Error(`Falha ao carregar ${key}`)),{once:true});return;}const s=document.createElement('script');s.src=src;s.async=true;s.dataset.msVendor=key;s.onload=()=>{s.dataset.loaded='1';resolve(window[sources[key].global]);};s.onerror=()=>reject(new Error(`Falha ao carregar ${key}. Verifique sua conexão.`));document.head.appendChild(s);}).catch(err=>{cache.delete(key);throw err});cache.set(key,p);return p;
  }
  function ensureCss(href,key){if(!href)return Promise.resolve();const existing=document.querySelector(`link[data-ms-vendor-css="${key}"]`);if(existing)return Promise.resolve();return new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.dataset.msVendorCss=key;link.onload=resolve;link.onerror=()=>reject(new Error(`Falha ao carregar estilos de ${key}`));document.head.appendChild(link);});}
  function offlineRuntime(){const c=window.MS_RUNTIME_CONFIG||{};return c.offlineMode===true||c.sandboxMode===true||String(c.environment||'').toLowerCase()==='sandbox';}
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
      if(key==='fabric'&&offlineRuntime()){const value=await fabricLite();window.MS_PLATFORM?.setStatus?.('dependency','success',null,{key,adapter:'fabric-lite'});return value;}
      await ensureCss(spec.css,key);let value=window[spec.global];if(!value){try{value=await loadScript(spec.src,key);}catch(error){if(key==='fabric')value=await fabricLite();else throw error;}}
      window.MS_PLATFORM?.setStatus?.('dependency','success',null,{key,adapter:value?.__msLite?'fabric-lite':'full'});return value;
    }catch(error){window.MS_PLATFORM?.setStatus?.('dependency','error',error,{key});throw error;}
  }
  window.MS_VENDOR={ensure,isLoaded:key=>!!window[sources[key]?.global]};
})();
