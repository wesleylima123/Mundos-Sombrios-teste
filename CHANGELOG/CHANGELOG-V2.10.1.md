# Mundos Sombrios V2.10.1 — Hotfix Operacional de Evolução

## Correções

- Jogadores podem enviar solicitação de evolução assim que a trilha estiver mecanicamente pronta, mesmo quando o saldo PEG individual é insuficiente.
- A Central mostra custo, saldo individual e PEG faltante em cada solicitação.
- Mestre/Co-Mestre/ADM podem completar automaticamente o PEG faltante usando a reserva da Mesa ao aprovar uma solicitação.
- Mestre/Co-Mestre/ADM ganham o comando **CONCEDER EVOLUÇÃO** para aplicar diretamente uma trilha pronta, sem depender de solicitação prévia do Jogador.
- O complemento de PEG e a evolução direta são atômicos no Supabase e auditados no Ledger.
- As filas de ingresso, treino e evolução passam a ser atualizadas em polling operacional de 8 segundos.
- Assets de Evolução/TRIPULAÇÃO foram versionados como V2.10.1 para evitar cache da V2.10.0.
- O instalador cumulativo V2.10.1 inclui toda a base anterior + hotfix.

## Regra preservada

Sucessos e requisitos narrativos determinam elegibilidade. PEG continua sendo o recurso que efetiva a evolução; o Mestre pode completar o valor faltante a partir da reserva da Mesa.
