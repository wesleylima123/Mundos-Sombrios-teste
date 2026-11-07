# Mesa e PEG — implementação e consolidação

Data: 17/09/2026. Pacote: Mundos Sombrios 2.10.2.

## O que mudou

| Área | Antes desta etapa | Depois |
|---|---|---|
| Comunicação | Chat e dados disputavam o mesmo painel; navegação móvel ocultava áreas inteiras. | Chat e dados ocupam áreas simultâneas, independentes das janelas de trabalho. Em telas menores ficam lado a lado abaixo da área central. |
| Mapa | Área central única. | Janela própria, redimensionável, com maximização que preserva a comunicação. |
| Participantes | Cards na coluna lateral e janela ampliada sem busca. | Janela reaproveitada com busca, grade/lista compacta, miniatura, ficha completa e evolução para o Mestre. A coluna legada deixa de ocupar espaço. |
| Organização | Sem arranjos de trabalho. | Condução: mapa; Acompanhamento: mapa e participantes encaixados; Preparação: campanha para Mestre, arquivos para jogador. Restaurar recompõe o arranjo e os ícones. |
| Miniaturas | Limitadas ao viewport inteiro. | Ícones e miniaturas respeitam os limites da área de trabalho, preservando chat e dados. Clique recolhe; arraste ou Alt + setas move. |
| PEG | Reserva e personagens juntos; retirada com nomenclatura ambígua. | Reserva, Personagens e Histórico separados; orientação visual em três etapas; ação “Devolver à reserva” e prévia de saldos. |
| Histórico | Tipos de transação técnicos. | Rótulos legíveis para as principais transações, personagem, motivo, data e acesso à devolução da concessão. |
| Evolução direta | Sequência de confirm/prompt. | Painel com graduação, custo, saldo resultante, justificativa e autorização explícita para completar os pontos pela reserva. |
| Dados | Visualização 3D ocupava a maior parte do espaço. | Controles e resultado primeiro; animação disponível em seção recolhível. |

## Fontes existentes e decisões de consolidação

Não há histórico Git neste pacote. A origem abaixo se baseia nos arquivos e nas versões declaradas; não comprova data de introdução ou autoria.

| Candidato | Uso e comportamento | Origem verificável | Decisão |
|---|---|---|---|
| Alternância de chat/dados em `table-shell-v3.js` | Shell, botões de comunicação e navegação móvel. Ocultava um painel para mostrar outro. | Módulo declara V2.9.0, já presente antes desta etapa. | Substituída pelo layout simultâneo no mesmo shell. Iniciativa abre na área central. |
| Cards legados e janela de participantes | O renderer legado e outros consumidores ainda dependem dos IDs dos cards; `table-sheets.js` oferece consulta ampliada. | Ambos presentes no checkpoint; janela acrescentada na etapa anterior de arte/Mesa. | DOM legado preservado, sem espaço no layout. A janela existente é a única superfície ampliada, inclusive quando encaixada. |
| Janelas sobre o viewport | Campanha, arquivos, arsenal, direção, fichas, PEG e modais podiam cobrir a comunicação. | Presentes no checkpoint. | O shell publica limites da área central; os componentes usam os mesmos limites. |
| Fluxos de concessão/devolução | Central Operacional e progressão usam `MS_POINTS`; serviços controlam as operações financeiras. | Formulário compartilhado já consolidado na etapa anterior. | Reutilizado; histórico também chama o mesmo formulário. Nenhum novo saldo ou serviço paralelo. |
| Confirmação direta de evolução | `managerGrantUpgrade` chama o backend de evolução gradual. | Módulo V2.10.1. | Interface reformulada no próprio ponto de entrada, mantendo o serviço e suas regras. |
| CSS da Mesa | Shell é a fonte do layout; estilos próprios de fichas e PEG complementam componentes. | Consolidação anterior do pacote. | Editados os arquivos canônicos; dist e sandbox regenerados pelo build. |

A devolução continua integral, vinculada a uma concessão anterior e condicionada ao saldo disponível. Não foi criada retirada parcial. A interface consulta dados atuais e o backend continua responsável pela autorização e pela validação final. Solicitações, treinamentos e exceções narrativas existentes permanecem disponíveis. A lista de concessões reversíveis depende do histórico disponibilizado pelo serviço.

Jogadores continuam vendo apenas suas próprias fichas; o Mestre pode consultar os participantes da mesa. As miniaturas usam o mesmo serviço e renderer de ficha, sem cópia independente do estado dos personagens. Busca e apresentação são estados locais de interface.

As artes inéditas do Portal entregues na etapa anterior foram preservadas. Esta etapa acrescenta composição visual de PEG em CSS, sem reutilizar imagens antigas nem criar uma segunda implementação do Portal.

## Validação

- `npm run build`: concluído; sincronização de versão, geração do sandbox, sintaxe JavaScript, testes e geração de dist.
- 273 testes: **254 aprovados, 0 falhas, 19 ignorados**. Antes desta etapa: 268 testes, 249 aprovados e os mesmos 19 ignorados.
- Cinco novos testes exercitam limites das miniaturas, formulário PEG não modal e cancelamento, iniciativa independente da comunicação, arranjos/restauração e atualização dos limites de trabalho.
- Testes existentes continuam verificando permissões de visualização, submissão única, cancelamento, troca de mesa, erros de serviço, saldos locais, reversão duplicada e evolução financiada.
- As expectativas antigas de alternância móvel e os rótulos anteriores foram atualizados para o comportamento solicitado; não foram ignorados testes para obter aprovação.
- Limitação: testes com DOM controlado e inspeção de CSS não equivalem à inspeção visual real. Não foi possível validar a renderização em Chromium neste ambiente; a tentativa anterior de instalação falhou e está registrada na auditoria anterior.
- Multiplayer remoto não validado: o pacote continua sem credenciais de conexão configuradas. Os testes financeiros locais não comprovam sincronização entre dois usuários remotos.

## Como usar

1. Entre na Mesa e escolha Condução, Acompanhamento ou Preparação na barra acima do mapa.
2. Use Fichas para abrir a janela independente; busque um personagem ou alterne Lista compacta.
3. Abra a miniatura pelo card ou ícone. Clique novamente no ícone para recolher.
4. No Mestre, abra Evolução · PEG: abasteça a Reserva, escolha Personagens para conceder e acompanhe as movimentações no Histórico.
5. Para corrigir uma concessão, use Devolver à reserva e confira os saldos antes da confirmação.
6. Use Restaurar para recompor mapa, participantes e ícones sem apagar chat, dados ou fichas.

## Rastreabilidade

Esta pasta inclui o build, o patch e cópias anteriores dos arquivos editados. O manifesto lista arquivos e hashes finais. Auditorias anteriores foram preservadas. A versão pública continua 2.10.2, consistente entre manifesto, VERSION e interface. Nenhum deploy foi executado.
