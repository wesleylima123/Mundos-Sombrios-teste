# Auditoria e Reestruturação — V0.61.4

## Objetivo
Fixar a classe e a expansão/natureza escolhidas após a criação da ficha, mantendo todas as demais funções do modo de edição, e substituir os antigos cards de seleção por um componente 3D reutilizável com identidade própria por modo.

## Arquitetura antes
- `js/script.js` era o proprietário da seleção de Natureza/Classe, usando `.choice-card` com `<div>` e handlers inline/locais.
- `toggleEditUI()` habilitava todos os `.choice-card` durante a edição.
- `loadCharacterToBuilder()` reconstruía Natureza e Classe usando os mesmos handlers de seleção.
- O payload era composto a partir de `currentNature/currentClass`, sem uma garantia de imutabilidade do arquétipo durante edição.

## Auditoria de conflitos
- Nenhum segundo renderer dedicado de seleção de classe/expansão encontrado.
- Nenhum modal/rota independente para troca de arquétipo encontrado.
- Wrappers existentes de `selectClass`/`selectNature` permanecem ativos para módulos de domínio e não foram removidos.
- O proprietário continua sendo `js/script.js`; não foi criado um segundo motor de ficha.

## Alterações
### `js/script.js`
- Adicionado `renderArchetypeCards()` como fonte única de renderização dos cards.
- Adicionado `archetypeSlug()` e `archetypeAccent()` para identidade estável por card.
- Natureza/expansão e Classe passaram a usar o mesmo componente reutilizável.
- Adicionado `isHydratingCharacter` para permitir a reconstrução inicial de uma ficha existente sem liberar edição do arquétipo.
- Adicionado `editingArchetypeSnapshot` para preservar `mode`, `nature` e `className` originais no salvamento de edição.
- `selectNature()` e `selectClass()` rejeitam mudanças durante edição, exceto durante hidratação interna da ficha.
- `toggleEditUI()` desabilita os cards de arquétipo para fichas existentes, mas mantém as demais ferramentas de edição ativas.
- O estado ativo do card passou a usar `data-archetype`, eliminando a dependência do antigo `h4`.

### Camada visual de arquétipos
- A antiga folha `css/archetype-selection.css` foi absorvida pelo stylesheet canônico V0.63.
- O foco de teclado e o estado `archetype-locked` continuam no renderer atual.

### `index.html`
- Apenas o novo stylesheet de seleção foi adicionado.
- Nenhuma tela ou componente existente foi duplicado.

### `CHANGELOG/`
- Criado diretório canônico para próximos changelogs.

### `QA/`
- Mantido como diretório canônico de regressão.
- Adicionado `test-class-expansion-lock-v0.61.4.js`.
- Corrigido o harness comportamental do retorno ao Portal para refletir a API atual do renderer, sem alterar a aplicação.

## Antes → Depois
- Seleção: `.choice-card` → `.archetype-card` reutilizável.
- Criação: cards interativos e selecionáveis.
- Edição: classe/expansão bloqueadas e preservadas.
- Demais campos: continuam editáveis conforme `isEditMode`.
- Estado de salvamento: snapshot canônico impede troca silenciosa do arquétipo.

## Validação
- `node --check` em todos os JS: PASS.
- Todos os testes JS/CJS existentes: PASS.
- Regressão específica V0.61.4: PASS.
- IDs `nature-grid` e `class-grid`: únicos.
- Portal/Códices/Mesa/Módulos existentes: sem remoção de função.
- Não há `package.json`; portanto não existem comandos npm de lint/typecheck/build a executar nesta base.
- O Chromium desta execução bloqueia navegação local da aplicação por política do ambiente; não foi possível marcar o E2E visual completo como PASS neste runtime.

## Riscos restantes
- A aplicação continua sendo HTML/JS sem pipeline de build tipado.
- Wrappers de compatibilidade em `window` continuam necessários para módulos legados; não foram removidos sem consumidor nulo comprovado.
