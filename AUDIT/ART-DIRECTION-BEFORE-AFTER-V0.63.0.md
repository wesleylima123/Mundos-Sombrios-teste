# V0.63.0 — Auditoria de Direção de Arte e Reestruturação do Character Forge

## Antes
- O `renderArchetypeCards()` era único, porém oferecia cards visualmente muito semelhantes entre classes.
- A identidade vinha principalmente de duas famílias: holograma para Êxodo e arquivo para Ocultatun.
- `classDescDict` fornecia texto, mas não havia uma camada editorial de identidade por classe.
- O builder tinha uma base moderna V0.62, porém sem uma linguagem cinematográfica específica por arquétipo.
- Naturezas/expansões e classes compartilhavam praticamente o mesmo tratamento de card.

## Depois
- `js/archetype-art-direction.js` é a fonte única de direção visual/editorial.
- `renderArchetypeCards()` continua sendo o único renderer.
- 8 naturezas/expansões receberam direção de arte individual e 23 classes receberam identidade visual individual.
- Cada card agora possui: família visual, ícone, codinome, função, tagline, assinatura e paleta.
- Êxodo prioriza tecnologia viva, gene, holograma, bioengenharia e energia.
- Ocultatun prioriza arquivo secreto, ocultismo, cirurgia, arsenal, horror cósmico e glória religiosa.
- A camada visual não altera os dados de regras, atributos, recursos, estado de edição ou persistência.

## Fluxo preservado
Criação → seleção de expansão → seleção de classe → abas específicas → salvamento → edição.

No modo de edição, a proteção existente continua bloqueando alteração de classe/expansão.
