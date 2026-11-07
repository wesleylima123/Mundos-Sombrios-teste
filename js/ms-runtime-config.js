/* Mundos Sombrios — Runtime Configuration v2.10.4
 * CONFIGURAÇÃO GENÉRICA PARA GITHUB PAGES + QUALQUER SUPABASE.
 *
 * Para conectar:
 * 1) substitua SUPABASE_URL pelo URL público do seu projeto;
 * 2) substitua SUPABASE_PUBLISHABLE_KEY pela chave publishable/anon pública;
 * 3) NUNCA coloque service_role aqui.
 *
 * Se esta configuração for removida manualmente, o fallback local também permanece suportado.
 */
(function(){
  'use strict';
  window.MS_RUNTIME_CONFIG = window.MS_RUNTIME_CONFIG || {
    environment: 'production',
    storageNamespace: 'ms-local-v2100',
    supabase: {
      url: 'https://xhcunksjrksdzdtabfxt.supabase.co',
      publishableKey: 'sb_publishable_Yq3SDfQEaX_vxdZKvADyMQ_evvVDqdi',
      environment: 'production'
    }
  };
})();
