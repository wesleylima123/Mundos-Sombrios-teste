# Mundos Sombrios V2.10.7 — Preview vivo da Matriz

- Editor da Matriz usa `previewConfig` separado do `scene.gridConfig` oficial.
- Todos os campos atualizam o overlay em tempo real via `input` e `requestAnimationFrame`.
- Rotação, opacidade, espessura e dimensões de célula ganharam controles visuais sincronizados.
- Calibração O/X/Y e painel numérico permanecem bidirecionalmente sincronizados.
- Presets e restauração 16×16 são apenas preview até `APLICAR À CENA`.
- `DESCARTAR` restaura grid e objetos/totens alterados durante o teste.
- Movimento e snap de totens durante preview não são persistidos nem transmitidos.
- Tamanho de totem é testado em células e só é salvo no commit.
- Compartilhamento opcional de preview usa broadcast efêmero `grid_preview`, sem registrar cada ajuste no banco.
- Jogadores continuam vendo a configuração oficial quando o compartilhamento de preview está desligado.
