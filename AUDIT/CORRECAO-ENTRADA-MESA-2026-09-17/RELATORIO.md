# Correção do travamento ao entrar na Mesa ao Vivo

## Causa reproduzida

A consulta MS_TABLE_SESSION.current() emitia table:session-health. O shell recebia esse evento e chamava renderLobby(). Para desenhar a presença de cada participante, renderLobby() voltava a consultar current(), disparando novamente o evento. Com participantes na mesa, a renderização entrava em recursão síncrona, impedindo a conclusão da abertura.

O teste integrado com os módulos reais de sessão, shell e fichas reproduziu o ciclo antes da alteração. Um limite de profundidade no barramento de teste interrompe a reprodução de forma controlada, evitando travar o próprio teste.

## Alteração

js/table-session-engine.js passa a ter uma função única de snapshot. current() apenas retorna esse estado, sem emitir eventos. A função health() continua publicando mudanças reais de conexão, envio, recebimento e saída. A presença devolvida é uma cópia independente. Não foram alterados layout, permissões, fichas ou regras de jogo.

## Antes / depois

| Verificação | Antes | Depois |
|---|---|---|
| Entrada com cards de participantes | Ciclo saúde → Salão → consulta → saúde | Conexão conclui como synced |
| Consulta de estado | Emitia evento e provocava nova renderização | Somente leitura |
| Renderizações sucessivas | Reentrância sem limite | Não publicam novos eventos de saúde |
| Envio e saída no teste integrado | Fluxo bloqueado na entrada | Envio conclui e saída retorna idle |

## Validação

- Dois testes de regressão novos em tests/table-room.test.js: integração de sessão/Salão e contrato de consulta sem efeitos colaterais.
- Ambos falhavam antes da correção e passam depois.
- npm run build concluído, incluindo reconstrução do sandbox e dist.
- 282 testes: 263 aprovados, 0 falhas e 19 ignorados preexistentes.
- Evidência anterior e log de build acompanham este relatório.
- O ZIP contém a correção na fonte, no sandbox e em dist.

Limites: testes executados em Node com DOM e transporte controlados. Não foi validado navegador real nem conexão multiplayer remota; nenhum deploy foi realizado. Esta entrega corrige o ciclo comprovado no pacote fornecido.

## Atualização

Substitua a versão anterior pelo conteúdo deste ZIP. Para hospedagem estática, publique o conteúdo atualizado de dist. Recarregue a página após a atualização para carregar o JavaScript corrigido. Não é necessário apagar contas, fichas ou dados locais.
