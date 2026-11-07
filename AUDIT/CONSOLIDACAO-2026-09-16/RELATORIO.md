# Mundos Sombrios — auditoria de consolidação

Data: 16/09/2026. Entrada: `Mundos-Sombrios_v2.10.2_COMPLETO_COM_SANDBOX.zip`.

## Resultado

Consolidação aplicada com build aprovado. Foram corrigidas duplicações ativas, centralizado o carregamento de assets, reparado um contrato de status Realtime e preservadas as implementações históricas sem consumidores em `ARCHIVE/legacy-runtime/`. As regras dos jogos, os dados canônicos, as migrações SQL e os controles de autorização não foram substituídos.

A identidade interna continua **2.10.1**, como no arquivo recebido. O nome externo V2.10.2 não tem correspondência no `package.json`/`VERSION.txt`; esta entrega é identificada pela auditoria datada, sem inventar uma nova versão de produto.

## Escopo e evidência

A análise abrangeu HTML, JavaScript e CSS principais, entradas de carregamento estático e sob demanda, builders, modais, eventos, telas, adaptadores, scripts de build, testes, documentação e arquivos SQL. `dist/` e `sandbox-offline/` foram tratados como saídas geradas, não como fontes independentes.

O ZIP não contém `.git`. Assim, **“desde quando” significa a versão declarada no código ou documentada no acervo**, não data de commit nem prova da primeira introdução histórica. Quando não há evidência suficiente, isso é indicado. A ausência de referências literais não foi usada isoladamente para eliminar funções: exportações, callbacks, IIFEs, HTML e carregadores também foram considerados.

Não houve execução em navegador nem conexão com Supabase remoto. Os testes de comportamento usam Node/VM e adaptadores controlados. A verificação CSS é estrutural, por seletor/propriedade e condições de largura; não é comparação de pixels nem certificação de acessibilidade. Chamadas construídas dinamicamente e consumidores externos não presentes no ZIP não podem ser excluídos por análise estática.

## Antes e depois

| Indicador | Antes | Depois |
|---|---:|---:|
| Build `npm run build` | Aprovado | Aprovado |
| Testes totais | 235 | 249 |
| Aprovados | 216 | 230 |
| Falhas | 0 | 0 |
| Ignorados | 19 | 19 |
| JavaScript na árvore principal `js/` | 60 arquivos | 55 arquivos |
| Bytes de JavaScript principal | 4.540.985 | 4.418.961 |
| Arquivos CSS principais | 28 | 25 |
| Bytes CSS principais | 494.667 | 461.141 |
| Ocorrências `!important` nos CSS principais | 888 | 810 |
| JavaScript carregado diretamente pelo HTML | 784.732 bytes | 784.585 bytes |
| `table-shell-v3.css` | 9.868 bytes | 6.567 bytes |
| Arquivos históricos retirados da publicação | 0 | 9 preservados em arquivo |
| Construtores ativos de Campanha em Movimento | 2 | 1 |
| Implementações de injeção de scripts nos três carregadores revisados | 3 | 1 compartilhada |
| Caminhos de atualização da progressão por entrada normal na Mesa | wrapper + evento | evento |
| Chamadas operacionais imediatas por evento de entrada | imediata + agendada | imediata |
| Declarações da folha-base vencidas por seletor/propriedade na folha posterior | 99 | 0 dentre os casos consolidados |

A redução do boot é pequena: esta entrega melhora principalmente responsabilidade, previsibilidade e manutenção. Não foi medido ganho de tempo de carregamento em navegador.

## Registro dos candidatos e decisões

### Consolidações aplicadas

