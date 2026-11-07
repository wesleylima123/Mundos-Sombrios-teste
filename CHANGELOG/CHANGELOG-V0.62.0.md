# Mundos Sombrios V0.62.0

## Portal Oficial
- Reestruturação visual integral da camada pública do Portal.
- Hierarquia mais próxima de portais oficiais de jogos modernos: navegação persistente, hero editorial, destaque, notícias, eventos, classes, expansões, histórias, mundos e Centro dos Mestres.
- Novo sistema visual responsivo com superfícies em camadas, tipografia hierárquica, estados de foco e animações discretas.
- Nenhuma fonte de conteúdo ou rota editorial foi duplicada.

## Criação de personagem
- Reestruturação visual do construtor para uma experiência de "character forge" inspirada em interfaces de seleção de personagens/MMO.
- Êxodo mantém linguagem holográfica; Ocultatun mantém linguagem de arquivos secretos.
- Cards de classe/expansão ganharam hierarquia, profundidade 3D, estados selecionado/bloqueado e melhor contraste.
- Estado e regras continuam proprietários de `js/script.js`; somente a camada visual foi separada em `css/builder/builder-modern-v0.62.css`.

## Boot / Login
- Removido o estado HTML concorrente que montava Portal e Login simultaneamente.
- O Portal é a primeira tela visual; Login só é montado quando uma ação realmente requer autenticação.
- O boot visual agora possui estado explícito (`ms-shell-booting`) até o primeiro render do Portal.

## Preservação
- Não alterados os dados de fichas, Códices, VTT, Mesa dos Mestres, CMS do Portal, mídia ou autenticação.

## Validação
- Todos os JavaScript passaram `node --check`.
- Suíte QA JS/CJS existente: PASS.
- Teste dedicado do Design System: PASS.
- Nenhum ID HTML duplicado.
- Nenhuma referência local quebrada.
- O Chromium completo do ambiente continua sujeito ao bloqueio `ERR_BLOCKED_BY_ADMINISTRATOR`; o smoke visual foi, portanto, validado por testes estruturais e harnesses disponíveis, sem declarar E2E completo quando o ambiente impede a navegação.
