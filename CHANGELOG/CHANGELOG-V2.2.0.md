# Seite_Mundos-Sombrios — 2.2.0

## Portal Oficial — direção de arte editorial
- Reorganizada a home para reduzir extensão vertical e melhorar a hierarquia de leitura.
- Hero reduzido e limitado a uma coluna de leitura curta, com console visual de identidade.
- Navegação dividida em faixa principal e faixa editorial, preservada também nas subpáginas.
- Destaque e seleção de mundos reunidos em uma única composição editorial.
- Seções vazias deixam de ocupar grandes áreas da página inicial.
- Adicionado Índice do Portal para acesso rápido a Novidades, Agenda, Classes, Expansões, Histórias, Comunidade e Códices.
- Conteúdo publicado na home aparece em painéis editoriais compactos, no máximo dois registros por área.
- Textos de cards, destaque e subpáginas receberam limites de leitura e line-clamp.
- Janelas administrativas receberam largura, altura, cabeçalho e abas mais disciplinados.
- Layout revisado para desktop, tablet e mobile.
- Códices e Mesas no cabeçalho agora usam suas ações corretas em vez de rotas editoriais.

## Arquivos
- `css/portal/portal-editorial-v2.2.css` — nova camada final do Portal.
- `js/portal/portal-core.js` — composição editorial e shell persistente.
- `js/portal/portal-content.js` — versão pública V2.2.
- `index.html` — carregamento da camada editorial.

## Qualidade
- A home padrão passou de aproximadamente 4002 px para 1685 px de altura na captura desktop de referência, redução próxima de 58%.
- Nenhuma seção editorial vazia é renderizada na home.
