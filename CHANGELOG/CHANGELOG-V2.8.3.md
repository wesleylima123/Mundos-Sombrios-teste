# V2.8.3 — Auditoria de Consolidação

## Produção
- Removido `sectionBlock()` sem consumidores do Portal.
- Removido `buildCSSDiceFaces()` sem chamadas; `js/dice-3d.js` continua proprietário do renderer de dados.
- Consolidado `beginNewCharacter` em uma única implementação robusta; removida a definição final que sobrescrevia a primeira.
- Removido `renderGallery()` antigo de `script.js`; `js/gallery-editor.js` permanece proprietário canônico.
- Removido o IIFE histórico V0.45 que já não instalava comportamento.
- Removidos `tipShow`, `tipHide` e `ALN` sem referências do Escudo do Mestre.
- Removidos dois listeners vazios de `table:session-health`; mantido o listener canônico via `MS_PLATFORM`.
- Corrigida a divergência `philosopher`/`philosophy` no cadastro de Caminhos alquímicos customizados.
- Removidos estilos sem emissor dos cards/workspace anteriores à Ancoragem V3.
- Removidos, de `portal.css` e `portal-visual-v0.62.css`, containers/grids da composição antiga sem emissor; estilos de cards, `portal-inline-link`, `portal-world-grid` e `portal-list-grid` permanecem ativos.

## QA e infraestrutura
- Adicionados `package.json` e `VERSION.txt` em V2.8.3 para build/testes reproduzíveis.
- Adicionada suíte `consolidation-v2.8.3.test.js` com 9 guardas de consolidação.
- Testes do sandbox histórico V2.7.1 foram preservados e tornam-se condicionais quando `test/sandbox*` não acompanha o pacote.
- Testes da migração-base V2.7 foram preservados e tornam-se condicionais quando `supabase-table-session-v2.7-migration.sql` não está disponível.
- Expectativa V2.4 atualizada para o contrato vigente da Ancoragem V3.
- Build final: **148 testes / 129 pass / 0 fail / 19 skip**, com **42/42 JS sintaticamente válidos**.

## Compatibilidade preservada
- Wrappers especializados da Forja que ainda interceptam APIs globais não foram removidos.
- Modais especializados com comportamentos distintos não foram fundidos.
- Migrações versionadas históricas não foram apagadas.
- `tables.participants` continua apenas como compatibilidade de leitura/fallback; `table_members` permanece fonte canônica.

## Lacuna conhecida
`supabase-table-session-v2.7-migration.sql` não existe no material recebido, embora V2.7.3 dependa dele. Nenhum SQL foi reconstruído por inferência.
