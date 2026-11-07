# Auditoria de Consolidação — Mundos Sombrios v0.63.1

Data: 18/08/2026
Base auditada: `Mundos-Sombrios-main.zip` (v0.63.0)
Resultado: consolidação conservadora, preservando comportamento ativo e dados.

## 1. Escopo e método

A auditoria procurou resíduos de implementações antigas sem removê-los apenas por aparência. Para cada candidato foram cruzadas: ordem de carregamento dos scripts, definições/rebindings de funções globais, referências no repositório, classes/IDs emitidos pelo renderer atual e sobreposição de CSS.

O projeto é um site estático: não há `package.json`, lockfile, manifest de build, Playwright/Cypress ou test runner no repositório. Portanto, não existe um `npm build`/`npm test` oficial a executar. A validação disponível foi feita por análise estática + verificação de sintaxe + execução do gerador de regras + integridade dos assets + tentativa de smoke browser.

## 2. Candidatos e decisão

| Candidato | Desde quando | Quem usa / efeito observado | Implementação mais nova | Decisão |
|---|---|---|---|---|
| Renderer Mercado da Morte V0.12 (`renderMercado`, `initMercadoData`, CRUD antigo, wrapper de load) | bloco `v012-update.js` | Era acionado pelos próprios hooks V0.12 em seleção/carregamento e construía `#death-market-panel`; o V0.16 fazia novo render depois, causando dupla responsabilidade e potencial flicker | `renderMerc16` + `normalizeMerc16` + hooks de persistência do V0.16 | **Removido** |
| Camadas Mercado V0.13/V0.14/V0.15 (`renderMercadoV13`, `renderMercadoV14`, `renderMercadorUnified` e APIs específicas) | blocos `v013/v014/v015` | Rebindings históricos para o mesmo domínio; os blocos posteriores redefiniam os mesmos pontos e o V0.16 assumiu o desenho canônico | `renderMerc16`, `v16*`, `normalizeMerc16`, modais/arsenal V0.16 | **Removido** |
| Wrappers V0.18 repetidos de `renderMerc16` | V0.18 | Três wrappers tinham o mesmo padrão de estabilização e executavam o mesmo pós-processamento | um wrapper único protegido por `__marketStabilized` + wrapper final de layout quando necessário | **Consolidado** |
| `css/archetype-selection.css` | V0.61.4 | Folha legada para `.archetype-*`; os mesmos componentes passaram a ser emitidos por `renderArchetypeCards` e estilizados pelo stylesheet V0.63 | `css/archetype-art-direction-v0.63.css` | **Removido** |
| `make_rules_index.py` com raiz `/mnt/data/mt-current` hardcoded | histórico de ferramenta de geração | O script não conseguia regenerar `js/master-shield-rules.js` a partir de um clone/extração normal do próprio repositório | raiz relativa a `Path(__file__).resolve().parent` | **Corrigido** |

### O que foi preservado de propósito

- O controle global de quantidades do Alquerino permaneceu, porque possui API própria (`openAlchemyBulkQty` / `applyAlchemyBulkQty`) e é referenciado pela UI atual.
- A camada de símbolos/cartões e presets de crop do V0.12 permaneceu: são comportamentos ainda emitidos/consumidos e não eram parte do renderer legado do Mercado.
- `HERMETIC_RITUALS` continua com uma fonte canônica em `js/hermetico-rituais.js`; `mundos-updates.js` apenas acrescenta rituais customizados sobre essa base. Não são duas bases independentes.
- `master-shield-rules.js`, `codex-catalog.js`, portal e módulos de cirurgia/códices foram preservados porque têm consumidores reais.
- Funções com nomes iguais em módulos distintos (`deleteFile`, `uploadFiles`, `buildSkillTreeUI`, etc.) foram mantidas quando o dono e o domínio são diferentes.

## 3. Itens procurados sem evidência suficiente para remoção

### Componentes/modais duplicados
Não foi encontrada duplicação inequívoca que pudesse ser removida sem assumir que dois fluxos são equivalentes. Os modais V0.16 específicos do Mercado e os modais de outros módulos têm IDs/owners diferentes.

### Hooks que controlam o mesmo estado
Há rebindings intencionais de APIs globais de compatibilidade, especialmente `saveCharacter`, `loadCharacterToBuilder`, `selectClass` e `buildCharacterPayloadFromBuilder`. Eles ainda têm consumidores cruzados. A auditoria não os achatou porque isso exigiria testes comportamentais por módulo que o repositório não possui.

### Listeners/eventos duplicados
Foram contabilizados listeners por arquivo e revistos os pontos com rebindings. Não foi encontrada duplicação global com evidência suficiente para apagar um listener sem risco de quebrar delegação ou rehidratação.

