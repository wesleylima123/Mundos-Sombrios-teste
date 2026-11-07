# Site Oficial MS V2.10.4 — GitHub + Supabase

Este pacote é genérico: não está vinculado a repositório GitHub nem projeto Supabase específico.

## 1. Configurar um Supabase
1. Crie ou escolha um projeto Supabase.
2. Em uma instalação nova, execute `supabase-install-completo-v2.10.1.sql` no SQL Editor.
3. Edite `js/ms-runtime-config.js` e informe somente:
   - `url`: URL pública do projeto;
   - `publishableKey`: chave **publishable** ou **anon** pública.
4. Nunca coloque `service_role`, secret key ou senha do banco no frontend.

Se `url` e `publishableKey` permanecerem vazios, o site usa o adaptador local/offline.

## 2. GitHub Pages
O pacote de produção inclui `.github/workflows/pages.yml` genérico. Envie o conteúdo para a raiz do repositório, configure **Settings > Pages > GitHub Actions** e faça push em `main` ou execute o workflow manualmente.

O workflow executa `npm run build` e publica apenas `dist/`.

## 3. Sandbox
O pacote `Site-oficial-MS_2.10.4_COMPLETO-COM-SANDBOX.zip` inclui `sandbox-offline/` e o marcador `PUBLISH-SANDBOX`, portanto o workflow também publica essa rota no GitHub Pages. O pacote SEM SANDBOX não publica a área QA.

## 4. Validação recomendada após conectar um backend real
Valide login, RLS por papel, fichas, viewer, criação/entrada/exclusão de Mesa, Realtime, SoulDrakma, PEG, Núcleo de Evolução, Arconte e reversões de ledger.
