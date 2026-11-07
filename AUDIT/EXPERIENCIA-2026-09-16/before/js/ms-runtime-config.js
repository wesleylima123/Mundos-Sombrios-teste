/* Mundos Sombrios — Runtime Configuration v2.10.1
 * CONFIGURAÇÃO GENÉRICA PARA GITHUB PAGES + QUALQUER SUPABASE.
 *
 * Para conectar:
 * 1) substitua SUPABASE_URL pelo URL público do seu projeto;
 * 2) substitua SUPABASE_PUBLISHABLE_KEY pela chave publishable/anon pública;
 * 3) NUNCA coloque service_role aqui.
 *
 * Se os campos ficarem vazios, o site ativa automaticamente o adaptador local/offline.
 */
(function(){
  'use strict';
  window.MS_RUNTIME_CONFIG = window.MS_RUNTIME_CONFIG || {
    environment: 'production',
    offlineMode: false,
    sandboxMode: false,
    storageNamespace: 'ms-local-v2100',
    supabase: {
      url: '', // ex.: https://SEU-PROJETO.supabase.co
      publishableKey: '', // chave publishable/anon pública
      environment: 'production'
    }
  };
})();
