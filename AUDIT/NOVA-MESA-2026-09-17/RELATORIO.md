# Nova Mesa — Salão, Grid e PEG

Implementação de 17/09/2026. Pacote público 2.10.2, atualizado nesta entrega.

## Resultado

A Mesa agora abre sempre pelo Salão dos Participantes. Salão, Grid e Evolução · PEG são três janelas principais independentes: somente a selecionada é exibida. Foram eliminados o arranjo em colunas e os modos Condução, Acompanhamento e Preparação da implementação anterior.

Chat e dados pertencem a uma camada independente. Ambos permanecem disponíveis nas três janelas, podem ser arrastados pelo cabeçalho, redimensionados pelo canto e recolhidos/expandidos. Alt + setas também move as janelas. As posições e os tamanhos são salvos por usuário e mesa, com correção dos limites ao redimensionar a tela. Restaurar janelas recompõe comunicação e miniaturas sem apagar mensagens, resultados ou mudar a janela principal.

Os ícones das fichas foram mantidos e redesenhados como medalhões: moldura metálica, ornamentos, retrato ou iniciais, identificação no foco/hover e destaque quando a miniatura está aberta. Clique novamente para recolher. Os jogadores continuam com acesso apenas às próprias miniaturas; o Mestre acessa as fichas dos participantes autorizados.

## Antes e depois

| Área | Antes | Depois |
|---|---|---|
| Entrada | Área de trabalho compartilhada por mapa e painéis. | Salão artístico como janela inicial. |
| Navegação | Arranjos combinavam mapa, participantes e comunicação. | Salão, Grid e PEG exibidos individualmente. |
| Participantes | Cards antigos ocultos e janela de participantes adicional. | Um renderer de Salão; cards antigos e janela adicional removidos. |
| Composição | Grade de cards utilitária. | Duas alas de cinco posições, espaços livres e novas formações quando há mais de dez participantes. |
| Comunicação | Chat e dados encaixados no layout. | Duas janelas móveis e redimensionáveis com posição independente das telas. |
| Miniaturas | Ícones circulares simples. | Medalhões ornamentados, mantendo o fluxo autorizado de consulta. |
| PEG | Janela operacional e antigo orbe/painel de reserva coexistiam. | Janela principal exclusiva, usando a Central Operacional; orbe e painel antigos removidos. |
| Grid | Ferramentas reais e controles proxy do shell. | Controles reais na própria janela, sem toolbar proxy. Trocas de janela não restauram novamente o mapa salvo. |

O Salão mostra participantes reais e posições livres, sem inventar presença online. Em telas menores, as alas de cinco cards permitem rolagem horizontal para preservar a composição. O conteúdo da janela pode ser rolado independentemente; chat e dados continuam acessíveis e podem ser recolhidos para liberar espaço.

## Consolidação e remoções

- Excluídos do runtime `js/table-shell-v3.js` e `css/table-shell-v3.css`. Seus consumidores foram migrados para `js/table-room.js` e `css/table-room.css`.
- Substituídos o cabeçalho anterior, a janela antiga de cards, o acesso rápido legado e o renderer antigo de `renderVttCards`. A chamada preservada encaminha atualizações para o renderer canônico de fichas/Salão.
- Removidos os arranjos combinados, encaixe da janela de participantes, seleção móvel que ocultava áreas e toolbar proxy do mapa.
- Removidos o construtor, o arraste, o posicionamento e a apresentação do antigo orbe/painel de PEG. Aprovação de propostas, ajustes de recursos e registro de carreira foram transferidos para a janela de evolução, preservando os serviços existentes.
- Removidas regras CSS de cards, presença flutuante, painel de participantes e efeitos de orbe que não têm mais consumidores.
- Mantidos os serviços de sessão, autorização, fichas e evolução, além de campanha, iniciativa, arsenal, forja, arquivos e controles do Mestre. Elementos compartilhados com modais fora da Mesa foram preservados onde ainda possuem consumidores.
- As cópias de publicação e sandbox foram reconstruídas. A busca em HTML, JavaScript, CSS e scripts ativos não encontra os identificadores do layout removido. Auditorias históricas continuam como documentação não executável.

