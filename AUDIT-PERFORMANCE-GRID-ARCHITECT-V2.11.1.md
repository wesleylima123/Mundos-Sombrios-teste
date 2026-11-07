# Auditoria de performance — Grid Architect V2.11.1

## Causas principais identificadas
1. Loop de renderização integral ocioso: `draw -> ensureCanvas -> resize -> mark -> draw`, redesenhando mapa, props, fog, luzes e tokens sem alteração de estado.
2. Fabric.js externo era solicitado por CDN na primeira abertura da Mesa, adicionando DNS/conexão/latência e tornando a entrada dependente de terceiro.
3. O Grid Architect e o Grid Engine oficial podiam desenhar a grade simultaneamente.
4. Bibliotecas artísticas não tinham thumbnails próprios; navegar no catálogo podia decodificar imagens muito maiores que o necessário.
5. Efeitos animados, se executados no renderer integral, multiplicavam o custo do mapa completo.

## Correções
- Resize idempotente e renderização somente quando o estado fica dirty.
- Efeitos isolados no overlay a ~30 FPS, suspensos quando `document.hidden`.
- Fabric Lite local com câmera/viewport transform no VTT integrado.
- Grid canônico desenhado apenas pelo MS_GRID_ENGINE quando presente.
- Catálogos lazy + `force-cache` + thumbnails WebP.
- Cenário inicia antes da camada de compatibilidade de totens.

## Observação de tamanho
O núcleo `grid-architect-core.js` possui cerca de 64 KB em fonte e ~19 KB comprimido; portanto o gargalo principal não era o tamanho do JavaScript do motor, e sim o trabalho de renderização e dependências/mídias acionadas na entrada.
