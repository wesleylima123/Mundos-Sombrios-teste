# Site Oficial MS — V2.10.6

## Matriz Tática configurável por Cena

- Novo `MS_GRID_ENGINE`, carregado somente com o runtime da Mesa.
- Fallback retrocompatível: Cenas antigas continuam em matriz ortogonal 16×16.
- Formatos: ortogonal (células quadradas ou retangulares), hexagonal horizontal, hexagonal vertical e modo livre/sem grade.
- Colunas e linhas configuráveis de 1 a 200 por eixo.
- Largura/altura da célula, largura/altura lógica do tabuleiro, deslocamentos X/Y e rotação independentes.
- Grade desacoplada do tamanho do mapa e do viewport.
- Calibração visual no mapa por alças O/X/Y.
- Ações para ajustar células ao tabuleiro, tabuleiro à matriz e tabuleiro ao mapa carregado.
- Controle de cor, espessura, opacidade, coordenadas, visibilidade para jogadores e snap.
- Escala narrativa configurável por célula e unidade livre; a régua passa a usar a matriz ativa.
- Presets 12×12, 16×16, 24×16, 30×20 e 50×50.
- Configuração fica em pré-visualização até o Mestre aplicar à Cena.

## Totens

- Tamanho de totem passa a ser relativo a células, não a pixels da tela.
- Presets: 1/2, 1×1, 2×2, 3×3, 4×4 e dimensão personalizada.
- Metadados `msTokenWidthCells` e `msTokenHeightCells` são persistidos e sincronizados.
- Clientes recalculam a escala local do totem, preservando proporção entre resoluções diferentes.

## Persistência e autoridade

- `gridConfig` é uma propriedade da Cena ativa.
- Trocar de Cena troca também a matriz; Cena legada sem configuração recebe 16×16, sem herdar a Cena anterior.
- Online reutiliza o evento `scene`, já restrito à autoridade do Mestre pelo backend.
- Offline e SANDBOX usam o mesmo contrato através do adaptador local.
- Jogadores podem usar a matriz, snap e régua recebidos, mas não alteram a configuração.

## Performance

- A grade deixa de ser persistida como centenas/milhares de objetos Fabric e passa a ser desenhada em canvas de overlay.
- Snap hexagonal usa busca local aproximada em vez de varrer todas as células.
- Limites de segurança mantêm dimensões e células dentro de intervalos controlados.

## Validação

- Build completo aprovado.
- 61 arquivos JavaScript validados por sintaxe.
- 304 testes: 285 aprovados, 0 falhas, 19 condicionais/ignorados.
- Offline e SANDBOX reconstruídos a partir da árvore canônica V2.10.6.
