# Mundos Sombrios V2.10.1 — instalação local sem vínculo

A V2.10.1 não contém URL, project-ref, chave Supabase ou remote GitHub específicos.

- Sem configuração remota, o site usa `js/offline-db.js`.
- O sandbox integral usa a mesma aplicação com namespace local independente.
- Para conectar um Supabase futuramente, edite somente `js/ms-runtime-config.js` e use uma chave pública publishable/anon.
- Para instalação nova do banco, use `supabase-install-completo-v2.10.1.sql`.
- Nunca exponha `service_role` no frontend.

Nenhuma publicação ou conexão remota é necessária para testar a versão local.
