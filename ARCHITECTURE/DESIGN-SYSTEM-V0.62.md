# Design System — Mundos Sombrios V0.62

## Proprietários
- `js/portal/portal-core.js`: renderização/navegação do Portal.
- `js/portal/portal-content.js`: conteúdo editorial.
- `js/script.js`: estado e regras do construtor de fichas.
- `css/portal/portal-visual-v0.62.css`: camada visual do Portal.
- `css/builder/builder-modern-v0.62.css`: camada visual do construtor.

## Boot
`#screen-portal` é a primeira tela visual declarada. `#screen-login` não participa do primeiro paint. `portal-core.js` remove `ms-shell-booting` após renderizar o Portal.

## Dados
Não houve migração de dados. O Portal continua em `mundosSombriosPortalContentV1`; fichas permanecem no armazenamento existente.

## Estados
- Portal: `loading` via `aria-busy`, depois conteúdo.
- Login: oculto no boot; só exibido via `openLogin()`.
- Builder: estado e seleção continuam no `script.js`.

## Diretriz
Toda futura alteração visual deve preferir as folhas `portal-visual-v0.62.css` e `builder-modern-v0.62.css` antes de criar componentes ou estado novos.
