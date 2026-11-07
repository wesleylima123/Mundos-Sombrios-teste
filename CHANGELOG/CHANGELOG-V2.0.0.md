# Seite_Mundos-Sombrios_V2.0 — 2.0.0

## Consolidação
- Removida a camada antiga de símbolos de cards V0.12, incluindo uma chamada quebrada a `forceTaskSvg`.
- Removido o cubo 3D legado que era criado e descartado pelo renderer V0.16.
- Removidos CSS e seletores sem emissores das famílias Mercado V0.14/V0.15.
- Preservados fora das famílias legadas os estilos genéricos ainda usados por `.danger` e `.market-empty`.
- Removido `css/archetype-selection.css`, resíduo reintroduzido de uma folha já aposentada em V0.63.1.
- Removidos estados, flags, helpers e no-ops com zero consumidor comprovado.
- Mantidos wrappers, modais, listeners e adaptadores que ainda possuem consumidores reais.

## Qualidade
- Adicionado `tests/consolidation-v2.test.js` com quatro regressões de consolidação.
- Build final: 29/29 JS válidos e 23/23 testes aprovados.
- 39/39 referências locais do HTML válidas; 0 IDs HTML duplicados.
- `make_rules_index.py` preserva o hash do índice de regras.

## Nome/versão
- Pacote: `seite-mundos-sombrios`.
- Versão: `2.0.0`.
- Diretório de entrega: `Seite_Mundos-Sombrios_V2.0`.