| ID / candidato | Consumidores e comportamento anterior | Origem disponível | Implementação atual / decisão |
|---|---|---|---|
| C01 — `forja-overhaul-v2.8.8.js` | Sem consumidor explícito no HTML, runtime, testes ou scripts de build; o build copiava toda a pasta. Oferece a Forja e presets de categoria antigos. | V2.8.8 no nome/código. | V2.8.10 é carregada por `feature-loader.js` e lida pelos testes. Arquivada a V2.8.8 com bytes preservados. |
| C02 — `forja-overhaul-v2.8.8.css` | Sem import/link ativo; estilos da Forja anterior. | V2.8.8. | A Forja carrega V2.8.10. Arquivado. |
| C03 — `evolution-backend-v2.10.0.js` | Sem entrada ativa; implementação anterior de trilhas e operações locais/remotas. | V2.10.0. | V2.10.1 é carregada sequencialmente pelo feature loader. Arquivado. |
| C04 — `evolution-gradual-v2.10.0.js` | Sem entrada ativa; viewer e desenvolvimento anteriores. | V2.10.0. | V2.10.1 é a camada ativa. Arquivado. |
| C05 — `evolution-gradual-v2.10.0.css` | Sem consumidor ativo; apresentação anterior das trilhas. | V2.10.0. | V2.10.1 é carregada com a progressão. Arquivado. |
| C06 — `operational-control-v2.10.0.js` | Sem entrada ativa; Central Operacional e Fabric Lite anteriores. | V2.10.0. | V2.10.1 é carregada por `ensureOperational`. Arquivado. |
| C07 — `operational-control-v2.10.0.css` | Sem link ativo; estilos anteriores da Central. | V2.10.0. | HTML carrega V2.10.1. Arquivado. |
| C08 — `ms-consolidation-v2.9.0.js` | Sem entrada ativa. Expõe diagnóstico `MS_RELEASE`; existe referência histórica no changelog V2.9.0. | V2.9.0. | V2.10.1 oferece o contrato mais recente. Arquivado sem reescrever changelog histórico. |
| C09 — `ms-consolidation-v2.10.0.js` | Sem entrada ativa; mesmo diagnóstico com versão anterior. | V2.10.0. | Mantido o diagnóstico V2.10.1; arquivada V2.10.0. |
| C10 — Campanha em Movimento na Forja | `patchLifecycle` envolvia `enterVTT`; `ensureCampaignInTable` criava a janela e `renderCampaignWindow` renderizava o mesmo `vtt-campaign-root`. Também repetia `setLiveStatus`. | Na Forja V2.8.10 recebida; primeira introdução não comprovada. | `table-shell-v3.js`, identificado como V2.8.6 e API V2.9.0, já monta e renderiza a campanha em `mount()`. Removidos os construtores e wrapper da Forja. API pública do shell preservada. |
| C11 — Progressão em entrada/saída da Mesa | `patchEnterVTT` agendava atualização após chamar a entrada original; `vtt:entered` também atualizava. O wrapper de saída limpava estado inclusive quando a confirmação retornava `false`. | V2.8.9. | Removido o wrapper. Entrada usa o evento existente; carga tardia recupera uma Mesa já aberta. Saída confirmada emite `vtt:left` depois de limpar contexto. Cancelamento preserva sessão. |
| C12 — Polling da Tripulação | `startPolling` já chamava `refreshCounter`; o listener agendava outra chamada 100 ms depois. `stopPolling` existia, mas não tinha consumidor ativo. | V2.10.1, com antecedente V2.10.0. | Uma chamada imediata por entrada. `vtt:left` usa `stopPolling`, fecha a Central e limpa sua referência à Mesa. Não removida a função: ela era o cleanup necessário. |
| C13 — Contrato de status Realtime | `table-session-engine.connect` passa `{status}`; `MS_DB.subscribeTable` aceita `handlers.status`; `MS_REALTIME.connect` descartava o terceiro argumento. | Orquestrador v0.66; motor V2.7, segundo os cabeçalhos. | O orquestrador passa `options.status`. O motor recebe inscrição/erro, inicia heartbeat e agenda reconexão. Callback testado com os dois módulos reais em VM. |
| C14 — Encerramento da inscrição | O motor guarda a função retornada e também chama `MS_REALTIME.disconnect`; ambos podiam atingir o mesmo unsubscribe. | Motor V2.7 e orquestrador v0.66. | O orquestrador devolve um encerramento idempotente e libera sua referência ao executá-lo. Duas chamadas externas resultam em uma liberação. |
| C15 — Carregadores de scripts/estilos | Forja, Escudo e vendors mantinham implementações separadas. Após erro, elementos antigos permaneciam; uma nova tentativa podia esperar um evento que já ocorreu. O loader de CSS de vendor aceitava apenas a presença do link. | Feature loader V2.4; Escudo V2.7.3; vendor recebido V2.10.1. | Novo `MS_ASSETS` em `asset-loader.js`: promessa compartilhada por URL/tipo, listeners retirados ao concluir, elemento removido em falha e retry real. Forja/progressão aguardam seus estilos. APIs externas dos três loaders preservadas. |
| C16 — Aviso de carga do Escudo | Cliques concorrentes podiam inserir mais de um `#ms-shield-loading`, apesar de compartilharem `pending`. | Loader V2.7.3. | Inserção condicionada à ausência do ID. |
| C17 — CSS-base da Mesa | `index.html` carrega `table-shell-v3.css` antes de `table-studio-v2.8.6.css`. Há propriedades repetidas para seletores completos idênticos, vencidas incondicionalmente na folha posterior. | Shell V3 / Studio V2.8.6. | Retiradas 99 declarações vencidas, respeitando `!important`. Propriedades exclusivas, seletores agrupados diferentes e blocos `@media` preservados. Manifesto lista cada retirada e seu valor canônico. |
| C18 — `msSyncOnlineState` | Somente declaração global; nenhuma chamada/exportação adicional no HTML, JS, testes ou scripts auditados. Fazia uma delegação pós-login ao DB. | Comentário V2.8.1; primeira introdução não comprovada. | Removida a função não chamada. Hidratação ativa `msHydrateRemoteGameState` e APIs do DB preservadas. |
| C19 — `tableCtx` / `ownCharacter` na Evolução | Constante e função locais sem consumidor na V2.10.1. `tableCtx` consultava contexto; `ownCharacter` comparava posse. | V2.10.1, com antecedente V2.10.0. | Removidas apenas essas declarações. Nenhuma autorização em serviço/SQL foi removida. |
| C20 — Delegação do viewer | Listener genérico `[data-character-id]` chamava diretamente o `openViewer` fechado na camada V2.8.9, ignorando a API ampliada após carregar V2.10.1. Não foi encontrado emissor literal desse atributo fora do próprio listener; pode servir consumidores dinâmicos. | V2.8.9, sobreposta por V2.10.1. | Listener preservado, encaminhando para `MS_PROGRESSION.openViewer` atual. Nenhum segundo modal criado. |

