# Auditoria de desempenho — V2.8.6

## Gargalos confirmados na V2.8.5

1. O boot carregava JavaScript de recursos usados apenas dentro da mesa/área de Mestre, incluindo o motor de dados 3D e o índice histórico.
2. A hidratação remota solicitava a lista de mesas e os resumos da mesma associação no mesmo ciclo, duplicando trabalho de banco/rede.
3. Após autenticação, Jogador e Mestre também disparavam `fetchUsers()`, embora a lista global de usuários só seja necessária ao ADM.
4. O antigo fluxo de criação permitia vários `create_table_secure` em paralelo durante latência, aumentando tráfego e duplicando Fendas.
5. Os atalhos do Portal dependiam de CSS carregado somente ao abrir a Forja, causando renderização inicial incorreta e trabalho tardio de estilo.

## Depois

- Boot JavaScript local medido pelos scripts estáticos do `index.html`: aproximadamente 766 KB (antes ~808 KB nesta linha de trabalho).
- `dice-3d.js` e `master-history-data.js` são sob demanda.
- Mesas usam `Games.summaries()` como consulta primária e `Games.listMine()` apenas como fallback.
- `fetchUsers()` no pós-login é restrito ao ADM.
- Salvamento de Fenda tem trava no cliente + idempotência no backend.
- Gateways do Portal são autocontidos no CSS do Portal.
