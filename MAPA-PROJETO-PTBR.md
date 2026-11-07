# Mundos Sombrios V2.10.1 — Mapa do Projeto para Leigos

## O que é este site
Uma plataforma web de RPG. Um único arquivo `index.html` contém TODAS as telas
(Portal público, login, Forja de personagem, Ficha, Mesa ao Vivo/VTT, Ancoragem,
Centro de Comando do Mestre, Arconte/ADM, Códices). O JavaScript troca a tela
visível conforme você navega. Não existe PHP, nem servidor próprio.

## Regra de ouro do projeto
> Uma funcionalidade deve ter um dono. Um estado deve ter uma fonte.
> Uma correção deve ter um teste.
Fonte de verdade = Supabase (Postgres + RLS + RPC + Realtime).
Sem URL/chave configurada, o site cai no adaptador offline local (`js/offline-db.js`).

## As 5 camadas (de cima para baixo)
1. **Tela** — `index.html` (295 IDs, 98 handlers `onclick=` embutidos)
2. **Barramento** — `js/ms-platform.js` (eventos/estado) + `js/feature-loader.js` (carrega o pesado só quando precisa)
3. **Serviços** — `js/ms-services.js` (Auth, Profile, Characters, Games, VTT, Content, Soul)
4. **Transporte** — `js/supabase-db.js` (online) ou `js/offline-db.js` (plano B)
5. **Dados** — Supabase (Postgres) ou preferências no navegador (nunca ficha/senha/regra)

## Onde mexer, por assunto
| Quero mexer em... | Arquivo dono |
|---|---|
| Aparência geral | `css/style.css` |
| Portal público (home, notícias) | `js/portal/portal-core.js`, `css/portal/portal-editorial-v2.2.css` |
| Criar/editar personagem (Forja) | `js/script.js` (6833 linhas), `js/esoterico-surgery.js`, `js/power-registry.js` |
| Ficha, atributos, perícias | `js/script.js`, `js/progression-v2.8.9.js` |
| Evolução Gradual (PEG/trilhas) | `js/evolution-backend-v2.10.1.js`, `js/evolution-gradual-v2.10.1.js`, `js/operational-control-v2.10.1.js` |
| Mesa ao Vivo / VTT / dados 3D | `js/table-shell-v3.js`, `js/table-session-engine.js`, `js/dice-3d.js` |
| Ancoragem (lista de mesas) | `js/master-room.js`, `js/table-directory.js` |
| Sala/Centro de Comando do Mestre | `js/master-command-center.js`, `js/imersive-experience.js` |
| ADM / Arconte | `js/ms-online-ui.js` |
| Economia (SoulDrakma) | `js/soul-economy.js` |
| Códices / conteúdo | `js/world-codices.js`, `js/codex-catalog.js` |
| Liga/desliga Supabase | `js/ms-runtime-config.js` |
| Banco de dados | `supabase-install-completo-v2.10.1.sql` |

## Arquivos que confundem (e o que fazer)
O projeto acumulou cópias por versão. Alguns arquivos estavam **mortos** (nenhuma
referência no pacote) e foram removidos nesta revisão:
`forja-overhaul-v2.8.8.js`, `ms-consolidation-v2.9.0.js`, `ms-consolidation-v2.10.0.js`,
`ms-consolidation-v2.10.1.js`, `operational-control-v2.10.0.js`,
`evolution-gradual-v2.10.0.js`, `evolution-backend-v2.10.0.js`.
Dos pares `.v2.10.0` / `.v2.10.1`, **sempre o V2.10.1 é o que está vivo**.
`js/mundos-updates.js` é legado (1579 linhas) mantido por compatibilidade — não
crie outro arquivo de patch global.

## Como rodar e testar
```
npm run sandbox      # reconstrói sandbox-offline/ a partir do código-fonte
npm run syntax       # valida sintaxe de todos os .js
npm test             # roda a bateria de testes (node --test)
npm run build        # tudo acima + gera dist/ (o que vai para o GitHub Pages)
```
Atalhos Windows: `INICIAR-SITE-OFFLINE.bat` / `INICIAR-SANDBOX.bat`.

## Ordem de leitura recomendada (para entender de verdade)
1. `ARCHITECTURE/CURRENT.md` — o que é cada módulo e quem é dono de quê
2. `ARCHITECTURE/PROGRAMMING-GLOSSARY-PTBR.md` — glossário + receita de correção de bug
3. `index.html` — procure `<script src=` para ver a ordem de carregamento
4. `js/ms-platform.js` e `js/ms-services.js` — o núcleo
5. `js/script.js` — a Forja (maior arquivo; leia por função, não de ponta a ponta)
6. `js/feature-loader.js` — explica o que é carregado sob demanda