### Candidatos preservados — razões específicas

| ID / candidato | Quem usa e comportamento | Desde quando / alternativa | Decisão |
|---|---|---|---|
| P01 — `progression-v2.8.9.js` + `evolution-gradual-v2.10.1.js` | O feature loader carrega ambos; V2.10.1 captura `legacy` e usa `legacy.openViewer`. A base fornece modal, carteira, administração, perfil e edição. | V2.8.9 / V2.10.1. | Preservados: composição real, não cópias intercambiáveis. |
| P02 — `patchBuilderSave` em duas camadas | Uma trata proposta de evolução anterior; outra trata `developmentContext` e delega quando ele está ausente. | V2.8.9 / V2.10.1. | Preservados. Unificação exigiria migrar todos os contextos e jornadas; ausência de nome exclusivo não prova redundância. |
| P03 — Modal `manage-players` e Central Tripulação | `openManagePlayers` continua fallback explícito no shell quando a Central não está disponível. | Legado sem primeira versão comprovada / Central V2.10.1. | Preservados. Remover o modal antigo eliminaria o fallback. |
| P04 — Viewer, Fichas Rápidas e diálogo de evolução | Viewer mostra uma ficha; Fichas Rápidas seleciona fichas; diálogo registra ações de evolução. IDs e consumidores distintos. | Progressão V2.8.9 / operacional e evolução V2.10.1. | Preservados. Não são o mesmo modal. |
| P05 — `installGalleryEditor` e `renderGalleryCanonical` | O primeiro é nome de IIFE executada; o segundo é função atribuída a `window.renderGallery`. | Arquivo de galeria existente; documentação V2.8.3 declara proprietário canônico. | Preservados. Falsos positivos de contagem pelo nome interno. |
| P06 — Funções homônimas locais | `draw`, `render`, `role`, `slug`, `uploadFiles`, `deleteFile`, `buildSkillTreeUI`, `connect`, `send` etc. aparecem em escopos/domínios diferentes; há chamadas e exportações específicas. | Várias versões; sem histórico Git. | Preservadas onde não há identidade de estado e comportamento comprovada. |
| P07 — Adaptação Fabric Lite | `vendor-loader` a usa no sandbox e como fallback da carga remota de Fabric; Central expõe `createFabricLite`. | Operacional V2.10.x. | Preservada. Continua necessária ao modo local. |
| P08 — Offline DB e Supabase DB | Configuração seleciona adaptador; fornecem persistência e autenticação em ambientes diferentes. Serviços consomem `MS_DB`. | Acervo online v0.66/V2.x; offline V2.8.11 em diante. | Preservados. Contratos semelhantes não significam backend redundante. |
| P09 — Fallbacks RPC/IDs legados | `supabase-db.js` contém compatibilidade de perfis e inserção/broadcast quando RPC não está disponível. | Comentários V2.8.1 e acervo online. | Preservados: não há inventário de bancos implantados que autorize retirar compatibilidade. |
| P10 — `ms-consolidation-v2.10.1.js` e configuração exemplo | Diagnóstico manual e modelo de configuração, respectivamente; não são carregados pelo HTML. | V2.10.1. | Preservados e identificados como utilitários, sem ativar novos efeitos no boot. |
| P11 — SQLs cumulativos e migrações | README orienta instalação; testes consultam contratos históricos; instaladores incorporam etapas anteriores. | Diversas versões declaradas. | Preservados. Não são scripts frontend mortos e não foram executados em banco remoto. |
| P12 — `dist/` e `sandbox-offline/` | GitHub Pages publica `dist`; usuários QA usam sandbox. Scripts copiam a fonte principal. | Scripts atuais V2.10.1. | Regenerados pelo build; nunca editados manualmente. A única exceção funcional de bytes no sandbox é `ms-runtime-config.js`. |
| P13 — Demais camadas CSS e inline | Portal, Forja, imersão, modais e módulos de classe possuem consumidores ativos e regras condicionais. | V0.x–V2.10.1. | Preservadas quando não há prova suficiente de sobrescrita incondicional. Os 810 `!important` restantes não foram removidos por quantidade. |
| P14 — `PortalMedia.revokeAll` | Método exportado de compatibilidade, hoje no-op porque usa URLs públicas. | Portal Media V2.0. | Preservado como API pública; não foi usado apenas o critério “sem chamada local”. |
| P15 — Persistência legada e namespaces antigos | Rascunhos, preferências e adaptador local leem chaves existentes. | Múltiplas versões documentadas. | Preservados para não perder dados de navegadores existentes. |

