# Auditoria de Consolidação — V0.61.1

## Escopo
Auditoria integral da build V0.61.0 antes da consolidação. Não houve remoção baseada apenas em aparência de redundância.

## Causa-raiz encontrada
`js/mundos-updates.js`, no IIFE `stabilizeMercadorLayout`, referenciava `$()` sem declarar o helper naquele escopo. O `$` existente em `ordem-sete.js` é local ao IIFE daquele módulo e não é global. Isso produzia `ReferenceError: $ is not defined` no boot após o timeout de estabilização do Mercador.

### Correção
Declarado `const $ = selector => document.querySelector(selector);` dentro do próprio IIFE de consolidação do Mercador. Não foi criado helper global e nenhum proprietário de outro módulo foi alterado.

## Itens candidatos preservados
- wrappers de `selectNature`, `selectClass`, `loadCharacterToBuilder` e `buildCharacterPayloadFromBuilder`: ainda consumidos por múltiplos módulos e usados para extensão de comportamento.
- `showScreen`: uma única implementação canônica em `js/script.js`; `portal-core.js` apenas consulta a API dinamicamente.
- `renderOfficialPortal`: proprietário em `js/portal/portal-core.js`; `portal-admin.js` apenas solicita re-render.
- `renderWorldCodex`: proprietário em `js/world-codices.js`.
- `renderMasterRoom`: proprietário em `js/master-room.js`.
- `renderMasterTools`: proprietário em `js/master-tools.js`.
- `allTablesDB` é a fonte de persistência de mesas; `myTables` e `joinedTables` são projeções derivadas.
- `currentUser` é estado único em `script.js`, exposto por getter somente leitura em `window`.
- duplicações de nomes como `esc`, `render`, `bind`, `normalize` em módulos distintos são escopos locais e não componentes globais duplicados.
- `.module-kicker` compartilhado entre CSS é utilitário visual intencional.

## Resíduo de QA encontrado
Dois harnesses históricos (`QA/repro-mode-sanctuary-v0.60.2.py` e `QA/test-sanctuary-mode-v0.60.2.py`) continham caminho absoluto para `/mnt/data/sanctuary-fix`. Os caminhos foram convertidos para `Path(__file__).resolve().parents[1]`, tornando os testes relocáveis. O comportamento do teste foi preservado.

## Antes / depois
- JS com sintaxe válida antes: 17/17.
- JS com sintaxe válida depois: 17/17.
- IDs duplicados: 0.
- Referências locais ausentes: 0.
- Erro runtime `$ is not defined` no boot: reproduzido -> corrigido -> não reproduzido.
- Harnesses Python com caminho externo: 2 -> 0.

## Ferramentas de build
O projeto não possui `package.json`, framework, bundler ou configuração ESLint/TypeScript. Portanto não há `npm build`, `lint` ou `typecheck` oficiais para executar. A validação equivalente foi feita por `node --check`, suíte QA JS/Python e smoke E2E Chromium.
