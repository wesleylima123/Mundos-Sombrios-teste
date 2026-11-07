# Auditoria de Consolidação — Códices dos Mundos + Sala dos Mestres

## Escopo

Base auditada: V0.58.0 (`Mundos-Sombrios-site-v0.58.0-esoterico-restructure.zip`).

Objetivo: reestruturar integralmente os Códices dos Mundos e a apresentação da Sala dos Mestres sem criar uma segunda fonte de verdade, preservando dados existentes, permissões e o motor VTT.

## Arquitetura encontrada antes

### Códices
Havia três camadas concorrentes:

1. `js/codex.js` — hub e seleção de biblioteca.
2. `js/codex-library.js` — armazenamento, cartões, leitor, upload e exclusão ADM.
3. um IIFE adicional dentro de `js/script.js` (`CÓDICE DOS MUNDOS — BIBLIOTECAS ÊXODO / OCULTATON`) que renderizava outra versão do hub/leitor.

Havia ainda três conjuntos de CSS de Códice em `style.css`, referentes a implementações de épocas diferentes.

### Sala dos Mestres
A Ancoragem possuía a apresentação baseada em portais 3D e três dependências de estado concorrentes:
- HTML fixo com `#gm-tables-list` e `#player-tables-list`;
- `renderAncoragem()` dentro de `script.js` gerando os portais novamente;
- CSS 3D de portais em `style.css`.

O armazenamento e o motor de sessão, entretanto, já estavam melhor consolidados em `script.js`: `mundosSombriosTables`, repositório por usuário e `enterVTT()`.

## Decisão de propriedade

### Códices
A fonte única agora é `js/world-codices.js`.

- Dados oficiais: `js/codex-catalog.js`.
- Persistência: chave existente `mundosSombriosCodexLibraryV3`.
- Migração: valores antigos da instalação ainda são lidos quando a V3 está vazia.
- Permissões: ADM controla protocolação/exclusão; Jogador/Mestre apenas consultam.

### Sala dos Mestres
A fonte única da apresentação agora é `js/master-room.js`.

- Dados de mesas permanecem em `js/script.js` e `mundosSombriosTables`.
- O módulo usa `getMasterRoomState()` para ler uma visão imutável dos dados.
- Ações existentes são reutilizadas: `openCreateTableModal`, `enterVTT`, `copyCode`, `deleteTable`.
- O motor VTT não foi duplicado.

## Antes → Depois

| Área | Antes | Depois |
|---|---:|---:|
| `js/script.js` | 6233 linhas | 6063 linhas |
| `js/mundos-updates.js` | 2288 | 2288 |
| `css/style.css` | 1977 linhas | 1276 linhas |
| `index.html` | 922 linhas | 823 linhas |
| Implementações Códice | 3 camadas JS | 1 módulo |
| Apresentação Sala Mestre | HTML + render + CSS portal | 1 módulo + 1 CSS |
| Portais 3D antigos | presentes | removidos |
| `js/codex.js` | presente | removido |
| `js/codex-library.js` | presente | removido |

## Estrutura nova

### Ocultatun — Biblioteca Antiga
A entrada usa uma linguagem de biblioteca antiga: selos, lacres, estantes, volumes e leitor de arquivo.

### Êxodo — Sala de Registros Secretos
A entrada assume a linguagem de sala de arquivo: protocolos, dossiês, registros restritos e ficha de consulta.

### Sala dos Mestres
A antiga grade de portais foi substituída por uma sala de operação com:
- cabeçalho de autoridade;
- ações prioritárias;
- métricas;
- registro de mesas;
- estado vazio;
- copiar código, entrar e excluir;
- visão separada para jogador.

## Estados

### Códices
- carregamento: montagem local do catálogo;
- vazio: estante sem resultados;
- erro: aviso de upload/armazenamento;
- sucesso: protocolo/remover índice local;
- leitor: modal acessível com fechamento por botão ou clique no backdrop.

### Sala dos Mestres
- vazio: nenhuma mesa própria;
- carregado: registro de mesas com métricas;
- permissão: jogador não pode renderizar a sala de Mestre;
- ações inválidas são bloqueadas pelo proprietário existente dos serviços.

## Preservação de dados

Não foi criada nova base de mesas nem nova base de personagens.

O Códice mantém as chaves V3 existentes e mescla catálogo oficial + uploads ADM.

A Sala dos Mestres continua lendo e escrevendo `mundosSombriosTables` através das funções já existentes de `script.js`.

## Resíduos removidos

Removidos porque comprovadamente pertenciam à implementação antiga:
- `js/codex.js`;
- `js/codex-library.js`;
- IIFE legado de Códices em `js/script.js`;
- `renderAncoragem()` antigo de portais;
- `switchAncoragemTab()` antigo;
- markup antigo `gm-tables-list`/portais;
- CSS de portais 3D;
- CSS das versões anteriores dos Códices.

## Verificações

- Todos os JavaScript: `node --check` — PASS.
- Códices estático — PASS.
- Sala dos Mestres estático — PASS.
- Códices navegador — PASS.
- Sala dos Mestres navegador — PASS.
- Security baseline — PASS.
- Power Registry — PASS.
- Projeto Player — PASS.
- Hermético — PASS.
- Alquerino — PASS.
- Envolto — PASS.
- Galeria — PASS.
- Consolidação — PASS.
- Esotérico — PASS.
- IDs duplicados — 0.
- Referências locais de scripts — 0 ausentes.
- Integridade do ZIP — PASS.

## Limitação conhecida

Não há um bundler/npm build declarado no repositório. A validação de build foi feita por sintaxe dos módulos, testes automatizados, análise estrutural, manifesto e empacotamento. O navegador completo da aplicação não foi usado como critério exclusivo, pois o ambiente de execução bloqueia alguns cenários de origem local; os módulos novos foram validados diretamente em Chromium.
