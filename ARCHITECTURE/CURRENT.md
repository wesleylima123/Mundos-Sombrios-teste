# Mundos Sombrios — Arquitetura Atual (2.8.9)

## Fonte de verdade
Supabase Auth + PostgreSQL + RLS + RPC + Realtime.

## Camadas
`UI → Services → Supabase DB → RLS/RPC/Realtime`

### Core
- `js/ms-platform.js`: eventos, estados, validação, recursos, exportação e feedback.
- `js/ms-services.js`: serviços de domínio (`Auth`, `Profile`, `Characters`, `Games`, `VTT`, `Content`, `Soul`).
- `js/supabase-db.js`: único adaptador de transporte para Supabase.


### Experiência / apresentação
- `js/immersive-experience.js`: camada de UX e direção de arte; não é fonte de regra nem persistência de jogo.
- `css/immersive-experience.css`: identidades visuais de Êxodo, Ocultatun, Envolto e Ordem, níveis Funcional/Imersivo/Cinemático e estados de consequência.
- `css/portal/portal-editorial-v2.2.css`: camada final do Portal Oficial, responsável por hierarquia editorial, densidade, limites de leitura e responsividade da home/subpáginas.
- `js/portal/portal-core.js`: shell persistente do Portal, navegação, composição da home e rotas editoriais; não é fonte de regras de jogo.
- Preferências de interface podem usar `localStorage`, mas nunca fichas, credenciais, mesas, regras ou conteúdo canônico.

### Dados canônicos
- `profiles`: identidade e papel.
- `characters`: ficha atual do jogador.
- `character_versions`: histórico da ficha.
- `tables`: Mesa/Fenda canônica.
- `table_members`: participantes e vínculo com personagem.
- `table_state`: estado estrutural do VTT, controlado pelo Mestre.
- `table_events`: chat, dados e eventos transitórios persistíveis.
- `table_invites`: convites temporários.
- `campaigns` e `game_sessions`: camada de campanha/sessão.
- `gm_notes`, `gm_npcs`, `gm_files`: ferramentas privadas da mesa.

### Imortalização de ficha
- Nos modos **Êxodo** e **Ocultatun**, os únicos pré-requisitos editoriais para persistir uma ficha são **Nome + Expansão/Origem + Classe**.
- Atributos, conceito, perícias, poderes, equipamento, retrato e demais campos são progressivos/opcionais e nunca bloqueiam a imortalização.
- Slots de conta e acesso à expansão continuam sendo autorização econômica separada, validada server-side.

### Regra de ouro
Nenhum componente deve criar uma segunda fonte de persistência. `localStorage`/`sessionStorage` não são banco. O estado local é somente de interface/sessão.

### Permissões
A UI pode ocultar ações, mas a autorização real deve existir em RLS/RPC. Jogadores só alteram suas próprias fichas; Mestres administram apenas suas mesas; membros recebem apenas os dados da mesa aos quais têm acesso.

### Realtime
`table_events` transmite eventos de mesa; `table_state` sincroniza o estado estrutural do Mestre.

### Migração
Funcionalidades legadas podem continuar usando wrappers compatíveis, mas a nova implementação deve entrar por `MS_SERVICES`. Remoções de adapters só acontecem depois da auditoria de dependências.


## UX, Login e Performance V2.8.4
- O Portal público renderiza imediatamente a partir do conteúdo local e sincroniza `site_content/posts` em segundo plano; navegação pública não fica bloqueada pelo boot do Supabase.
- `PortalContent.hydrate()` deduplica chamadas concorrentes e usa janela curta de 30 s para evitar leituras remotas repetidas.
- A seleção de modo não dispara mais o carregamento pesado da Forja; os módulos da ficha só entram ao abrir Santuário/Builder.
- Códices e Ancoragem evitam renderizações duplicadas nos atalhos do Portal.
- O painel do Arconte abre com o estado autenticado já disponível e sincroniza usuários/solicitações em uma única rodada paralela.
- Solicitações de elevação de Mestre usam `resolve_admin_request_secure` quando disponível e possuem fallback compatível com instalações que ainda não aplicaram essa RPC, preservando RLS e `admin_set_user_role`.
- A tela de login oferece retorno público ao Portal, mostrar/ocultar senha e feedback explícito para credenciais inválidas.


