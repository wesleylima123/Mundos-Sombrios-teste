# Mundos Sombrios V2.7.1 — Sandbox V3

## Adicionado

- `test/sandbox.html`: cópia executável da interface real sem Supabase remoto.
- `test/sandbox-runtime.js`: Mock Auth/DB/Realtime com persistência local.
- `test/sandbox-panel.js`: troca rápida de perfil, abertura de abas, reset e diagnóstico.
- `test/sandbox.css`: identificação visual inequívoca do ambiente de teste.
- `test/README-SANDBOX.md`: roteiro de uso e teste multiplayer.
- Contas de demonstração ADM, Mestre, Jogador A e Jogador B.
- Campanha e fichas de demonstração.
- Realtime local por `BroadcastChannel`, presença e event log persistido em `localStorage`.

## Segurança

O Sandbox não carrega `ms-config.js`, `@supabase/supabase-js` nem `supabase-db.js`. O build de produção continua excluindo o diretório `test/`, portanto o Sandbox não é publicado no `dist/` do GitHub Pages.
