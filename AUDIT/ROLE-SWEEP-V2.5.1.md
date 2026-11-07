# Varredura por Papel — V2.5.1

## Escopo
Revisão da V2.5 Soul Economy em Chromium 144, executado em display virtual e alimentado com sessões determinísticas que respeitam os contratos de `MS_DB`/`MS_SERVICES`. A finalidade foi validar UI, regras por papel, Colheita, Cofre, criação de mesa e o novo Orbe SoulDrakma 3D.

## Correção principal — Orbe SoulDrakma
A V2.5.0 utilizava planos CSS sobrepostos e só animava o objeto principal durante `is-harvesting`. Em estado dormente o ícone podia parecer estático e sem profundidade real.

A V2.5.1 substitui essa representação por:
- renderização 3D matemática em Canvas de um icosaedro facetado;
- projeção em perspectiva e ordenação de faces por profundidade;
- iluminação dinâmica por face;
- rotação contínua em estado dormente;
- velocidade/intensidade maior durante a Colheita;
- quatro partículas orbitais;
- dois halos 3D CSS independentes;
- flutuação espacial do artefato;
- aceleração e pulso em créditos/desbloqueios;
- pausa do renderizador quando não existe usuário autenticado;
- respeito a `prefers-reduced-motion`.

### Prova no navegador
Em cada um dos três papéis:
- o canvas 144×144 continha pixels renderizados;
- `canvas.toDataURL()` mudou entre amostras com 360 ms de intervalo em estado dormente;
- `animation-name` do artefato: `soulFloat`;
- `animation-name` do halo principal: `soulHaloA`;
- uma interação real iniciava `COLHEITA ATIVA` com relógio de 10:00.

## Jogador
Validado no navegador:
- Admin oculto;
- ferramentas de Mestre ocultas;
- Escudo do Mestre oculto;
- Orbe SoulDrakma visível;
- capacidade de fichas = 3;
- capacidade de mesas = 0;
- conteúdo base utilizável;
- Aprimorador e Envolto bloqueados para criação sem entitlement;
- Cofre oferece slot de ficha e as cinco expansões;
- slot de mesa não é oferecido;
- compra de Aprimorador testada: 90.000 SD → 40.000 SD;
- entitlement de Aprimorador passou a ativo;
- transação foi adicionada ao Ledger do harness.

## Mestre
Validado no navegador:
- Admin oculto;
- área de Mestre visível;
- Escudo do Mestre visível;
- Orbe SoulDrakma visível;
- capacidade de fichas = 5;
- capacidade de mesas = 3;
- todas as expansões utilizáveis sem compra;
- Cofre oferece somente slot adicional de ficha e slot adicional de mesa;
- expansões não são vendidas ao Mestre.

### Janela Criar Mesa
Desktop, viewport efetivo 1041 px de altura:
- topo: 100,5 px;
- fundo: 960,5 px;
- altura: 860 px;
- integralmente dentro do viewport;
- área central com `overflow-y: auto`.

Mobile 390×844:
- caixa: 7,8 → 382,2 px horizontal;
- caixa: 43,8 → 820,2 px vertical;
- integralmente dentro do viewport;
- sem overflow horizontal (`scrollWidth = innerWidth = 390`);
- área central com rolagem interna.

## ADM
Validado no navegador:
- botão Administrar visível;
- ferramentas de Mestre visíveis;
- Escudo do Mestre visível;
- Orbe SoulDrakma visível;
- capacidade de fichas e mesas ilimitada;
- todas as expansões liberadas;
- Painel ADM abre;
- Console SoulDrakma é injetado no Painel ADM;
- Cofre mostra estado ARCONTE e nenhum botão de compra.

## Colheita
Em Jogador, Mestre e ADM uma interação confiável disparada pelo navegador iniciou uma sessão de Colheita e atualizou o widget para `COLHEITA ATIVA`, com janela de 10 minutos.

A autoridade econômica continua no servidor: o harness simula as respostas das RPCs para testar interface e fluxos. O cálculo real de produção, compra, slots e entitlements permanece protegido na migração `supabase-soul-economy-v2.5-migration.sql`.

## Regressão automatizada
- 36/36 arquivos JavaScript sintaticamente válidos.
- 74/74 testes Node aprovados.
- Cobertura inclui Portal, Forja, VTT, Sala do Mestre, Escudo, Realtime, Soul Economy, limites por papel, entitlements, compras atômicas, Ledger, Colheita e 3D do Orbe.

## Limitação de certificação
Esta rodada valida a aplicação local com Chromium real e mocks determinísticos de banco que seguem os contratos da aplicação. Ela **não substitui uma homologação no Supabase de produção** com contas reais e RLS/RPC instaladas. Login real, e-mail, Storage, Realtime multi-dispositivo e políticas efetivamente implantadas no projeto Supabase devem ser validados no ambiente de staging/produção.

## Integridade estrutural e orçamento de boot
- IDs duplicados no `index.html`: 0.
- Referências locais quebradas no `index.html`: 0.
- JavaScript local no boot: 695.820 bytes em 22 arquivos.
- CSS inicial: 291.772 bytes em 12 arquivos.
- O orçamento adotado na V2.4 continua respeitado (<800 KB JS de boot; <300 KB CSS inicial).