## Rotas, imports, flags e tipos

- A aplicação usa telas e funções globais, não React Router nem hooks React. Foram auditados os equivalentes: wrappers, observers, listeners, variáveis de módulo e propriedades em `window`.
- Todas as chamadas literais de `showScreen`/`show` para `screen-*` encontradas apontam para IDs existentes. Isso não valida rotas construídas dinamicamente nem a navegação em navegador.
- Nenhum caminho literal de asset carregável faltante foi encontrado no conjunto verificado. `assets/atlas/places/local.webp` é apenas o **placeholder** de um campo no Atlas; não é import nem imagem carregada. Foi preservado.
- Os testes históricos referenciam `test/sandbox-runtime.js` e a migração-base V2.7 ausentes no pacote; seus testes já são condicionais. Não foram inventados esses arquivos nem transformados testes ignorados em aprovações.
- Não há tipos/interfaces TypeScript no frontend principal; divergências são contratos JavaScript. O descompasso de `status` do Realtime foi reparado. Formatos `data/error`, aliases de IDs, fichas legadas e serializações foram preservados por compatibilidade.
- Não foram encontradas marcações explícitas `deprecated`/`@deprecated` no frontend principal. Comentários “legado” foram avaliados por consumidores, não tratados como autorização automática de remoção.
- As flags de guarda, como as de patches e carregamento, continuam necessárias. Foram removidos somente os helpers locais comprovadamente órfãos citados em C19.