## Centro de Comando do Mestre V2.3
A Sala dos Mestres passa a operar em Campanha -> Sessão -> Cena -> Consequência. `master-command-center.js` adiciona fases de preparação/sessão/pós-sessão, storyboard de cenas, facções, relações, busca universal, visão do jogador, cronologia automática e integração dos Registros Históricos. O Cofre permanece como camada de detalhe e `table_state` continua sendo a persistência estrutural da mesa.

A migração `supabase-master-v2.3-migration.sql` adiciona papéis operacionais `co_mestre` e `observador` sem elevar permissões de perfil global.


## Performance e experiência do Mestre V2.4
- O modal de criação de mesa usa viewport limitado, cabeçalho/rodapé fixos e rolagem apenas no corpo.
- Campanha em Movimento é contextual à mesa selecionada, e não uma janela global da Ancoragem.
- D4, D6, D8, D10, D12 e D20 têm malhas 3D próprias em Canvas 2D e animação sincronizada em rolagens locais/remotas.
- Fabric.js e html2pdf são carregados apenas quando VTT/PDF são solicitados.
- A camada pesada da Forja (JS e CSS) é carregada sob demanda preservando a ordem histórica de módulos.
- O boot local de JavaScript caiu de 1.619.672 para 629.802 bytes (~61%).
- Partículas deixam de criar/remover DOM em loop e o polling permanente da Forja foi removido.


## Soul Economy V2.5
- `js/soul-economy.js` apresenta Orbe SoulDrakma, Colheita, Cofre, conquistas e console ADM; não é fonte de verdade econômica.
- `css/soul-economy.css` concentra a direção de arte e animações 3D da economia.
- `supabase-soul-economy-v2.5-migration.sql` cria Wallet, Ledger, catálogo, entitlements, Colheitas, conquistas e guardas server-side de criação.
- `soul_catalog` é a fonte canônica dos preços; o catálogo no frontend é somente fallback de apresentação.
- Jogador: 3 fichas, 0 mesas e expansões por entitlement. Mestre: 5 fichas, 3 mesas e expansões completas. ADM: ilimitado.
- Compras são atômicas por RPC. Saldo, slots e desbloqueios jamais são concedidos por `localStorage`.
- `localStorage` continua permitido apenas para posição/minimização do Orbe e outras preferências de interface.
- Não existe transferência de SoulDrakma entre contas na V2.5.

## Mesa, Ancoragem e Diretório V2.8
- `js/master-room.js` usa a Ancoragem V3 como representação canônica das mesas. Os cards `.mr-*` e `.player-table-*` anteriores não fazem mais parte da árvore de interface ativa.
- `js/table-shell-v3.js` é o shell canônico da Mesa ao Vivo; saúde de sessão é recebida pelo barramento `MS_PLATFORM`, e não por listeners DOM paralelos.
- `js/table-directory.js` concentra o Diretório de Fendas, pedidos de entrada e recrutamento.
- `supabase-bugfix-v2.8.2-migration.sql` mantém compatibilidade de propriedade entre `profiles.id` e UUID legado de autenticação e acrescenta as ações administrativas seguras da V2.8.2.

