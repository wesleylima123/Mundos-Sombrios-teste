# Auditoria de Consolidação — Seite_Mundos-Sombrios_V2.0

**Data:** 07/09/2026  
**Base auditada:** Mundos Sombrios v0.67.1  
**Versão consolidada:** 2.0.0  
**Diretório final:** `Seite_Mundos-Sombrios_V2.0`

## 1. Método e critério de remoção

Esta auditoria foi deliberadamente conservadora. Um item só foi removido quando havia evidência combinada de que:

1. não possuía consumidor estático ou dinâmico identificável no repositório atual;
2. seu comportamento era nulo, inalcançável ou já executado por um proprietário mais novo;
3. a implementação nova estava carregada no fluxo atual; e
4. a remoção podia ser protegida por build, testes e/ou uma checagem estrutural específica.

Itens apenas parecidos, wrappers globais encadeados, listeners de módulos diferentes, modais com owners distintos e adaptadores de compatibilidade ainda usados foram preservados.

A origem temporal foi determinada por cabeçalhos de versão dos módulos, blocos históricos em `js/mundos-updates.js`, changelogs, documentos de arquitetura e auditorias anteriores. Quando o repositório não fornece a introdução exata, o relatório usa **“presente pelo menos em v0.66.1”**, pois essa versão anterior foi comparada diretamente e contém o candidato.

## 2. Candidatos consolidados

