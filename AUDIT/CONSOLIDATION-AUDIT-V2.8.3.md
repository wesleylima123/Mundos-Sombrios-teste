# Mundos Sombrios — Auditoria de Consolidação V2.8.3

**Data:** 2026-09-11  
**Baseline:** V2.8.2  
**Escopo:** frontend, CSS, shell de mesas, Portal, Forja, Escudo do Mestre, testes, referências locais, documentação de arquitetura e cadeia de migrações.  
**Regra:** nenhum item foi removido apenas por parecer redundante. Cada candidato foi classificado por consumidor, proveniência rastreável, comportamento e substituto atual.

## 1. Estado antes da consolidação — V2.8.2

- JavaScript: **42/42 arquivos sintaticamente válidos**.
- `scripts/build-site.mjs`: executável diretamente, mas o repositório não possuía `package.json`; portanto `npm run build` não era reproduzível a partir do pacote.
- Suíte: **138 testes / 115 pass / 23 fail / 0 skip**.
- `package.json` e `VERSION.txt` estavam ausentes, embora três testes dependessem deles.
- `test/sandbox.html` e `test/sandbox-runtime.js` estavam ausentes, embora **15 testes históricos** ainda os exigissem.
- `supabase-table-session-v2.7-migration.sql` estava ausente, embora **4 testes** e a migração V2.7.3 dependam dela.
- Um teste V2.4 ainda esperava `.mr-table-operational`, já substituído pela Ancoragem V3.

### Falhas da baseline

| Causa | Qtde. | Natureza |
|---|---:|---|
| `VERSION.txt` ausente | 2 | infraestrutura de release |
| `package.json` ausente | 1 | infraestrutura de build |
| sandbox histórico `test/sandbox*` ausente | 15 | dependência de teste não distribuída |
| migração-base V2.7 ausente | 4 | lacuna real do acervo SQL |
| expectativa V2.4 obsoleta | 1 | teste apontando para UI substituída |

## 2. Matriz de candidatos auditados

