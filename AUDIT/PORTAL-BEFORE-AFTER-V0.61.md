# Auditoria de Implementação — Portal Oficial V0.61.0

## Antes
- Entrada do site: login como primeira tela.
- Seleção de modo funcionava como centro da aplicação, não como portal institucional.
- Notícias, eventos, classes e expansões não tinham camada editorial própria.
- Conteúdo público não possuía CMS separado.
- Mesa dos Mestres e Códices eram acessíveis, mas sem uma homepage institucional que os organizasse.

## Depois
- Entrada do site: Portal Oficial.
- Login passou a ser uma porta de entrada para funções protegidas.
- Nova homepage com hero, destaque, anúncios, novidades, eventos, classes, expansões, comunidade, mundos e Centro dos Mestres.
- Códices ficam disponíveis como conteúdo público.
- Jogar exige sessão.
- Mesa dos Mestres exige sessão e mostra as ferramentas conforme permissão.
- ADM possui CMS local para criar/editar/excluir conteúdo.
- Conteúdo editorial tem uma única fonte de verdade e uma chave de armazenamento própria.

## Implementação
Novos arquivos:
- `js/portal/portal-content.js`
- `js/portal/portal-core.js`
- `js/portal/portal-admin.js`
- `css/portal/portal.css`
- `QA/test-official-portal-v0.61.py`

Alterações de integração:
- `index.html` adiciona `screen-portal`, modal do CMS, CSS e módulos do Portal.
- `script.js` passa a retornar ao Portal no boot/logout/login bem-sucedido, sem transferir a propriedade do sistema de autenticação.

## Preservação
Nenhum motor de fichas, VTT, Códices, Mestre, Esotérico, Galeria, Alquerino, Hermético ou Envolto foi reescrito.