| Candidato | Desde quando | Quem usava / comportamento | Implementação mais nova | Decisão |
|---|---|---|---|---|
| Decorador de símbolos dos cards (`symbolMap`, `expansionSymbol`, `decorateCards`, wrapper `oldRenderChars`) | V0.12 | O wrapper de `renderCharList` trocava o cubo por um símbolo e tentava desenhar badge de Força-Tarefa. A chamada `forceTaskSvg()` já não tinha definição, podendo gerar `ReferenceError`. | V0.16: `augmentCardSymbols()`, `sigilSmallForClass()` e `taskSvg()` | **REMOVIDO**. O `handleCardClick` do mesmo bloco foi preservado porque ainda resolve abertura entre modos. |
| Cubo 3D dos cards (`card-3d-icon-wrapper`, `cube-icon`, `cube-face`, mapeamentos `.icon-*`) | Pré-V0.12 / comprovado em v0.66.1 | `renderCharList()` ainda criava seis faces e classes por slug. Logo depois, o wrapper V0.16 removia esse DOM e inseria `v16-card-symbol-layer`. | V0.16: camada de sigilos do card | **REMOVIDO** da geração e do CSS. O usuário continua vendo a camada V0.16. |
| CSS Mercado V0.14 | V0.14 | Estilos de `v14-layer`, patentes, bancada, arsenal e modal. Os renderers V0.14 já haviam sido removidos na auditoria v0.63.1; nenhum emissor atual produz essas classes. | V0.16 + estabilização V0.18 | **REMOVIDO**. `.danger` e a aparência final de `.market-empty`, ainda usadas, foram extraídas para um bloco genérico V2.0. |
| CSS Mercado/Esotérico V0.15 | V0.15 | Estilos `.v15-*` sem emissores atuais. | V0.16 para Mercado e módulo canônico `esoterico-surgery.js` para cirurgia | **REMOVIDO**. |
| Fallbacks de patente `#v15-rank-select` e `#mm-rank` | V0.15 / legado anterior | O listener de `script.js` aceitava três IDs, mas só `#v16-rank-select` é emitido atualmente. | `#v16-rank-select` | **CONSOLIDADO** para o ID atual. |
| Seletores `.v16-death-module` / `.v14-death-module` no estabilizador | V0.18 como compatibilidade com renderers anteriores | `stabilizeMarket()` procurava classes que nenhum renderer atual emite. Todos os módulos atuais já usam `.death-module`. | `.death-module` canônico | **CONSOLIDADO**. |
| `css/archetype-selection.css` | V0.61.4 | Não é carregado pelo HTML atual. A auditoria v0.63.1 já o havia aposentado, mas o arquivo reapareceu no pacote v0.67.1. | `css/archetype-art-direction-v0.63.css` | **REMOVIDO** como resíduo reintroduzido. |
| `cropper`, `currentCropTarget`, `editingImageIndex` globais | Presente pelo menos em v0.66.1; fluxo antigo de crop | Declarações sem leitura. Não controlavam mais o modal/editor atual. | `js/gallery-editor.js`, proprietário canônico, com `state.target`, `state.index`, Canvas e estado próprio | **REMOVIDOS**. |
| `selectedVttEquipmentCharId` | Presente pelo menos em v0.66.1 | Declaração sem leitura/escrita posterior; não selecionava personagem no VTT atual. | Estado/seleção atual é derivado dos elementos e objetos VTT em uso | **REMOVIDO**. |
| `specDescDict` | Presente pelo menos em v0.66.1 | Dicionário de duas descrições (`Somático`, `Sensorial`) sem consumidor. | Renderizadores/dados específicos atuais não consultam esse mapa | **REMOVIDO**. |
| `rootRadius` | Presente pelo menos em v0.66.1 | Cálculo no renderer do Envolto nunca lido. | Layout atual usa `tierRadii`, `completionRadius` e layout salvo | **REMOVIDO**. |
| `MS_JOINED_KEY` | Presente pelo menos em v0.66.1; camada de cache da transição online | Constante nunca lida. | Participação canônica usa `table_members`; cache ativo usa funções/chaves realmente referenciadas | **REMOVIDO**. |
| `msSyncRepoStore` | Presente pelo menos em v0.66.1; cache de compatibilidade pós-online | Gravava um repo inteiro no cache; zero chamadas. | `msEnsureUserRepo`, `msPersistCharacterToRepo`, `MS_SERVICES` e Supabase | **REMOVIDO**. |
| `msFindCharacterByRef` | Presente pelo menos em v0.66.1 | Procurava ficha por owner/id; zero chamadas. | Serviços/hidratação atuais e arrays sincronizados | **REMOVIDO**. |
| `msResolveCurrentUserCharSelection` | Presente pelo menos em v0.66.1 | Lia `join-char-select-vtt`; zero chamadas. | Fluxo atual de entrada/vínculo resolve a seleção diretamente | **REMOVIDO**. |
| `msPersistJoinedTableRepo` / `msRemoveJoinedTableRepo` | Presente pelo menos em v0.66.1 | Mutavam `joinedTables` do cache; zero chamadas. | Desde v0.65.0, vínculo de mesa é canônico em Supabase/RPC + `table_members` | **REMOVIDOS**. |
| `msLinkParticipantToTable` / `msUnlinkParticipantFromTable` | Presente pelo menos em v0.66.1 | Alteravam `participants` no objeto local; zero chamadas. | `table_members` + operações seguras/serviços online | **REMOVIDOS**. |
| `setupDraggables()` | Presente pelo menos em v0.66.1 | Registraria drag em cinco janelas VTT, mas não havia nenhuma chamada. | `makeDraggable()` continua vivo onde é realmente invocado (janelas de solicitações) e os fluxos VTT atuais têm seus próprios handlers | **REMOVIDO**; `makeDraggable()` foi preservado. |
| `fillPowerSelect()` | Registro de Potências V0.54 | Preenchia `#pb-potency-name`; zero chamadas. | O `render()` atual do `power-registry.js` preenche o seletor novo e sincroniza os campos legados necessários | **REMOVIDO**. |
| `getVig`, `masteryName`, `isUnlocked` em Aprimorador | Presente pelo menos em v0.66.1 | Três helpers sem chamadas. | `dsMax()`, `currentMastery()` e lógica de render atual | **REMOVIDOS**. |
| `normalizeUserPayload()` | Camada Supabase introduzida em v0.65.0 | Normalizador de usuário sem chamadas. | `ensureMyProfile`/operações atuais de perfil constroem o payload usado pelo banco; `normalizeTablePayload` e `normalizeCharacterPayload` continuam ativos | **REMOVIDO**. |
| `levelRows` em Ordem dos Sete | Módulo Ordem V0.44 | Flatten de `ASC` nunca lido. | Render atual consulta `ASC` diretamente | **REMOVIDO**. |
| `forgeOriginal` | Bloco Mercado V0.16 | Variável declarada e nunca lida. | A Forja atual é integrada diretamente pelos hooks V0.16 | **REMOVIDO**. |
| Listener vazio `DOMContentLoaded` de `master-tools.js` | `master-tools.js` V0.60 | Executava apenas `if(gm()) {}`; não inicializava nem alterava estado. | Inicialização real ocorre pelos hooks explícitos `MasterTools`/Sala dos Mestres | **REMOVIDO**. |
| `Object.assign(window,{})` no evento `control` | Presente no fluxo atual de `master-tools.js` | Operação sem efeito antes de atualizar `chatLocked`. | O próprio branch já atualiza diretamente `chatLocked` e botão | **REMOVIDO** sem alterar o branch. |

