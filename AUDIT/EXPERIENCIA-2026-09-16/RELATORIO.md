# Mundos Sombrios V2.10.2 — consolidação da experiência

Data: 16/09/2026. Relatório complementar à auditoria de consolidação incluída em `AUDIT/CONSOLIDACAO-2026-09-16/`. As métricas e a versão daquele relatório descrevem a etapa anterior; os resultados atuais são os deste documento.

## Entendimento do projeto

Mundos Sombrios reúne um Portal público e acervo de Códices, a Forja de personagens e uma Mesa virtual para Êxodo e Ocultatun. Jogador, Mestre e Arconte têm responsabilidades distintas. Fichas, progressão, campanha, mapas, dados e conversas formam uma mesma experiência de RPG, com identidade visual sombria. O objetivo desta entrega foi tornar essa experiência mais previsível, legível e explícita sobre seu ambiente de execução, preservando as regras existentes.

## Resultado e limites

Consolidação implementada e `npm run build` aprovado. Não foram acrescentados sistemas de jogo, notícias fictícias, credenciais ou novas regras. Há **236 testes aprovados, zero falhas e 19 ignorados**. As saídas `dist/` e `sandbox-offline/` foram regeneradas a partir da fonte principal.

**A validação visual em navegador permanece pendente.** A instalação do Chromium/Playwright foi tentada, mas falhou por timeout e erro 502. Nenhuma captura ou jornada visual é apresentada como validada. Os testes novos executam código real em Node/VM com DOM controlado; não comprovam geometria renderizada, contraste medido ou funcionamento entre dispositivos.

**Supabase remoto não foi conectado:** URL e chave pública continuam vazias. A identificação da demonstração foi corrigida, mas multiplayer remoto, RLS e sincronização entre duas contas reais permanecem sem homologação. O build aprovado é do pacote local, não uma certificação de produção online.

## Antes e depois

Contagens sobre `js/` e `css/` da fonte, sem duplicar `dist`, sandbox ou arquivos históricos. Bytes de boot somam scripts locais referenciados diretamente pelo HTML; não medem tempo de carregamento.

| Indicador | ZIP recebido | Após auditoria inicial | Entrega atual |
|---|---:|---:|---:|
| Linhas de `script.js` | 6.833 | 6.827 | 5.592 |
| Arquivos JS principais | 60 | 55 | 57 |
| Bytes JS referenciados pelo HTML | 784.732 | 784.585 | 714.666 |
| Bytes CSS principais | 494.667 | 461.141 | 451.463 |
| Ocorrências `!important` | 888 | 810 | 583 |
| Testes aprovados | 216 | 230 | 236 |
| Testes ignorados | 19 | 19 | 19 |
| Falhas | 0 | 0 | 0 |
| Versão de produto interna | 2.10.1 | 2.10.1 | 2.10.2 |

A redução de `!important` foi consequência da concentração de responsabilidades, não remoção indiscriminada. Os 583 restantes ainda incluem estilos ativos e compatibilidade com coordenadas inline; não se afirma que todos sejam necessários ou defeituosos. `script.js` continua grande: a extração foi delimitada e não resolve toda a arquitetura.

## Registro dos candidatos desta etapa

O ZIP não contém histórico Git. “Origem” abaixo é a versão identificada pelo arquivo/cabeçalho, não a data comprovada de introdução. O inventário anterior inclui componentes, modais, eventos, funções, rotas, flags, contratos e adaptadores preservados ou consolidados.