## Validação executada

1. **Baseline:** `npm run build`, incluindo geração do sandbox, sintaxe, testes e publicação local em `dist`.
2. **Após as alterações:** o mesmo comando, aprovado com 55 arquivos JavaScript sintaticamente válidos, 249 testes, 230 aprovações e 19 ignorados.
3. **14 novos testes:** concorrência de assets; falha/retry de script; espera/retry de CSS; CSS já existente; delegação dos três loaders; status e encerramento idempotente de Realtime; integração real motor/orquestrador com heartbeat e queda; entrada única da progressão; carga tardia; cancelamento/saída confirmada; polling da Tripulação; proprietário da Campanha; assets/arquivamento; equivalência estrutural CSS.
4. **Dois testes históricos ajustados:** a Campanha passou a ser procurada no shell, seu proprietário canônico; a verificação de estilos da Mesa considera as duas folhas carregadas. As expectativas funcionais foram mantidas, sem ignorar os testes.
5. **CSS:** comparação em 320, 390, 640, 760, 761, 1024, 1040, 1041, 1050, 1051, 1440 e 1920 px. A fixture anterior acompanha o teste. O verificador cobre as formas de CSS usadas nessas duas folhas; não é um parser CSS geral.
6. **Saídas geradas:** 161 comparações byte a byte de HTML/JS/CSS principal contra `dist` e sandbox, todas iguais, com a exceção deliberada da configuração do sandbox.

Os logs completos e manifestos ficam em `AUDIT/CONSOLIDACAO-2026-09-16/`. O manifesto CSS registra cada uma das 99 declarações, valor anterior e proprietário posterior. `alteracoes.patch` contém o diff; `before/` preserva os arquivos alterados existentes, e `ARCHIVE/legacy-runtime/` guarda as nove versões retiradas da publicação sem alteração de bytes.

## Limites e pendências que não foram ocultados

- Os 19 testes ignorados permanecem uma lacuna; cobrem infraestrutura histórica ausente e partes de contratos de sessão/permissão.
- Supabase real, RLS, RPC, sincronização multiusuário e reconexão em rede precisam de validação no ambiente configurado. O callback agora chega ao motor, mas isso não certifica toda a operação remota.
- A revisão visual de jogador/mestre/ADM em navegador permanece pendente. A auditoria não redesenhou telas nem certificou ausência de sobreposições visuais.
- A arquitetura ainda contém wrappers de compatibilidade, estado global e composição de camadas de evolução. Retirá-los exige jornadas adicionais, não limpeza cosmética.
- O diagnóstico `MS_RELEASE` mais recente continua fora do boot, como na entrada. Seu uso manual foi preservado.
- A configuração de Supabase continua vazia e o fallback local continua existente. Nenhum banco, usuário, serviço externo ou site publicado foi alterado.

## Como usar a entrega

A raiz do ZIP contém o projeto completo. Execute `npm run build` para regenerar `sandbox-offline/` e `dist/`. Para publicação, utilize `dist/`; o arquivo histórico, evidências, SQL e testes ficam fora dela. O pacote mantém as instruções e os lançadores locais já existentes.

Não copie somente os arquivos modificados por cima de uma pasta antiga se quiser retirar as versões históricas da publicação: substitua a árvore do projeto pelo pacote consolidado ou mova os nove itens conforme o manifesto antes do build. As cópias históricas não participam da execução atual.