## 3. Candidatos revisados e preservados

| Candidato | Quem usa | Desde quando / contexto | Comportamento | Há implementação mais nova? | Decisão |
|---|---|---|---|---|---|
| Wrappers de `selectNature`, `selectClass`, `loadCharacterToBuilder` | Nexo, Ordem dos Sete, Alquerino, Esotérico, Registro de Potências e `mundos-updates.js` | Cadeia histórica documentada nas auditorias v0.57.7 e v0.63.1 | Cada wrapper hidrata/renderiza um domínio específico depois da função anterior | Existem owners por módulo, mas a cadeia ainda é o contrato de compatibilidade | **PRESERVADO**. Remover exige testes de contrato por natureza/classe. |
| `openMasterShield` em loader + implementação | `master-shield-loader.js` e `master-shield.js` | Lazy loading estabelecido na arquitetura V0.60/V0.60.1 | O loader ocupa o nome até carregar o módulo; depois delega à implementação real | Não é duplicação: é handoff lazy intencional | **PRESERVADO**. |
| Modais V0.13 usados por fluxos atuais | Alquerino (bulk stock) e botões close reutilizados pelo Mercado V0.16 | V0.13, mas ainda com consumidores atuais | Shell/close de modal compartilhado | V0.16 tem modais próprios para Mercado, mas não substitui todos os consumidores V0.13 | **PRESERVADO**. |
| 13 listeners `DOMContentLoaded` restantes | Códices, Ordem, plataforma, script base, Registro de Potências, Sala do Mestre, Nexo, contexto consolidado, UI online, Esotérico etc. | Várias versões/owners | Inicializam módulos diferentes ou usam `{once:true}`/guards idempotentes | Não há um bootstrap único equivalente sem refatoração estrutural | **PRESERVADOS**. O único listener vazio foi removido. |
| 2 listeners globais de `resize` | `script.js` e `gallery-editor.js` | Fluxos distintos | Um ajusta layout/árvore; outro refaz o Canvas do editor de galeria | Não são o mesmo estado nem o mesmo callback | **PRESERVADOS**. |
| 2 listeners globais de `click` | `script.js` e `mundos-updates.js` | Delegações distintas | Um atende interação do Espaço Final; outro estabiliza Mercado após clique no painel | Não são duplicados funcionalmente | **PRESERVADOS**. |
| Cache de compatibilidade ainda ativo (`msSeed*`, `msRefreshLegacy*`, `msSyncCurrentUserView`) | Login/hidratação, Sala do Mestre e compatibilidade de dados antigos | Transição online v0.65+ | Projeta dados online para estruturas antigas ainda consumidas | Supabase é a fonte de verdade, mas consumidores legados ainda existem | **PRESERVADO**. Foram retirados apenas helpers com zero chamadas. |
| Campos legados `pb-potency-name` / `pb-potency-cap` | `power-registry.js` | Registro V0.54; preservados explicitamente na auditoria v0.57.7 | Ponte entre Registro novo e markup/payload antigo | Registro atual sincroniza esses campos | **PRESERVADOS**. |
| `HERMETIC_RITUALS` + customizações | `hermetico-rituais.js` e camada de customização | Histórico consolidado | Uma base canônica mais extensão autoral; não são duas fontes independentes | A arquitetura atual já separa base e custom | **PRESERVADO**. |
| CSS repetido de componentes atuais | Base + responsivo + temas | Várias versões | Regras em breakpoints ou temas alteram propriedades deliberadamente | Não existe equivalência 1:1 comprovada | **PRESERVADO**. Só as famílias sem emissores foram removidas. |

