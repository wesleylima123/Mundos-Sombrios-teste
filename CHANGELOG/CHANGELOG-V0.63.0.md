# V0.63.0 — Character Forge / Direção de Arte

## Visual
- Nova direção de arte para seleção de classes e expansões.
- Cards com composição cinematográfica: marca, codinome, função, frase de identidade e assinatura mecânica.
- 23 classes e 8 expansões/naturezas mapeadas.
- Êxodo e Ocultatun mantêm linguagens macro diferentes e cada arquétipo recebe microidentidade própria.
- Hover, foco, seleção e bloqueio foram redesenhados.
- Mobile e `prefers-reduced-motion` mantidos.

## Arquitetura
- `js/archetype-art-direction.js`: metadata visual único.
- `renderArchetypeCards()` em `js/script.js`: único renderer.
- `css/archetype-art-direction-v0.63.css`: visual dos cards.
- `css/builder/builder-art-direction-v0.63.css`: shell visual da Forja.

## Não alterado
- regras do RPG;
- schema de ficha;
- persistência;
- permissões;
- bloqueio de classe/expansão na edição;
- VTT, Códices, Portal e Mesa dos Mestres.
