/* Mundos Sombrios — Runtime Configuration v2.10.1 GENERIC
 * Não contém endpoint, project-ref ou chave Supabase específicos embutidos.
 * A configuração só é ativada se o proprietário preencher window.MS_RUNTIME_CONFIG manualmente.
 */
(function(){
  'use strict';
  const supplied=window.MS_RUNTIME_CONFIG?.supabase||window.MS_DB_CONFIG||{};
  const url=String(supplied.url||'').replace(/\/$/,'');
  const anonKey=String(supplied.publishableKey||supplied.anonKey||'');
  const match=url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co$/i);
  const configured=Boolean(match&&anonKey);
  const environment=String(supplied.environment||window.MS_RUNTIME_CONFIG?.environment||'unlinked');
  const config=Object.freeze({url,anonKey,projectRef:match?.[1]||'unlinked',environment,configured});
  window.MS_CONFIG=Object.freeze({version:'2.10.1',supabase:config});
  window.MS_DB_CONFIG=config;
  window.dispatchEvent(new CustomEvent('ms:config-ready',{detail:{version:'2.10.1',projectRef:config.projectRef,environment:config.environment,configured}}));
})();
