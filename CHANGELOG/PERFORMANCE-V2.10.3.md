# Mundos Sombrios V2.10.3 — Performance e enxugamento

- Scripts do documento principal passam a usar `defer`, preservando ordem sem bloquear o parser.
- Mesa, Centro do Mestre, Escudo e Códices saem do boot e entram por carregamento sob demanda.
- CSS dessas áreas também é carregado por feature, não mais no Portal inicial.
- A Forja deixa de ser pré-carregada apenas ao visitar o Santuário/lista de personagens.
- Scripts da Forja são requisitados em paralelo mantendo ordem de execução (`async=false`).
- SoulDrakma reduz custo de desenho quando minimizado/reduced-motion e limita renderização normal a ~30 FPS.
- Hero do Portal recebe preload, `fetchpriority=high` e carregamento eager; demais mídias continuam lazy com decode assíncrono.
- Quatro PNGs de arte de 9,1 MB foram substituídos por WebP equivalentes (~0,66 MB no total).
- Build de produção minifica CSS no `dist/` sem alterar a legibilidade da árvore-fonte.
- Versão canônica atualizada para 2.10.3.
