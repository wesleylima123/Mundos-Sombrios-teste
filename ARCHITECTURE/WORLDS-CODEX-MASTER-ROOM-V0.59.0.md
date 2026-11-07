# Arquitetura V0.59.0 — Códices dos Mundos e Sala dos Mestres

## Fontes únicas

- Códices: `js/world-codices.js`
- Catálogo: `js/codex-catalog.js`
- Sala dos Mestres: `js/master-room.js`
- Dados de mesas/VTT: `js/script.js`

## Contrato de integração

`world-codices.js` não cria banco paralelo de regras. Ele consome o catálogo e a persistência V3 existentes.

`master-room.js` não reimplementa criação/entrada/exclusão de mesa. Ele apenas renderiza a visão de gerenciamento e chama os serviços existentes.

## Segurança

ADM é necessário para protocolar/remover arquivos dos Códices.

Jogadores não recebem a Sala dos Mestres.

## Responsividade

Os dois módulos usam layout fluido, colunas adaptativas, alvos de toque e `prefers-reduced-motion`.

## Acessibilidade

Botões são elementos semânticos `button`, o leitor usa `role="dialog"`/`aria-modal`, controles possuem `aria-label` quando necessário e estados de status usam `role="status"`.