Não há histórico Git neste pacote. A origem foi determinada pelos arquivos existentes e suas versões declaradas: shell anterior V2.9.0, orbe/painel em progressão V2.8.9, Central Operacional V2.10.1 e janelas acrescentadas nas etapas anteriores de 2.10.2. Isso não estabelece datas históricas exatas de introdução.

## Regras de jogo preservadas

As operações de PEG continuam usando os serviços canônicos. A devolução é integral e vinculada a uma concessão reversível; não foi criada retirada parcial. Concessão de pontos e confirmação de evolução continuam distintas. Jogadores têm uma entrada de evolução voltada às próprias fichas; ferramentas administrativas permanecem restritas à autoridade da mesa.

A janela exclusiva de PEG incorpora o componente existente, sem manter uma segunda cópia do saldo. Foram acrescentadas verificações de contexto para descartar respostas de carregamentos anteriores após troca de mesa ou conta.

## Arte inédita

Foi gerada uma nova pintura do salão: `assets/art-direction/mesa-salao.png`, incorporada ao site, dist e sandbox. O arquivo de trabalho está em `/workspace/scratch/85bcf5639f1e/audit/assets/art-direction/mesa-salao.png`.

Modo: geração de imagem integrada, sem CLI/API externa. Os medalhões foram desenhados em CSS e usam o retrato do próprio personagem, quando disponível.

Prompt utilizado:

> Use case: stylized-concept. Asset type: background artwork for the participant lobby of an original dark fantasy tabletop RPG web game, Mundos Sombrios. Create a premium MMO waiting hall, monumental circular gothic chamber of aged obsidian and weathered bronze, thin shafts of moonlight from high arches, dim amber candles and muted teal magical fissures. A central empty round ritual floor, symmetrical raised alcoves on left and right suggesting two parties waiting, atmospheric architectural depth. No people, no cards or UI, no typography, no logo, no symbols resembling written text. Landscape wide composition, 1536x1024 or wider; center and lower areas low contrast to support independently rendered participant cards; exquisite painterly environment concept art, restrained colors, cinematic but legible, no excessively bright portal. Save the generated artwork for incorporation into the website project.

## Validação

- `npm run build` concluído: sincronização de versão, sandbox, sintaxe, testes e dist.
- 60 arquivos JavaScript com sintaxe válida.
- **280 testes: 261 aprovados, 0 falhas e 19 ignorados.** Os 19 ignorados são gates históricos já indisponíveis no pacote anterior.
- Dez testes novos cobrem exclusividade das janelas, entrada pelo Salão, preservação do mapa, descarte de carregamento atrasado de PEG, restauração, arraste/teclado/recolhimento, isolamento das posições por mesa, limites em cinco larguras, formações com até 23 participantes e ausência dos componentes removidos.
- Três testes específicos dos arranjos antigos foram substituídos pela cobertura da nova navegação; os demais testes de layout foram migrados para os novos contratos. Não foram criados novos testes ignorados.
- Estrutura HTML verificada: três janelas irmãs no espaço de trabalho e comunicação fora delas; nenhum ID duplicado ou erro de aninhamento encontrado.
- Arquivos locais referenciados por HTML/CSS conferidos; cópias de runtime em dist/sandbox comparadas com a fonte, exceto a configuração isolada do sandbox.

**Limitações:** não foi possível executar a validação visual em navegador real neste ambiente, que não dispõe de Chromium. O resultado dos testes de DOM controlado, estrutura e CSS não comprova a apresentação em todos os tamanhos. O multiplayer remoto também permanece sem validação: o pacote está sem credenciais de conexão. Nenhum deploy foi executado.

## Uso

1. Entre na Mesa: o Salão será exibido.
2. Use Salão, Grid ou Evolução · PEG no cabeçalho para abrir cada janela individualmente.
3. Arraste Chat e Dados pelos cabeçalhos; use o canto para redimensionar e os botões −/+ para recolher/expandir.
4. Clique nos medalhões para abrir ou recolher miniaturas; arraste-os para organizar sua consulta.
5. Ferramentas da sessão reúne campanha, iniciativa, arquivos e as ações do Mestre.
6. Restaurar janelas recupera uma organização visível sem apagar dados.

O manifesto registra arquivos adicionados, modificados e excluídos, com hashes anteriores e finais. O log de build acompanha esta auditoria.
