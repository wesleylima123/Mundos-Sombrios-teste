# V2.10.4 — Correção do modo Offline e SANDBOX

- Corrigida regressão do carregador offline causada pela combinação de `defer` com `document.write()`.
- Criada distribuição `offline-local/` derivada da árvore canônica.
- SANDBOX passa a substituir o bootstrap remoto por `offline-db.js` diretamente.
- SDK remoto do Supabase e Google Fonts são removidos do boot das distribuições locais para evitar bloqueio sem internet.
- `MS_DB_READY` sincroniza o bootstrap do banco com restauração de sessão e login.
- Lançadores Windows agora abrem as rotas corretas e aceitam Python ou Node.js como servidor local.
- Convenção de pacote adotada: `Site-oficial-MS_<versão>`.

- Corrigida a ordem dos lançadores Windows: o servidor é iniciado antes da abertura do navegador.
- Portas locais dedicadas reduzem conflito com serviços comuns: 8765 (Offline) e 8766 (SANDBOX).
- O pacote COM SANDBOX passa a levar `PUBLISH-SANDBOX`, permitindo que o workflow do GitHub Pages publique `sandbox-offline/`.
- Padronização de empacotamento: `Site-oficial-MS_<versão>`.
