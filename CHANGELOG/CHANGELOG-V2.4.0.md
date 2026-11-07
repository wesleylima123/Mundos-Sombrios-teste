# Seite_Mundos-Sombrios — 2.4.0

## Mestre
- Janela de criação de mesa limitada ao viewport, com cabeçalho e ações sempre visíveis.
- Conteúdo da fundação possui rolagem interna e layout de uma coluna em telas pequenas.
- `Campanha em Movimento` passou a viver dentro da mesa selecionada na Ancoragem.
- A mesa ativa recebe destaque e acesso contextual ao Centro Operacional e Cofre.

## Dados 3D
- Novo `js/dice-3d.js`, sem Three.js/WebGL.
- Malhas próprias para D4, D6, D8, D10, D12 e D20.
- Animação via `requestAnimationFrame`, perspectiva, iluminação e aterrissagem do resultado.
- Rolagens recebidas por Realtime também disparam a apresentação 3D para os participantes.
- Respeita `prefers-reduced-motion`.

## Performance
- Fabric.js passou a carregar somente ao abrir o VTT.
- html2pdf passou a carregar somente na exportação PDF.
- Módulos e folhas CSS pesadas da Forja passaram a carregar sob demanda.
- JavaScript local de boot: 1.619.672 → 629.802 bytes (~61% menor).
- CSS inicial: 319.445 → 264.347 bytes (~17% menor).
- Partículas usam conjunto fixo de nós; removido churn DOM a cada ~150 ms.
- Removido polling permanente de lifecycle da Forja; eventos/MutationObserver assumem a atualização.

## Qualidade
- 35/35 arquivos JavaScript sintaticamente válidos.
- 60/60 testes automatizados aprovados.
- Testes históricos atualizados para validar a arquitetura lazy sem exigir módulos pesados no `index.html`.
