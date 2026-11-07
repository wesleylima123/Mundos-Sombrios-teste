# Mundos Sombrios — Portal Oficial V0.61.0

## Objetivo
Transformar a entrada do produto em um portal institucional do cenário, sem reescrever os motores existentes.

## Proprietários
- `js/portal/portal-content.js`: fonte única de conteúdo público e persistência `mundosSombriosPortalContentV1`.
- `js/portal/portal-core.js`: navegação, renderização pública, estados de conteúdo e CTAs.
- `js/portal/portal-admin.js`: CMS local do ADM para publicação/edição/exclusão.
- `css/portal/portal.css`: identidade visual, responsividade e animações do portal.
- `js/script.js`: continua proprietário do login, seleção de modo, Santuário, fichas e VTT.
- `js/world-codices.js`: continua proprietário da consulta aos Códices.
- `js/master-room.js`: continua proprietário da apresentação da Mesa dos Mestres.
- `js/master-tools.js`: continua proprietário das ferramentas privadas e Escudo do Mestre.

## Conteúdo administrável
- Hero
- Destaque principal
- Anúncios/atualizações
- Eventos
- Classes
- Expansões
- Comunidade
- Mundos

## Permissões
- Visitante: portal público e Códices públicos.
- Jogador: portal + criação/edição de fichas + acesso às mesas às quais pertence.
- Mestre: além disso, Mesa dos Mestres e ferramentas privadas.
- ADM: tudo + CMS do Portal.

## Persistência
O CMS usa `localStorage` por compatibilidade com a arquitetura atual. O schema foi separado dos estados das fichas e VTT para evitar colisões.

## Estados
- Conteúdo publicado: renderizado.
- Lista vazia: estado vazio visível.
- Falha de armazenamento: mensagem de erro.
- Item inexistente: fallback para a listagem/portal.
- Acesso sem autenticação: CTA encaminha para login quando a ação exige sessão.

## Navegação
`Portal → Mundo → Conteúdo → Códice / Jogo / Mesa`.
A área pública não depende da tela de autenticação para leitura editorial.

## Responsividade e acessibilidade
- navegação sem depender de hover;
- botões com texto e foco nativo;
- `aria-label` na região do portal;
- suporte a `prefers-reduced-motion`;
- grids adaptativos para tablets e mobile.
