# Mundos Sombrios — Mapa do Projeto para Leigos

## O que é este site
Uma plataforma web de RPG. Um único arquivo `index.html` contém TODAS as telas
(Portal público, login, Encruzilhada, Forja de personagem, Ficha, Mesa ao Vivo/VTT,
Ancoragem, Sala dos Mestres, Escudo do Mestre, Arconte/ADM, Códices). O JavaScript
troca a tela visível conforme você navega. Não existe PHP, nem servidor próprio.

## Regra de ouro do projeto
> Uma funcionalidade deve ter um dono. Um estado deve ter uma fonte.
> Uma correção deve ter um teste.
Fonte de verdade = Supabase (Postgres + RLS + RPC + Realtime).
Não há modo offline nesta versão: sem URL/chave configuradas em
`js/ms-runtime-config.js`, login, fichas e mesas não funcionam.
(O antigo adaptador `offline-db.js` e o Sandbox foram retirados; uma cópia de
referência ficou em `AUDIT/ARTE-MESA-2026-09-16/before/js/offline-db.js`.)

## As 5 camadas (de cima para baixo)
1. **Tela** — `index.html`
2. **Barramento** — `js/ms-platform.js` (eventos/estado) + `js/feature-loader.js` (carrega o pesado só quando precisa)
3. **Serviços** — `js/ms-services.js` (Auth, Profile, Characters, Games, VTT, Content, Soul)
4. **Transporte** — `js/supabase-db.js` + `js/ms-realtime.js`
5. **Dados** — Supabase (Postgres); o navegador guarda só preferências de interface

## Onde mexer, por assunto
| Quero mexer em... | Arquivo dono |
|---|---|
| Aparência geral | `css/style.css` |
| Portal público (home, notícias) | `js/portal/portal-core.js`, `js/portal/portal-content.js`, `css/portal/portal-editorial-v2.2.css` |
| CMS do Portal (ADM) | `js/portal/portal-admin.js`, `js/portal/portal-media.js` |
| Criar/editar personagem (Forja) | `js/script.js` (~5.650 linhas), `js/forja-overhaul-v2.8.10.js`, `js/power-registry.js` |
| Módulos de classe/expansão | `js/alquerino-lab.js`, `js/hermetico-rituais.js`, `js/esoterico-surgery.js`, `js/exodo-nexo.js`, `js/aprimorador-engenharia.js`, `js/projeto-player-interface.js`, `js/linhagem-tree.js`, `js/ordem-sete.js`, `js/mundos-updates.js` (Envolto, Mercador e legado) |
| Galeria / retrato | `js/gallery-editor.js` |
| Ficha, atributos, perícias | `js/script.js`, `js/progression-v2.8.9.js` |
| Evolução Gradual (PEG/trilhas) | `js/evolution-backend-v2.10.1.js`, `js/evolution-gradual-v2.10.1.js`, `js/operational-control-v2.10.1.js`, `js/points-ui.js` |
| Mesa ao Vivo (shell, janelas, sessão) | `js/table-room.js` (define `MS_TABLE_SHELL`), `js/table-windows.js`, `js/table-sheets.js`, `js/table-session-engine.js` |
| Grid / mapa / totens | `js/grid-architect-core.js`, `js/vtt-grid-engine.js`, `js/ms-grid-adapter.js`, `js/master-tools.js` |
| Som da mesa | `js/ms-soundscape-engine.js`, `data/grid-architect/soundscapes.json` |
| Dados 3D | `js/dice-3d.js` |
| Ancoragem (lista de mesas) | `js/master-room.js`, `js/table-directory.js` |
| Sala/Centro de Comando do Mestre | `js/master-command-center.js`, `js/master-tools.js` |
| Escudo do Mestre | `js/master-shield.js`, `js/master-shield-data.js`, `js/master-shield-docs.js` (acervo, só na aba Arquivos), `js/master-atlas.js` |
| ADM / Arconte | `js/script.js` (painel), `js/ms-online-ui.js` |
| Economia (SoulDrakma) | `js/soul-economy.js` |
| Códices / conteúdo | `js/world-codices.js`, `js/codex-catalog.js` |
| Liga o Supabase | `js/ms-runtime-config.js` |
| Banco de dados | `supabase-install-completo-v2.10.1.sql` |

## Arquivos que confundem (e o que fazer)
- **SQL:** só `supabase-install-completo-v2.10.1.sql` (na raiz) vale para banco novo.
  Tudo em `sql/historico/` é histórico. Em especial,
  `sql/historico/migrations-cli-nao-aplicar/` contém migrações que trocam
  `progression_table_state` por uma versão vazia — **não aplique**.
- Dos pares `.v2.10.0` / `.v2.10.1`, **sempre o V2.10.1 é o que está vivo**.
- `js/mundos-updates.js` é legado mantido por compatibilidade (e contém o texto
  dos rituais do Envolto) — não crie outro arquivo de patch global.
- `ARCHIVE/`, `AUDIT/` e `CHANGELOG/` são documentação e cópias antigas; não
  entram no site publicado. Alguns textos antigos citam `table-shell-v3.js` e
  `offline-db.js`, que não existem mais.

## Como rodar e testar
```
npm run syntax       # valida sintaxe de todos os .js
npm test             # roda a bateria de testes (node --test)
npm run build        # tudo acima + gera dist/ (o que vai para o GitHub Pages)
node scripts/local-server.mjs   # servidor local
```

## Ordem de leitura recomendada (para entender de verdade)
1. `ARCHITECTURE/CURRENT.md` — o que é cada módulo e quem é dono de quê
2. `ARCHITECTURE/PROGRAMMING-GLOSSARY-PTBR.md` — glossário + receita de correção de bug
3. `index.html` — procure `<script src=` para ver a ordem de carregamento
4. `js/ms-platform.js` e `js/ms-services.js` — o núcleo
5. `js/script.js` — a Forja (maior arquivo; leia por função, não de ponta a ponta)
6. `js/feature-loader.js` — explica o que é carregado sob demanda