| Candidato | Quem usa / usava | Desde quando é rastreável | Comportamento oferecido | Implementação mais nova / canônica | Decisão |
|---|---|---|---|---|---|
| `sectionBlock()` em `portal-core.js` | **nenhum consumidor atual** | presente na V2.8.2; linhagem do Portal V0.61/V2.2 | montava seção editorial genérica | `homePanel()`, `listing()` e rotas editoriais do `portal-core.js` | **REMOVIDO** |
| `buildCSSDiceFaces()` em `script.js` | **nenhuma chamada** | compatibilidade do ciclo V2.4 | encaminhava dado legado para representação estática | `js/dice-3d.js`, renderer Canvas D4–D20 | **REMOVIDO** |
| dupla implementação de `beginNewCharacter` | botão de nova ficha e wrappers chamavam o nome global; a segunda definição sobrescrevia a primeira | proprietário documentado desde pelo menos V0.60.2; duplicação presente na V2.8.2 | abria o Builder; o “FINAL PATCH” continha guards mais completos | corpo robusto do patch final | **CONSOLIDADO em uma única função**, mantendo o mesmo contrato global |
| `renderGallery()` antigo em `script.js` | na prática era sobrescrito pelo módulo de galeria | duplicação presente na V2.8.2; `gallery-editor.js` já é proprietário canônico pelo menos desde a auditoria V2.0 | render básico da galeria | `js/gallery-editor.js` (`window.renderGallery = renderGalleryCanonical`) | **IMPLEMENTAÇÃO ANTIGA REMOVIDA**; chamada passa pelo proprietário canônico |
| IIFE `installV045CoreFix` | **ninguém**; bloco já não instalava handler algum | V0.45; comentários do próprio bloco registram aposentadoria após arquitetura online V0.65+ | historicamente consolidava salvamento/crop; na V2.8.2 era no-op | salvamento em `script.js/MS_SERVICES`; galeria em `gallery-editor.js` | **REMOVIDO** |
| `tipShow`, `tipHide`, `ALN` em `master-shield.js` | **zero referências** | pelo menos V2.8.2; arquivo não traz versão histórica confiável para esses símbolos | helpers/constante que já não participavam do Escudo | fluxo atual usa `tipMove` e renderers próprios | **REMOVIDOS** |
| 2 listeners vazios `table:session-health` | ninguém; callbacks eram `()=>{}` | linha V2.7 / Mesa V3 | registravam evento sem efeito | listener canônico via `MS_PLATFORM.on('table:session-health', ...)` | **REMOVIDOS** |
| possíveis listeners “duplicados” detectados por heurística em Atlas/Esotérico/Imersão | elementos diferentes ou instâncias de modais diferentes | módulos atuais | clique em filtros/listas/backdrop/infos distintos | não existe registro duplo no mesmo alvo+handler comprovado | **PRESERVADOS** |
| `philosopher` vs `philosophy` no Alquerino | criador de Caminho customizado | pelo menos V2.8.2 | lia em `philosopher` e persistia variável inexistente `philosophy` | contrato do restante do módulo é `philosophy` | **CORRIGIDO / UNIFICADO** |
| `.mr-table-*`, `.player-table-*`, workspace V2.4 | **sem emissor atual**; `#player-tables-list` continua ativo | Sala V0.59 / bloco jogador V2.1.1 / workspace V2.4 | cards e workspace antigos | `.anchor-v3-*` e `data-workspace-*`, linha V2.7/V3 | **CSS MORTO REMOVIDO**; hosts ativos preservados |
| `.portal-section`, `.portal-section-head`, grids `news/event/class/expansion/story` antigos | **sem emissor atual** em HTML/JS | `portal.css` legado e Portal Visual V0.62 | layout da composição anterior | `portal-home-panel*`, `portal-list-grid`, `portal-world-grid` da composição editorial atual | **CSS MORTO REMOVIDO** das duas camadas |
| `.portal-inline-link` | `homePanel()` e trilho de mundos | composição atual do Portal | CTA “ver arquivo/mundos” | continua atual | **PRESERVADO**; falso positivo descartado |
| cards `.portal-event-card`, `.portal-class-card`, `.portal-expansion-card`, `.portal-story-card` | `cardFor()` | composição atual | apresentação de conteúdo por tipo | continuam atuais | **PRESERVADOS** |
| modais `ms-rule-modal`, `eso-graft-modal`, `eso-cove-modal`, `table-directory-modal`, `ms-soul-modal`, `alchemy-bulk-qty-modal` | módulos especializados distintos | diversas versões | operações distintas; IDs/remoção defensiva quando reutilizáveis | não há modal único funcionalmente equivalente | **PRESERVADOS** |
| múltiplos `DOMContentLoaded` em `script.js` | auth, formulário, atributos e Alquerino | acúmulo histórico | inicializam subsistemas diferentes | nenhum bootstrap único comprovadamente equivalente | **PRESERVADOS** |
| wrappers `oldSelect*`, `oldLoad`, `oldOpen`, `oldToggle`, `renderMerc16` | Nexo, Ordem dos Sete, Power Registry e módulos de mundos | várias gerações da Forja | interceptam APIs globais para módulos especializados/lazy | ainda não há dispatcher de hooks equivalente | **PRESERVADOS — dívida técnica controlada** |
| fallback `btn-forge-sheet-item` | somente se o markup não fornecer o botão | compatibilidade da Forja | cria controle defensivamente | HTML atual já possui o elemento | **PRESERVADO**, pois é guardado e inócuo no caminho atual |
| IDs iguais em renderers especializados (`pb-*`, `tree-unlocked-data`, etc.) | telas mutuamente exclusivas | várias versões | mesmo contrato de campo em renderers substitutivos | não coexistem no DOM | **PRESERVADOS** |
| CSS repetido em camadas base/responsivas | folhas atuais | várias versões | overrides por breakpoint/tema/estado | não há substituição 1:1 segura | **PRESERVADO quando possui emissor/efeito atual** |
| `tables.participants` | compatibilidade de leitura/fallback | arquitetura V2.x | lê instalações/backups antigos | `table_members` é fonte canônica | **PRESERVADO somente como compatibilidade** |
| migrações SQL versionadas antigas | instalações evolutivas | histórico V2.x | trilha de upgrade | `supabase-production.sql` ainda não substitui toda a cadeia com segurança | **PRESERVADAS** |
| `supabase-table-session-v2.7-migration.sql` | V2.7.3 + 4 testes estruturais | dependência declarada pela V2.7.3 | deveria instalar a base de sessão/Realtime V2.7 | nenhuma cópia confiável foi encontrada | **NÃO RECRIADO POR INFERÊNCIA** |
| marcadores `deprecated` / `@deprecated` | nenhum encontrado | — | — | — | **nenhuma ação** |
| imports/referências locais removidas | nenhum erro encontrado | — | `<script>/<link>` + assets lazy resolvem para arquivos existentes | — | **sem ação** |
| rotas/telas antigas | nenhum alvo literal de `showScreen()` órfão | — | 9 alvos literais auditados, todos presentes no HTML | — | **sem remoção** |
| flags/variáveis sem uso | nenhuma declaração simples `const/let/var` com ocorrência lexical única após consolidação | — | estados restantes possuem consumidor | — | **sem remoção adicional** |

## 3. Consolidação executada

