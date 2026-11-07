# Mesa — ícones móveis, dados e grid

## Alterações

- Chat e Dados começam recolhidos em dois ícones quadrados ornamentados, com legenda. Clique abre e o segundo clique recolhe. Arraste ou Alt + setas reposiciona; arrastar não dispara abertura acidental. Fechar a janela também a recolhe para seu ícone.
- Os ícones e janelas continuam disponíveis no Salão, Grid e PEG. Mensagens, histórico e resultado continuam nos mesmos elementos, sem criar réplicas. Posições são mantidas por usuário/mesa; Restaurar janelas recompõe os ícones. O novo formato de preferências tem chave própria, sem apagar os dados anteriores.
- Grid centralizado em uma área de até 1600px. Controles reais em barra inferior, com rolagem quando necessário. Cabeçalho e conteúdos do Salão/PEG têm alinhamento central; removido o espaço excessivo anteriormente reservado às janelas abertas.
- Renderizador 3D existente consolidado e aprimorado: metal envelhecido, bordas e inscrições, sombra e anel de apoio. D12 reconstruído com doze faces pentagonais. Visualização por malhas 3D projetadas em Canvas, sem dependência externa; animação de giro e salto, não simulação física.
- 20 natural em D20: Ascensão da Alma, selo dourado expansivo e símbolo ascendente. 1 natural em D20: Fenda do Abismo, ruptura violeta que se contrai. Outros dados/resultados não acionam presságios. Efeitos também aplicados à apresentação de rolagens recebidas.
- Preferência de movimento reduzido respeitada. Resultados e regras de sorteio permanecem na fonte existente, separados da apresentação.
- Retirada a caixa expansível que escondia a animação dos dados; o modelo aparece diretamente na janela de Dados.

## Validação

Build, sandbox e dist reconstruídos. 284 testes: 265 aprovados, 0 falhas, 19 ignorados históricos. Cobertura inclui clique/arraste dos ícones, ausência de listeners duplicados, recolhimento, persistência, resultados especiais, malhas e regressão do travamento da Mesa. Log de build anexado.

Limites: sem validação visual em navegador real neste ambiente e sem multiplayer remoto configurado. Não houve deploy. Os testes não comprovam a apresentação em todos os dispositivos.

## Aplicação

Atualize o conteúdo do site com este pacote (ou publique dist em hospedagem estática) e recarregue. Não apague dados de contas/fichas. Os ícones aparecem na parte inferior direita e podem ser arrastados para a posição desejada.