### Rotas antigas
O projeto não possui router formal. Não foi encontrado mapa de rotas obsoletas comparável a um app SPA; os pontos existentes são navegação/tab/modal do próprio documento.

### Flags sem uso
Nenhuma flag foi removida por nome/heurística. Os candidatos restantes aparecem em condições ou handlers reais.

### CSS que sobrescreve a própria aplicação
O caso confirmado foi `archetype-selection.css`: sua cascata era anterior ao stylesheet canônico V0.63 e os componentes atuais já eram definidos/estilizados pelo art-direction V0.63. A folha foi retirada do `index.html` e do projeto.

### Imports/referências para arquivos removidos
Após a consolidação, a checagem de referências estáticas HTML/CSS encontrou **31 referências locais e 0 ausências**. Referências dinâmicas dentro de JS não foram classificadas como assets ausentes, pois são valores de runtime.

### Funções não chamadas
Foram removidas as famílias legadas do Mercado listadas acima somente depois de confirmar que não havia consumidores fora de seus próprios blocos antigos. Funções de módulos diferentes foram mantidas quando existe chamada real ou reexposição de API.

### Tipos/interfaces divergentes
Não há TypeScript nem sistema formal de tipos. O risco equivalente é a normalização divergente de payloads. No Mercado, a normalização antiga (`normalizeMercado`/variantes) foi substituída pela normalização V0.16 (`normalizeMerc16`).

### Adaptadores temporários / deprecated
O principal caso confirmado foi o encadeamento histórico de renderers do Mercado. Os wrappers compatibilidade que continuam foram deixados em pé por terem usuários reais; o próximo passo arquitetural seria separar API pública de compatibilidade de implementação, mas isso é refatoração estrutural, não limpeza segura.

## 4. Antes x Depois

### Fonte principal: `js/mundos-updates.js`

- Antes: **2142 linhas**, 687.135 bytes.
- Depois: **1690 linhas**, 622.001 bytes.
- Redução: **452 linhas** e **65.134 bytes**.
- As camadas legadas do Mercado foram removidas e os wrappers duplicados do V0.18 foram consolidados.

### `index.html`

- Antes: 874 linhas, 73.810 bytes.
- Depois: 873 linhas, 73.747 bytes.
- Alteração: removido somente o `<link>` para `css/archetype-selection.css`.

### CSS de seleção de arquétipos

- O arquivo legado de 6.158 bytes foi removido.
- O stylesheet canônico V0.63 permanece como owner visual dos cards.

### Arquivos do repositório

- Antes: 72 arquivos.
- Depois: 71 arquivos.
- A redução corresponde à remoção da folha CSS legada; nenhum arquivo foi apagado apenas por parecer redundante.

## 5. Build / testes / validação

### PASS

1. `python3 make_rules_index.py` — PASS.
2. `node --check` em todos os **21 arquivos JS** — PASS.
3. Verificação de referências estáticas HTML/CSS: **31 encontradas / 0 ausentes** — PASS.
4. Verificação de IDs HTML duplicados: **0 duplicados** — PASS.
5. Busca de resíduos confirmados (`renderMercadoV13`, `renderMercadoV14`, `renderMercadorUnified`, `initMercadoData`, `archetype-selection.css` em código ativo): nenhum — PASS.
6. `unzip -tq` do artefato consolidado — PASS.
7. Regeneração de `js/master-shield-rules.js` preservou o hash SHA-256 conhecido: `ec170d5606ce3f7efa5ae365a3cef3be75e9d462b4b8b7cc9f4b5596373a79b2`.

### NOT RUN / BLOCKED

Não existe pipeline formal de build/teste no repositório (`package.json` ausente). Também foi feita uma tentativa de smoke test com Chromium headless contra um servidor HTTP local; o processo não retornou dentro do limite do ambiente. Portanto **não** foi classificado como PASS e não foi usado como justificativa para remover mais código.

## 6. Riscos residuais

O principal resíduo arquitetural que permanece é a quantidade de APIs globais reencadeadas em `mundos-updates.js` (`saveCharacter`, `loadCharacterToBuilder`, `selectClass`, etc.). Elas não são lixo comprovado: existem módulos que ainda dependem delas. A recomendação é criar testes de contrato antes de reduzir esses wrappers.

Também permanece a ausência de um test runner automatizado. Isso limita a capacidade de provar por execução que todos os fluxos de personagem continuam equivalentes após uma consolidação maior.

## 7. Estado final

A árvore resultante é mais simples no domínio do Mercado da Morte, com um único owner de renderização (V0.16), uma única camada visual canônica para os cards de arquétipos (V0.63) e um gerador de regras portátil para o próprio repositório.