## Consolidação V2.8.3
- Helpers, listeners e estilos sem consumidor comprovado foram removidos somente após busca de referências.
- `beginNewCharacter` possui uma única implementação pública robusta em `script.js`.
- A galeria possui um único proprietário de render/crop em `js/gallery-editor.js`; `script.js` apenas delega quando necessário.
- O renderer de dados canônico continua sendo `js/dice-3d.js`; o antigo helper CSS sem chamadas foi retirado.
- A composição do Portal usa `portal-home-panel*`, `portal-list-grid` e `portal-world-grid`; containers editoriais antigos sem emissor foram removidos das camadas CSS, preservando cards e links ativos.
- A propriedade de filosofia dos Caminhos alquímicos customizados foi normalizada para `philosophy` em todo o fluxo.
- Testes históricos que dependem do antigo `test/sandbox*` permanecem no repositório, mas são condicionais porque esse sandbox não integra o pacote de produção.
- A migração-base `supabase-table-session-v2.7-migration.sql` continua ausente do acervo recebido. A V2.7.3 declara dependência dela; portanto, sua reconstrução não foi inferida nem inventada nesta consolidação.


## Responsividade e QA Offline V2.8.5
- A Ancoragem e o Centro de Comando usam contenção de largura (`min-width:0`/`max-width:100%`) e rolagem horizontal interna nas barras de abas em viewports estreitos; o documento não deve crescer para acomodar tabs.
- Janelas de solicitações ADM recebem `.admin-request-window`; abaixo de 640 px são centralizadas e limitadas ao viewport sem alterar o comportamento desktop/drag.
- O favicon oficial passa a ser `assets/favicon.svg` com fallbacks ICO/PNG.
- O sandbox offline não faz parte do ZIP de produção nem do UPDATE cumulativo. Ele é integrado somente à pasta completa de validação e usa a chave local `ms-sandbox-v285`.
- No sandbox integrado, Mestre/ADM podem executar `SALVAR FENDA` dentro da mesa; Jogador não recebe essa autoridade.

## Fenda Studio, idempotência e desempenho V2.8.6
- `css/table-studio-v2.8.6.css` é a camada visual canônica do criador de Fendas e da Mesa ao Vivo, preservando os IDs/contratos funcionais legados necessários.
- `js/table-shell-v3.js` preserva `MS_TABLE_SHELL`, mas monta a nova composição Fenda Studio com grid tático, iniciativa e ferramentas de Mestre/Jogador.
- O rascunho de mesa recebe UUID/código uma única vez; `saveDraftTable()` serializa a gravação e `create_table_secure()` é idempotente por `p_id`.
- `js/feature-loader.js` posterga `dice-3d.js` e `master-history-data.js` até o primeiro uso.
- A hidratação usa `Games.summaries()` como fonte primária e só chama `Games.listMine()` como fallback. A lista global de usuários é carregada automaticamente apenas para ADM.
- O estilo-base de `.portal-gateway` pertence ao CSS do Portal e não depende mais da Forja.


## Forja transversal e auditoria V2.8.8
- A categoria passa a ser uma camada anterior à expansão/classe, representada por ícones 3D compactos.
- A seleção aplica automaticamente atributos, perícias e bônus de PE da categoria à ficha e persiste `categoryPreset`.
- Os bônus de categoria de Êxodo são a referência canônica; em Ocultatun a camada de categoria é uma regra transversal do site solicitada pelo projeto, com perícias equivalentes do vocabulário do modo.
- A camada visual/mecânica da Forja é carregada sob demanda por `feature-loader.js`, preservando o boot leve.
- Campanha em Movimento permanece integrada à Mesa do Mestre.


## Autoridade de ficha e Evolução Gradual V2.8.9

- Visualização de ficha usa viewer somente leitura antes do editor.
- Mudanças mecânicas pós-criação são autorizadas por Mesa via PEG e ledger.
- Mestre e ADM compartilham autoridade de gestão; ADM também ajusta reservas pelo Arconte.
- Recursos sensíveis não aceitam edição livre pelo jogador.
- Requisitos de admissão e visibilidade de ficha pertencem à configuração da Mesa.
- Progressão é carregada sob demanda para preservar o boot principal.