| Candidato | Quem usa / comportamento | Origem disponível | Implementação e decisão |
|---|---|---|---|
| Layout da Mesa em quatro folhas | HTML carrega shell, Studio e operacional; a Forja injeta outra folha sob demanda. Todas alteravam o mesmo DOM da Mesa, inclusive após abrir uma ficha. | Shell V3/Studio V2.8.6, Forja V2.8.10, operacional V2.10.1. | `table-shell-v3.css` passa a ser a fonte única dessas regras. Foram retiradas 118 regras concorrentes das outras três folhas; seletores e declarações anteriores estão no manifesto CSS. Estilos próprios da criação de mesa, Forja e Central continuam nesses arquivos. |
| Mesa móvel empilhada | Mestre e jogador precisavam percorrer mapa, ferramentas e painéis em sequência. | Regras responsivas nas folhas citadas. | O shell existente controla `data-mobile-pane`: Mapa, Personagens, Ferramentas e Conversa. Reutiliza os mesmos nós e estado. Chat, dados e iniciativa mantêm as abas existentes. |
| Controles e tipografia comprimidos | Comandos recorrentes da Mesa e diálogos operacionais. | Sobreposições V2.8.x–V2.10.1. | Comandos do shell com mínimo CSS de 44 px e texto .875rem; navegação móvel .8125rem; campos 1rem. Tipografia pequena dos diálogos revisada em suas próprias folhas. Não é uma certificação visual de todos os controles do produto. |
| Redimensionamento do mapa | Voltar ao mapa após trocar painel ou alterar largura requer atualizar o canvas. | `initVttGrid` já inicializava mapa e eventos. | `msResizeVttGrid` somente ajusta dimensões quando mudam; o shell observa sua área e o chama ao voltar ao mapa. Não reinstala listeners nem recarrega estado do mapa nessa operação. |
| Laboratório Alquerino dentro de `script.js` | Forja, carregamento e serialização de fichas; ingredientes, fórmulas e caminhos. | Cabeçalho V0.39. | Extraído para `js/alquerino-lab.js`, primeiro módulo da sequência existente da Forja. Seus 74.424 caracteres anteriores ao ajuste de inicialização DOM foram comparados e preservados exatamente. Mantidos contratos de ficha e regras. Inicialização também funciona quando o módulo chega após DOMContentLoaded. |
| Avisos de ambiente dispersos | Login, toolbar de QA, sandbox e saúde da Mesa. | Adaptador local atual e UI online v0.67. | `MS_ONLINE_UI.renderEnvironment` mantém um único aviso persistente, baseado no adaptador efetivo. Distingue demonstração, online indisponível e online pronto. Mesa local mostra “MESA LOCAL”; QA começa recolhida. Retirado o segundo banner CSS do sandbox. |
| Portal com mídia e catálogo vazios | Visitantes e editor administrativo. | Portal Content V2.2. | Defaults usam arte já incluída, duas classes existentes e expansões derivadas de `CODEX_FILE_CATALOG`. Publicações editoriais prevalecem; seção explicitamente vazia é respeitada. Notícias, eventos e histórias não foram inventados. Seções vazias oferecem acesso ao acervo. |
| Versão divergente | Título HTML, manifesto, VERSION, builds e UI de demonstração. | ZIP V2.10.2 versus fontes V2.10.1. | `package.json` é a fonte da versão 2.10.2; `sync-version.mjs` gera VERSION, `ms-version.js` e título antes do build. Scripts usam a mesma versão. Nomes de módulos/SQL históricos e namespaces de persistência continuam intactos para não quebrar referências ou perder dados locais. |
| Testes acoplados ao formato antigo | Oito verificações exigiam arquivo antigo, versão antiga ou layout empilhado. | Suítes V2.8.x–V2.9.0 e auditoria inicial. | Atualizados para os proprietários atuais. A antiga equivalência de CSS foi substituída por verificação estrutural do novo contrato em 12 larguras, pois o layout mudou intencionalmente. Seis testes adicionais executam comportamentos em VM. Nenhum teste foi ignorado para esconder falha. |

## Evidência de testes

Comando executado: `npm run build`. Inclui sincronização de versão, geração do sandbox, verificação sintática, suíte completa e geração do site estático. Resultado: 57 arquivos JavaScript sintaticamente válidos; 255 testes, dos quais 236 aprovados e 19 ignorados; nenhuma falha. Log integral incluído nesta pasta.

Novos testes comportamentais:

1. Alternância dos quatro painéis e atualização de `aria-pressed`, com retorno ao mapa.
2. Aviso único de ambiente, com transição entre local, indisponível e online.
3. Catálogo do Portal derivado dos documentos existentes, imagens locais existentes e ausência de eventos/notícias inventados.
4. Prevalência de publicação real e respeito a uma seção configurada vazia.
5. Carregamento e serialização de inventário, fórmulas, caminhos e preparações personalizados do Alquerino.
6. Concordância da versão entre manifesto, runtime gerado, VERSION e título.

A suíte também mantém as verificações anteriores de permissões locais, progressão, reconexão, encerramento de inscrição, carregamento concorrente e saída cancelada da Mesa. Os 19 testes ignorados já dependiam de `test/sandbox-runtime.js` e da migração-base V2.7 ausentes no pacote. Não foram recriados por suposição.

## O que foi preservado

As nove implementações históricas arquivadas na auditoria inicial continuam em `ARCHIVE/legacy-runtime/`, fora de `dist`. As camadas de progressão com dependência real, fallback do modal de jogadores, Fabric Lite, adaptadores local/remoto, migrações SQL e contratos legados foram preservados pelos motivos detalhados no relatório anterior. Não houve limpeza por aparência de redundância. Bancos e serviços externos não foram alterados.

## Próxima validação antes de publicar

- Em navegador, testar 390, 768, 1024 e 1440 px: entrada/saída, salvar, painéis móveis, mapa, teclado, modais, chat, dados e iniciativa. Abrir a Forja durante a sessão e voltar à Mesa para conferir que a carga tardia não muda seu layout.
- Conferir fichas Alquerino novas e existentes e persistência após recarregar a página.
- Configurar a URL e chave pública do projeto pretendido em `js/ms-runtime-config.js`; nunca usar chave privilegiada no frontend. Homologar Mestre e Jogador em sessões separadas, permissões e recuperação após perda de conexão.
- Revisar o texto editorial escolhido para o Portal. O preenchimento desta entrega apresenta o acervo real, sem substituir uma agenda editorial.

Como direção de jogo e arte, a prioridade seguinte é observar uma sessão completa e corrigir atritos de uso. A identidade sombria foi mantida; legibilidade, hierarquia e acesso aos comandos devem orientar novas alterações antes de ampliar sistemas.

## Arquivos para revisão

`manifesto.json` lista hashes antes/depois de cada fonte alterada nesta etapa. `alteracoes.patch` mostra as diferenças. `before/` preserva as fontes anteriores modificadas. `experience-css-ownership.json` registra as regras concorrentes. A auditoria anterior preserva o histórico da primeira etapa. O ZIP contém fonte, testes, acervo, documentação, sandbox e `dist` atualizado.
