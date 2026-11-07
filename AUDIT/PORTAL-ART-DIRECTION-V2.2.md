# Portal Oficial — Análise e Direção de Arte V2.2

## Diagnóstico anterior
A página inicial da V2.1 apresentava boa identidade sombria, porém tratava cada categoria editorial como uma grande seção de página. Quando não havia posts publicados, Anúncios, Eventos, Classes, Expansões e Histórias continuavam ocupando faixas verticais extensas. A captura desktop de referência chegou a aproximadamente **4002 px de altura**.

Principais problemas observados:
- navegação principal comprimida em uma única faixa com muitas opções;
- hero próximo de uma tela inteira e com linhas de leitura longas;
- seções sem conteúdo continuavam renderizando título, espaçamento e estado vazio;
- destaque e mundos eram tratados como áreas independentes, prolongando a rolagem;
- cards e janelas aceitavam parágrafos extensos sem limite visual consistente;
- subpáginas não preservavam a mesma navegação da home;
- janelas administrativas tinham grande altura útil, mas pouca disciplina de cabeçalho/abas;
- os itens Códices e Mestres no cabeçalho eram tratados como seções editoriais, embora existam como ações funcionais.

## Direção aplicada
### 1. Hierarquia editorial
A home passou a seguir a ordem: **Hero → quatro acessos → Destaque + Mundos → Índice do Portal → conteúdo publicado → Centro dos Mestres**.

### 2. Conteúdo vazio não ocupa a home
Os painéis editoriais são condicionais. Se uma categoria não possui registros publicados, ela permanece acessível pelo Índice do Portal, mas não cria uma janela vazia na página inicial.

### 3. Janelas compactas
- destaque com cópia curta e altura menor quando não existe mídia;
- mundos condensados em cards de consulta rápida;
- conteúdo da home limitado aos dois registros mais recentes por área;
- resumos recebem line-clamp;
- cards deixam de depender de grandes `min-height` na home.

### 4. Leitura
Foi estabelecida coluna de leitura de referência em **62ch**. Hero, cards, páginas de detalhe e histórias têm largura de texto deliberadamente limitada.

### 5. Navegação
O cabeçalho foi separado em navegação principal e faixa editorial. O shell agora é preservado nas subpáginas. Códices e Mesas utilizam `data-act`, acionando as áreas funcionais corretas.

### 6. Janelas administrativas
O painel ADM recebeu largura máxima de 980 px, cabeçalho e abas sticky, áreas de texto menores e listas mais densas.

## Antes / Depois
| Métrica visual | Antes | Depois |
| --- | ---: | ---: |
| Altura da home desktop de referência | ~4002 px | 1685 px |
| Redução de rolagem | — | ~58% |
| Seções vazias renderizadas na home padrão | 5 | 0 |
| Navegação persistente em subpáginas | Não | Sim |
| Overflow horizontal 1440 px | 0 | 0 |
| Overflow horizontal 768 px | — | 0 |
| Overflow horizontal 390 px | — | 0 |

## Validação visual
- Desktop: 1440×1000, documento final 1685 px.
- Tablet: 768×1024, sem overflow horizontal.
- Mobile: 390×844, sem overflow horizontal; quatro acessos em grade 2×2.
- Subpágina de Mundos: shell, navegação e footer permanecem presentes.
- Ação Códices do cabeçalho abre `screen-codex` corretamente.

## Arquivos centrais
- `css/portal/portal-editorial-v2.2.css`
- `js/portal/portal-core.js`
- `js/portal/portal-content.js`
- `tests/portal-layout-v2.2.test.js`

## Resultado
A página oficial mantém a identidade sombria e autoral, mas passa a funcionar como uma publicação digital organizada: o conteúdo tem prioridade clara, as janelas deixam de dominar a tela e o visitante consegue chegar às áreas importantes sem percorrer grandes blocos vazios.
