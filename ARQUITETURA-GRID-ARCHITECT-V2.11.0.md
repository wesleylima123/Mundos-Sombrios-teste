# Grid Architect integrado — V2.11.0

A Mesa do Mundos Sombrios usa o Grid Architect v0.10 como motor espacial nativo, mantendo o site como autoridade de autenticação, campanhas, cenas, personagens e persistência.

## Contratos
- `window.MS_GRID_ARCHITECT`: renderer/estado espacial da Cena.
- `window.MS_GRID_ADAPTER`: ponte de compatibilidade com o `MS_GRID_ENGINE` legado.
- `scene.gridConfig`: configuração canônica da matriz e da escala.
- `scene.vtt`: mapa, câmera, paredes, portas, objetos, fog, luzes, notas/gatilhos, ambiência e escuridão.
- Fabric.js permanece como camada de compatibilidade dos totens/fichas oficiais durante a migração.

## Rede
O Architect não possui uma segunda sessão. Estado oficial usa o evento `scene`; interações e intenções de movimento usam broadcast efêmero e o Mestre confirma o movimento oficial via `token_move`.

## Compatibilidade
Cenas sem `scene.vtt` são migradas automaticamente a partir de `scene.gridConfig`, `scene.mapUrl` e dos totens Fabric persistidos. O padrão legado 16×16 continua válido.

## Projeto externo
A Cena pode ser exportada/importada em `.msgrid.json` pelo painel Architect.
