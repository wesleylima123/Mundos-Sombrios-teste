# Character Forge — Direção de Arte V0.63

## Proprietários
- Estado e regras: `js/script.js`
- Metadados visuais: `js/archetype-art-direction.js`
- Renderer: `renderArchetypeCards()` em `js/script.js`
- Shell visual: `css/builder/builder-modern-v0.62.css` + `css/builder/builder-art-direction-v0.63.css`
- Cards base: `css/archetype-art-direction-v0.63.css`

## Dados
- Naturezas/expansões: `ruleset[mode].natures`
- Classes: `ruleset[mode].natures[nature].classes`
- Direção de arte: `window.MS_ARCHETYPE_ART`
- Nenhum dado de jogo é duplicado na camada visual.

## Estados
- `idle`: card disponível.
- `hover/focus`: exploração da identidade visual.
- `active`: escolha atual.
- `locked`: modo de edição; classe/expansão não podem ser alteradas.
- `invalid`: seleção rejeitada pelos guardas do `script.js`.

## Direção artística
- Êxodo: tecnologia viva, holograma, gene, bioengenharia, energia, velocidade.
- Ocultatun: arquivo secreto, ocultismo, cirurgia, arsenal, horror cósmico, alquimia e glória religiosa.
