# Mundos Sombrios

Plataforma web de RPG (versão em `VERSION.txt`). Um único `index.html` contém todas as telas: Portal, Forja de personagem, Ficha, Mesa ao Vivo (VTT com Grid Architect), Ancoragem, Sala dos Mestres, Escudo do Mestre, Arconte (ADM) e Códices.

- **Frontend:** HTML/CSS/JavaScript puro, sem framework e sem servidor próprio.
- **Backend:** Supabase (Auth, Postgres com RLS, RPC, Realtime e Storage).
- **Hospedagem:** GitHub Pages, publicado pelo workflow `.github/workflows/pages.yml`.

> O site precisa de um projeto Supabase configurado. Não existe modo offline nesta versão.

## Começando

1. Banco novo: rode **somente** `supabase-install-completo-v2.10.1.sql` no SQL Editor do Supabase.
2. Preencha `js/ms-runtime-config.js` com a URL do projeto e a chave **publishable/anon** (nunca `service_role`).
3. No Supabase, em Auth > URL Configuration, inclua o endereço do site (com o caminho do GitHub Pages).
4. Faça push em `main`; o GitHub Actions roda o build e publica `dist/`.

Os arquivos em `sql/historico/` são migrações e patches antigos, guardados só como histórico. Não rode nenhum deles num banco novo.

## Comandos

```
npm run syntax   # valida a sintaxe de todos os .js
npm test         # roda a bateria de testes (node --test)
npm run build    # versão + sintaxe + testes + gera dist/
node scripts/local-server.mjs   # servidor local para testar
```

## Onde está cada coisa

Veja `MAPA-PROJETO-PTBR.md` para o mapa completo de arquivos por assunto e `ARCHITECTURE/CURRENT.md` para as regras de arquitetura.