### Produção
1. Removidos `sectionBlock()` e `buildCSSDiceFaces()` sem consumidores.
2. Consolidado `beginNewCharacter` em uma única implementação robusta, sem alterar o nome público.
3. Removida a implementação antiga de `renderGallery`; `gallery-editor.js` permanece proprietário canônico.
4. Removido o IIFE V0.45 já totalmente inerte.
5. Removidos `tipShow`, `tipHide` e `ALN` sem referências no Escudo do Mestre.
6. Removidos dois listeners vazios de `table:session-health`; mantido o barramento `MS_PLATFORM`.
7. Corrigido o contrato Alquerino para `philosophy`.
8. Removidos seletores sem emissor de cards/workspace antigos da Sala dos Mestres.
9. Removidos seletores sem emissor da composição antiga do Portal em `portal.css` e `portal-visual-v0.62.css`, preservando cards, `portal-inline-link`, `portal-world-grid` e `portal-list-grid` ativos.

### QA / release
1. Criados `package.json` e `VERSION.txt` em **2.8.3**, sem dependências externas.
2. Adicionado `tests/consolidation-v2.8.3.test.js` com guardas contra reintrodução dos resíduos, referências quebradas e IDs estáticos duplicados.
3. Testes históricos do sandbox passam a ser **condicionais** quando `test/sandbox*` não acompanha o pacote; não foram apagados.
4. Testes da migração-base V2.7 passam a ser **condicionais** quando o SQL ausente não existe; não foram apagados.
5. Teste V2.4 atualizado para a Ancoragem V3 vigente.
6. `ARCHITECTURE/CURRENT.md` atualizado para 2.8.3 e documenta a consolidação e a lacuna da V2.7.

## 4. Antes/depois quantitativo

| Métrica | V2.8.2 | V2.8.3 | Variação |
|---|---:|---:|---:|
| JS de produção | 42 arq. / 4.150.735 B / 15.152 linhas | 42 arq. / 4.145.596 B / 15.080 linhas | **−5.139 B / −72 linhas** |
| CSS | 19 arq. / 402.537 B / 1.855 linhas | 19 arq. / 394.974 B / 1.835 linhas | **−7.563 B / −20 linhas** |
| JS + CSS | 4.553.272 B | 4.540.570 B | **−12.702 B** |
| arquivos de teste | 20 | 21 | +1 suíte de consolidação |
| testes executados | 138 | 148 | +10 |
| pass | 115 | **129** | +14 |
| fail | 23 | **0** | **−23** |
| skip justificado | 0 | **19** | 15 sandbox histórico + 4 migração V2.7 ausente |

Nenhum arquivo de produção foi apagado fisicamente: as consolidações ocorreram dentro dos proprietários existentes. Os `SKIP` correspondem exclusivamente a artefatos que já estavam ausentes na baseline; não foram usados para esconder regressões de produção.

## 5. Build e testes finais

Comando:

```text
npm run build
```

Resultado final:

```text
syntax: 42 arquivos JavaScript válidos
node:test: 148 total / 129 pass / 0 fail / 19 skip
build-site: PASS
saída gerada: dist/
```

O build mantém SQL, testes e auditorias fora da publicação gerada em `dist/`.

## 6. Itens deliberadamente não consolidados

### 6.1 Migração-base V2.7 ausente — risco alto
`supabase-table-session-v2.7.3-migration.sql` declara dependência de `supabase-table-session-v2.7-migration.sql`, mas a base não existe na V2.8.2 recebida. Como a estrutura completa não pode ser derivada de forma confiável apenas da V2.7.3, nenhum SQL foi inventado.

### 6.2 `supabase-production.sql` não substitui toda a cadeia V2.7/V2.8 — risco médio/alto
O consolidado contém correções V2.8.2, mas partes de sessão/diretório permanecem distribuídas em migrações posteriores. Fundir cegamente arquivos enquanto a base V2.7 está ausente criaria falsa sensação de reprodutibilidade.

### 6.3 Wrappers da Forja — dívida técnica controlada
Wrappers globais ainda possuem consumidores reais. Removê-los agora alteraria ordem de carregamento e extensões dos modos. Uma próxima consolidação segura exige um registro formal de hooks/plugins e migração módulo a módulo com testes funcionais equivalentes.

## 7. Conclusão

A V2.8.3 consolida apenas resíduos comprovados, preserva compatibilidade ativa e reduz **12.702 bytes** de JS/CSS de produção sem remover funcionalidades. Duplicidades de criação de ficha e galeria foram reduzidas a proprietários canônicos; listeners vazios, bloco V0.45 inerte e CSS sem emissor foram retirados; a divergência `philosopher/philosophy` foi corrigida. O build final passa com **0 falhas**. A principal pendência estrutural continua sendo a migração-base V2.7 ausente do material recebido.