## 4. Resultado por categoria solicitada

### Componentes duplicados
**Confirmado e consolidado:** cubo 3D dos cards versus camada de sigilos V0.16. O cubo era criado e imediatamente removido pelo renderer mais novo.

### Modais duplicados
Os modais V0.14/V0.15 existiam apenas em CSS morto e foram removidos. Os shells V0.13 e V0.16 que ainda possuem consumidores distintos foram mantidos.

### Hooks controlando o mesmo estado
Há wrappers globais encadeados, mas cada owner injeta hidratação específica. Não foram achatados sem testes de contrato. Nenhum hook ativo foi removido por semelhança nominal.

### Listeners/eventos registrados duas vezes
Não foi encontrada duplicação funcional inequívoca. Foi encontrado e removido **um listener `DOMContentLoaded` vazio**. Os pares globais repetidos (`resize`, `click`) têm callbacks e estados distintos.

### Rotas antigas
O site não usa router formal. Foram encontrados 9 alvos literais de `showScreen`; **todos possuem tela/ID correspondente**. Nenhuma rota antiga foi removida.

### Flags/estado sem uso
Foram removidos `MS_JOINED_KEY`, `cropper`, `currentCropTarget`, `editingImageIndex`, `selectedVttEquipmentCharId`, `rootRadius`, `forgeOriginal` e outros helpers/dados de ocorrência única comprovada.

### CSS/estilos sobrescrevendo a aplicação
Foram removidos:
- componente do cubo e seus overrides V0.12/V0.13;
- famílias V0.14/V0.15 sem emissores;
- `archetype-selection.css` reintroduzido, já aposentado desde v0.63.1.

Os estilos `.danger` e `.market-empty`, ainda consumidos, foram preservados fora das famílias legadas para manter o resultado visual atual.

### Imports/referências de arquivos removidos
O código atual não usa módulos ESM/`require` locais. A auditoria de `src`/`href` do HTML encontrou **39 referências locais e 0 ausentes**. A exclusão de `archetype-selection.css` não criou referência quebrada porque ele já não era carregado.

### Funções não chamadas
Além das famílias de renderer antigas, foram eliminados helpers com definição única e zero consumidor comprovado, listados na seção 2. Após a consolidação, a varredura de declarações de função top-level não encontrou nova função com apenas uma ocorrência no corpus JS+HTML.

### Tipos/interfaces divergentes
Não há TypeScript. O equivalente arquitetural é a diferença entre payload UI (camelCase) e banco (snake_case). Essa conversão continua intencional em `supabase-db.js`. `normalizeTablePayload` e `normalizeCharacterPayload` permanecem ativos. Apenas `normalizeUserPayload`, sem consumidor, foi removido.

### Adaptadores temporários
A camada de cache de compatibilidade continua existindo porque ainda possui consumidores. Sete helpers sem chamadas foram removidos; os seeds/refresh/sync ativos foram mantidos. `table_members` continua sendo a relação canônica para participantes.

### Deprecated
Não foi encontrado `@deprecated`/marcador deprecado ativo. Há comentários `legacy` e `compatibility`; cada um foi revisado. Os que possuem consumidores foram preservados.

## 5. Antes x Depois

### Build/testes

| Métrica | Antes (v0.67.1) | Depois (V2.0) |
|---|---:|---:|
| JS validado por sintaxe | 29/29 | 29/29 |
| Testes | 19/19 PASS | **23/23 PASS** |
| Testes de consolidação dedicados | 0 | **4** |
| Referências locais HTML quebradas | 0 | 0 |
| IDs HTML duplicados | 0 | 0 |
| Alvos literais de `showScreen` sem tela | 0 | 0 |
| CSS com chaves desbalanceadas | não registrado | 0 |

### Fonte de produção

| Conjunto | Antes | Depois | Diferença |
|---|---:|---:|---:|
| JS (`js/*.js`) | 12.395 linhas / 3.775.341 bytes | 12.238 linhas / 3.766.709 bytes | **-157 linhas / -8.632 bytes** |
| CSS (`css/*.css`) | 1.433 linhas / 249.650 bytes / 10 arquivos | 1.343 linhas / 221.508 bytes / 9 arquivos | **-90 linhas / -28.142 bytes / -1 arquivo** |
| Testes | 119 linhas / 3 arquivos | 181 linhas / 4 arquivos | **+62 linhas / +1 teste de arquivo** |

