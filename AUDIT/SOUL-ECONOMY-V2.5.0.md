# Auditoria de Implementação — Soul Economy V2.5.0

## Objetivo
Introduzir uma camada de progressão de conta preparada para monetização futura sem transformar o navegador em autoridade econômica e sem esconder o conteúdo editorial das expansões.

## Arquitetura
Fluxo canônico:

`UI SoulDrakma → MS_SERVICES.Soul → MS_DB → RPC Supabase → Wallet / Ledger / Entitlements / Harvest / Achievements`

A UI pode prever estados para melhorar a experiência, mas nenhuma aquisição é considerada válida até confirmação do servidor.

## Capacidades por papel
| Papel | Fichas base | Mesas base | Expansões |
|---|---:|---:|---|
| Jogador | 3 | 0 | Base + entitlements adquiridos |
| Mestre | 5 | 3 | Todas |
| ADM | Ilimitado | Ilimitado | Todas |

Slots adicionais são somados por `user_entitlements`. O banco usa o mesmo cálculo que a interface.

## Catálogo central
A tabela `soul_catalog` é a fonte de preço e produto. O frontend possui somente um catálogo fallback para apresentação durante indisponibilidade/carregamento; o preço efetivamente debitado é sempre o da tabela server-side.

Produtos da V2.5:
- `character_slot`: 20.000 SD
- `exp_aprimorador`: 50.000 SD
- `exp_player`: 55.000 SD
- `exp_linhagem`: 60.000 SD
- `exp_envolto`: 70.000 SD
- `exp_ordem`: 70.000 SD
- `master_table_slot`: 70.000 SD

## Wallet e Ledger
`soul_wallets` mantém saldo e agregados. `soul_transactions` registra cada alteração financeira e também concessões/revogações de entitlement pelo ADM.

Campos agregados importantes:
- `balance`
- `lifetime_earned`
- `lifetime_harvested`
- `lifetime_spent`

`lifetime_harvested` existe para impedir que recompensa de conquista conte como nova Colheita e gere progressão circular.

## Colheita
- Início: `soul_touch_activity` quando não há sessão ativa.
- Duração: 10 minutos.
- Crédito: 2 SD/min.
- Limite: 10 minutos creditados por sessão.
- Frontend chama tick apenas com documento visível.
- O servidor calcula minutos válidos e controla o encerramento.

## Compras atômicas
`soul_purchase`:
1. carrega e trava o produto do catálogo;
2. valida papel/propriedade;
3. debita o saldo via Ledger;
4. concede/incrementa o entitlement;
5. verifica conquistas;
6. retorna wallet e quantidade atualizadas.

Toda a RPC roda em uma única transação PostgreSQL. Uma exceção desfaz todas as etapas.

## Proteção da criação
`save_character_secure`:
- conta fichas server-side;
- valida capacidade;
- identifica expansão pela Natureza;
- exige entitlement para nova ficha de expansão de Jogador;
- preserva edição de personagem legado;
- impede troca para outra expansão bloqueada.

`create_table_secure`:
- rejeita Jogador;
- limita Mestre a 3 + bônus adquiridos;
- mantém ADM ilimitado.

Importação JSON chama a mesma persistência remota antes de promover o cache local.

## Expansões
Mapeamento:
- Aprimorador → `aprimorador`
- Projeto Player → `projeto-player`
- Linhagem Herdada → `linhagem-herdada`
- Envolto → `envolto`
- Ordem dos Sete → `ordem-dos-sete`

A consulta a Códices e cards não foi restringida. O entitlement protege criação, não conhecimento do conteúdo.

## Administração
O ADM pode:
- consultar a economia de uma conta;
- conceder/remover saldo;
- conceder/revogar entitlements;
- auditar transações recentes.

Motivo é obrigatório. Grants/revogações de entitlement geram `ENTITLEMENT_GRANT`/`ENTITLEMENT_REVOKE`, mesmo com valor financeiro zero, preservando histórico após exclusão do entitlement atual.

## Conquistas
As conquistas são definidas em catálogo e registradas em `user_achievements`. Recompensas monetárias passam por `soul_add_transaction`. Metadados podem conceder cosmético/título como entitlement. A V2.5 usa essa capacidade para `moldura-fenda` no Ceifador.

## Anti-bypass
- Não existe RPC de transferência de SoulDrakma.
- Tabelas econômicas têm RLS.
- Escritas acontecem por RPCs controladas.
- Helpers que aceitam UUID arbitrário não são executáveis diretamente por `authenticated`.
- Jogador não ganha expansão apenas alterando DOM/JavaScript.
- Jogador não ganha slot apenas alterando contador da interface.
- Erros de persistência são propagados por `MS_SERVICES`.

## Monetização futura
A arquitetura permite adicionar um provedor de pagamento posteriormente criando uma origem server-side de entitlement/crédito. Nenhuma integração com dinheiro real foi introduzida nesta versão: isso evita misturar pagamentos com a fundação econômica antes de homologação, termos, política de reembolso e requisitos legais.

## Validação
- `npm run syntax`: 36 JS válidos.
- `npm test`: 73/73.
- `npm run audit`: aprovado.
