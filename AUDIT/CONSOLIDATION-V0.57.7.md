# Auditoria de Consolidação — Mundos Sombrios v0.57.7

## Objetivo
Auditar resíduos de implementações antigas sem remover código apenas por aparência de redundância. Cada candidato foi classificado por uso, origem, comportamento e existência de implementação mais nova.

## Antes
- Base auditada: v0.57.6.
- `js/mundos-updates.js`: 2.533 linhas.
- `js/linhagem-tree.js`: 429 linhas.
- `js/ordem-sete.js`: 271 linhas.
- Os testes QA continham 1 caminho absoluto temporário (`/mnt/data/envolto-work/js/script.js`).
- Não havia IDs HTML duplicados.
- As referências locais de scripts/CSS existiam.

## Itens consolidados

| Item | Evidência | Origem | Comportamento | Implementação nova | Ação |
|---|---|---|---|---|---|
| Bloco Envolto V0.21 | Seletores `.envolto-skilltree-window`, `.envolto-tier-node` etc.; o renderer atual produz `#ef-space-final`/`.ef-node` e não produz essas classes | `mundos-updates.js` V0.21 | Decorava nós antigos do skill tree | Renderer canônico em `script.js` + CSS `#ef-space-final` | REMOVIDO |
| Bloco Envolto V0.22 | Mesma divergência de classes; nenhum seletor V0.22 é emitido pelo renderer atual | `mundos-updates.js` V0.22 | Aplicava tema gráfico antigo e classes `v22-*` | Tema atual do Espaço Final em `script.js` + `style.css` | REMOVIDO |
| `t2AvailableForT1` | Única ocorrência era a declaração | `linhagem-tree.js` | Calculava opções Tier 2, mas nunca era chamado | Fluxo atual consulta diretamente a lógica de pré-requisito/renderização | REMOVIDO |
| `t3AvailableForBranch` | Única ocorrência era a declaração | `linhagem-tree.js` | Calculava opções Tier 3, mas nunca era chamado | Fluxo atual usa `prereqSatisfied` na renderização | REMOVIDO |
| `selectedT1Skill` | Única ocorrência era a declaração | `linhagem-tree.js` | Lookup não utilizado | Não havia consumidor | REMOVIDO |
| `enterOrderPowers` | Única ocorrência era a declaração | `ordem-sete.js` | Encaminhava para backup/render de poderes | Nenhuma chamada restante | REMOVIDO |
| `safeText` no V0.45 | Única declaração, nenhum uso | `mundos-updates.js` | Escapava texto sem consumidor | `safeText` local não é necessário; funções proprietárias possuem seus próprios escapes | REMOVIDO |
| caminho absoluto do QA Alquerino | Dependia de diretório temporário externo | `QA/test-alquerino-laboratorio.js` | Quebrava a suíte quando o diretório auxiliar não existia | `path.resolve(__dirname, '..')` | CONSOLIDADO |

## Itens candidatos preservados intencionalmente

| Candidato | Por que não remover agora |
|---|---|
| Wrappers de `saveCharacter`, `selectClass`, `selectNature`, `loadCharacterToBuilder`, `buildCharacterPayloadFromBuilder` em `mundos-updates.js` | Há uso comprovado para compatibilidade e persistência de módulos históricos; retirar exige refatoração comportamental com regressão de várias naturezas/classes. |
| `v0.18` Context Guard e estabilização do Mercador | Ainda modifica DOM real e corrige vazamento/overlap de interfaces do Mercador; possui chamadas e wrappers ativos. |
| `renderOfficialPaths`/dados adicionais do Alquerino | Ainda expande o catálogo para os nove Caminhos documentados; é comportamento funcional, não resíduo. |
| Campos legados do Registro de Potências (`pb-potency-name`, `pb-potency-cap`) | O `power-registry.js` os usa como ponte com o markup legado; retirar agora quebraria compatibilidade. |
| Regras CSS repetidas do Espaço Final | As ocorrências estão em camadas diferentes (base, responsivo e override consolidado) e possuem propriedades diferentes; não são duplicatas textuais simples. |
| Modais da aplicação | Todos possuem IDs distintos; a auditoria não encontrou dois modais com o mesmo identificador ou a mesma função inequívoca. |

## Verificações
- `node --check` em todos os JS e testes: PASS.
- Suíte `QA/test-*.js`: PASS.
- IDs HTML duplicados: 0.
- Referências locais de `index.html`: 0 ausentes.
- Caminhos temporários `/mnt/data/...` no QA: 0.
- O renderer canônico do Envolto produz `#ef-space-final` e `.ef-*`; os seletores V0.21/V0.22 removidos não fazem parte do contrato atual.

## Build
O projeto não possui bundler/npm build declarado no repositório. A build desta versão foi validada por: sintaxe JS, suíte QA, referências locais, integridade estrutural e empacotamento ZIP.

## Depois
- `js/mundos-updates.js`: 2.403 linhas (-130).
- `js/linhagem-tree.js`: 415 linhas (-14).
- `js/ordem-sete.js`: 270 linhas (-1).
- 1 teste QA deixou de depender de caminho absoluto externo.
- Nenhum módulo funcional foi removido por mera semelhança.

## Próxima consolidação segura
A próxima etapa deve migrar progressivamente wrappers ainda ativos de `mundos-updates.js` para os módulos proprietários (`hermetico-rituais.js`, `gallery-editor.js`, Alquerino/Envolto e demais), com um teste de contrato por wrapper antes de apagar cada cadeia histórica.