### Arquivos principais

| Arquivo | Antes | Depois | Diferença |
|---|---:|---:|---:|
| `js/script.js` | 6.454 linhas / 396.739 B | 6.345 linhas / 391.430 B | **-109 linhas / -5.309 B** |
| `js/mundos-updates.js` | 1.689 / 621.957 B | 1.674 / 620.236 B | **-15 / -1.721 B** |
| `css/style.css` | 1.276 / 173.955 B | 1.223 / 151.971 B | **-53 / -21.984 B** |
| `js/power-registry.js` | 147 / 162.458 B | 139 / 162.118 B | **-8 / -340 B** |
| `js/supabase-db.js` | 712 / 36.086 B | 693 / 35.261 B | **-19 / -825 B** |
| `js/aprimorador-engenharia.js` | 413 / 25.977 B | 410 / 25.730 B | **-3 / -247 B** |
| `js/ordem-sete.js` | 270 / 31.408 B | 268 / 31.311 B | **-2 / -97 B** |
| `js/master-tools.js` | 226 / 35.583 B | 225 / 35.490 B | **-1 / -93 B** |

A consolidação de código, antes da inclusão deste relatório/changelog, corresponde a **76 inserções e 261 remoções** no diff total; as inserções são majoritariamente os quatro testes de regressão e metadados de versão.

## 6. Validações executadas

1. `npm run build` — **PASS**.
   - executa `npm run syntax` + `npm run test`.
2. `tests/syntax-check.mjs` — **29 arquivos JavaScript válidos**.
3. `node --test tests/*.test.js` — **23/23 PASS**.
4. Teste V2: ausência das camadas `card-3d-*`, `cube-*`, `class-symbol-float`, `forceTaskSvg`, `.v14-*` e `.v15-*` em produção — **PASS**.
5. Teste V2: helpers sem consumidor não retornaram e adaptadores ativos continuam presentes — **PASS**.
6. Teste V2: `css/archetype-selection.css` ausente e art-direction V0.63 presente — **PASS**.
7. Teste V2: 39 referências locais do HTML resolvem para arquivos existentes — **PASS**.
8. Teste V2: IDs HTML duplicados = **0** — **PASS**.
9. Teste V2: todos os alvos literais `showScreen(...)` têm tela correspondente — **PASS**.
10. `python3 make_rules_index.py` — **PASS**; hash de `js/master-shield-rules.js` preservado: `ec170d5606ce3f7efa5ae365a3cef3be75e9d462b4b8b7cc9f4b5596373a79b2`.
11. Checagem de balanceamento de chaves do `css/style.css` — profundidade final 0, sem fechamento negativo — **PASS**.

## 7. Riscos residuais e próxima consolidação segura

O maior resíduo estrutural continua sendo a cadeia de wrappers globais em torno de `selectNature`, `selectClass`, `loadCharacterToBuilder` e APIs semelhantes. Eles **não são lixo comprovado**: Nexo, Ordem dos Sete, Alquerino, Esotérico, Registro de Potências e Mercado ainda dependem desses pós-processamentos.

A próxima consolidação segura seria transformar cada wrapper em hook/evento explícito registrado pelo owner do módulo, mas somente depois de criar testes comportamentais para cada natureza/classe. Isso reduziria o acoplamento de `window.*` sem apagar compatibilidade de forma especulativa.

Também é recomendável, numa etapa separada, criar testes de navegador para navegação real, abertura/fechamento de modais e uma mesa concorrente com múltiplas sessões Supabase. A presente auditoria não classifica esses fluxos como testados em navegador.

## 8. Resultado final

A consolidação removeu resíduos comprovados de V0.12/V0.14/V0.15, estado morto, funções sem consumidor, CSS reaparecido indevidamente e no-ops; preservou wrappers/modais/listeners com uso real; manteve a arquitetura online-first e adicionou testes para impedir a reintrodução dos resíduos removidos.

**Nome final do repositório: `Seite_Mundos-Sombrios_V2.0`.**
