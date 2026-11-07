# Galeria, criação e investigação de desempenho

## Resultado

Grid 16:9 centralizado, dimensionado pela largura e altura disponíveis, com controles abaixo. O canvas continua usando o tamanho do contêiner e não recria o mapa ao alternar telas.

Criador com entrada de escolha e duas janelas exclusivas: Criação acompanhada e Criação direta. O formulário canônico é movido para a janela escolhida, sem cópias de campos ou modelos. A direta não mostra Arquivista, roteiro ou painel lateral da guiada. Trocar a janela preserva o formulário. Fichas existentes abrem na direta. Durante a carga inicial, uma apresentação de preparação evita exibir o layout parcialmente composto; chamadas concorrentes de abertura foram bloqueadas. Tela inativa permanece oculta antes e depois do carregamento de CSS.

Editor de galeria consolidado em gallery-editor.js: zoom por controle, botões/roda e pinça, arraste, rotação, inclinação, proporções quadrado/retrato/paisagem e controle livre, restauração e ações Aplicar/Cancelar. A moldura é a prévia do recorte. Ações Editar imagem, Usar como retrato e Remover são distintas. Escape cancela, foco retorna ao controle anterior e Tab permanece no editor.

Originais e transformações são preservados em concept.imageEdits, usando a persistência narrativa existente; gallery continua sendo um vetor de URLs para compatibilidade. A edição seguinte usa o original. Imagens antigas sem metadados usam a imagem atualmente disponível como original — não é possível reconstruir áreas perdidas em recortes antigos. O rascunho agora restaura também imagens e metadados. Alterações só entram na ficha ao aplicar; cancelar não modifica a imagem. Exportação limitada a 1600px no maior lado.

## Investigação estática e correções

| Achado | Evidência no código | Correção |
|---|---|---|
| Reentrada de favoritos | MutationObserver observa class dentro de powers-list; enhancePowerFavorites escrevia class mesmo sem mudança | Classe só é escrita quando o valor muda; teste de estabilidade |
| Atualizações redundantes | Cada input/change enfileirava trabalhos completos independentes | Agendamento visual agrupado por requestAnimationFrame, limitado ao criador ativo |
| HUD reconstruído fora de uso | updateLivePreview chamava renderPlayHUD durante criação | Reconstrução do HUD restrita ao modo Jogar |
| Resumo caro por tecla | updateSummary construía o payload completo, inclusive listas/imagens | Leitura apenas dos campos usados pelo resumo |
| Validação completa por tecla | Listener input executava validação imediatamente | Debounce de 250ms; validação final preservada |
| Entrada concorrente e layout intermediário | Vários cliques podiam registrar novas continuações do carregamento; CSS/DOM carregados em etapas | Abertura única durante carga e apresentação temporária até completar |
| Recorte 16:9 incorreto em contêiner baixo | Largura e altura eram limitadas separadamente | Cálculo pelo menor limite mantendo a razão |
| Imagem carregada tardiamente | onload podia abrir edição antiga | Geração de carga invalida respostas canceladas/substituídas |

Foram inspecionados os carregadores, eventos e observadores da criação, galeria, sessão da Mesa, janelas, presença e timers de economia/diretório. Os timers com função ativa não foram removidos apenas por existirem. O runtime contém cerca de 23 MB de assets, 4,4 MB de JavaScript e 512 KB de CSS; tamanho em disco não equivale a transferência inicial nem comprova gargalo. Não há medição real de FPS, tempo de entrada ou long tasks nesta entrega.

## Verificação e limites

- Sintaxe: 60 arquivos JavaScript válidos.
- 288 testes: 269 aprovados, 0 falhas, 19 ignorados históricos.
- Regressões novas: favorito estável não gera escritas repetidas; recorte 16:9 produz 1600×900; reabertura usa original; cancelar preserva transformação salva; retrato e remoção mantêm metadados alinhados.
- Sandbox e dist reconstruídos e comparados com os arquivos canônicos no ZIP.
- Verificação visual como jogador, mestre e administrador NÃO executada. O ambiente não tinha Chromium; tentativa de instalação via Playwright falhou por timeout de download. Log incluído. Não foram inventadas sessões de login ou screenshots.
- Permissões não foram alteradas. Os testes existentes de papéis não substituem a navegação manual nos três perfis.
- A causa observada da reentrada foi corrigida, mas não se afirma que todos os travamentos possíveis foram eliminados. É necessário validar a versão no navegador do usuário, inclusive edição móvel e tamanho de imagens/limite de armazenamento.
- Sem deploy ou mudanças no banco remoto.

## Atualização

Publique dist ou substitua o pacote anterior e recarregue a página. Não é necessário apagar fichas. Ao criar, escolha Criação acompanhada ou Criação direta. Use Trocar forma de criação para alternar sem duplicar a ficha.
