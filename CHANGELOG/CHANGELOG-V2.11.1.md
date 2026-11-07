# Mundos Sombrios V2.11.1 — Grid Architect: Arte, Som e Performance

## Mesa / Grid Architect
- Recuperadas e integradas à paleta nativa as ferramentas artísticas do Grid Architect v0.10: terreno, paredes, portas, névoa/revelação, luzes, notas, gatilhos, objetos interativos, apagar, medição, seleção e câmera.
- Grid rápido com ortogonal, hexagonal horizontal, hexagonal vertical, isométrico e livre, além de temas visuais Êxodo, Ocultatun e neutro, mantendo a paleta de Matriz oficial como fonte de configuração não destrutiva.
- Biblioteca artística com ambientes, props 2D/2.5D e totens, pesquisa, filtro por universo/categoria e imagens carregadas sob demanda.
- Ambiência procedural completa do v0.10 em duas camadas, com presets offline e importação de áudio local para a sessão.
- Efeitos visuais: chuva, névoa móvel, faíscas e pulsação anômala, com intensidade editável.

## Performance
- Corrigido ciclo de renderização integral contínua causado por resize/redraw recursivo do Architect quando a Mesa estava ociosa.
- Efeitos animados usam somente o canvas de overlay, limitados a ~30 FPS e pausados com a aba oculta.
- Removida a dependência bloqueante do CDN do Fabric na Mesa integrada: a camada de compatibilidade de totens usa Fabric Lite local com viewport transform.
- Architect e Grid Engine oficial não desenham a mesma grade em duplicidade.
- Catálogos são carregados apenas ao abrir a aba Arte e usam cache do navegador.
- Criadas miniaturas WebP específicas para ambientes, props e totens, evitando baixar artes em resolução integral apenas para navegar na biblioteca.
- A camada Architect é inicializada e pinta o cenário antes da camada de compatibilidade de totens.

## Compatibilidade
- Cena, Supabase, Offline e SANDBOX mantêm os mesmos contratos da V2.11.0.
- Personagens/totens oficiais continuam ligados ao VTT legado por adapter.
