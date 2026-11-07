/* Carregador canônico: Forja, Escudo e dependências compartilham uma promessa
 * por URL. Uma falha remove o elemento para permitir uma nova tentativa real. */
(function () {
  'use strict';
  const pending = new Map();
  function load(kind, path, options = {}) {
    const url = new URL(path, document.baseURI).href;
    const key = `${kind}:${url}`;
    if (pending.has(key)) return pending.get(key);
    const selector = kind === 'script' ? 'script[src]' : 'link[rel="stylesheet"]';
    const existing = [...document.querySelectorAll(selector)].find(node =>
      new URL(kind === 'script' ? node.src : node.href, document.baseURI).href === url);
    if (existing && (existing.dataset.loaded === '1' || (kind === 'style' && existing.sheet) || (kind === 'script' && !existing.dataset.msAssetPending))) {
      return Promise.resolve(existing);
    }
    const node = existing || document.createElement(kind === 'script' ? 'script' : 'link');
    const promise = new Promise((resolve, reject) => {
      function cleanup() {
        node.removeEventListener('load', loaded);
        node.removeEventListener('error', failed);
      }
      function loaded() { cleanup(); delete node.dataset.msAssetPending; node.dataset.loaded = '1'; resolve(node); }
      function failed() {
        cleanup(); node.remove(); pending.delete(key);
        reject(new Error(`Não foi possível carregar ${path}`));
      }
      node.addEventListener('load', loaded, { once: true });
      node.addEventListener('error', failed, { once: true });
      if (!existing) {
        if (options.id) node.id = options.id;
        Object.assign(node.dataset, options.dataset || {});
        node.dataset.msAssetPending = '1';
        if (kind === 'script') { node.async = false; node.src = path; }
        else { node.rel = 'stylesheet'; node.href = path; }
        document.head.appendChild(node);
      }
    });
    pending.set(key, promise);
    return promise;
  }
  window.MS_ASSETS = Object.freeze({
    script: (src, options) => load('script', src, options),
    style: (href, options) => load('style', href, options)
  });
})();
