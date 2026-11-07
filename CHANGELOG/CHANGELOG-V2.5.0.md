# Seite_Mundos-Sombrios — 2.5.0 · Soul Economy

## Progressão da conta
- Jogador: 3 slots iniciais de ficha e 0 slots de mesa.
- Mestre: 5 slots iniciais de ficha e 3 slots de mesa.
- ADM: capacidade ilimitada de fichas e mesas.
- Slots comprados são incrementais e pertencem à conta.
- Redução de papel/capacidade nunca apaga personagens ou mesas existentes; apenas impede novas criações acima da capacidade.

## Expansões
- Cards e Códices permanecem visíveis para todas as contas autenticadas.
- Jogadores precisam de entitlement para criar personagens de Aprimorador, Projeto Player, Linhagem Herdada, Envolto e Ordem dos Sete.
- Mestres e ADM possuem todas as expansões inerentemente liberadas.
- Personagens legados de uma expansão continuam editáveis se o entitlement for removido; trocar uma ficha para outra expansão bloqueada continua proibido.
- Importação JSON passa pelos mesmos limites, entitlements e persistência segura da Forja.

## Cofre SoulDrakma
- Slot adicional de ficha: 20.000 SD.
- Aprimorador: 50.000 SD.
- Projeto Player: 55.000 SD.
- Linhagem Herdada: 60.000 SD.
- Envolto: 70.000 SD.
- Ordem dos Sete: 70.000 SD.
- Slot adicional de mesa (Mestre): 70.000 SD.
- Compras usam transação/RPC atômica: débito, entitlement e Ledger são confirmados como uma única operação.

## Colheita
- Uma interação válida inicia uma janela de 10 minutos quando não existe Colheita ativa.
- Ganho: 2 SD por minuto, máximo de 20 SD por janela.
- Ao terminar, somente uma nova interação inicia outra Colheita.
- O cliente apresenta relógio/feedback; cálculo e crédito são feitos no Supabase.
- A contagem de conquistas de coleta usa `lifetime_harvested`, separada de recompensas e ajustes administrativos.

## Orbe SoulDrakma
- Widget 3D global para contas autenticadas.
- Arrastável, minimizável e com posição salva apenas como preferência local de interface.
- Exibe saldo, estado da Colheita, cronômetro e valor acumulado na janela atual.
- Créditos produzem feedback visual sem criar uma nova fonte de verdade local.

## Desbloqueios e direção de arte
- Compra dispara animação entre o Orbe SoulDrakma e o item adquirido.
- Cards recebem pulso, fragmentos e estado de desbloqueio.
- `prefers-reduced-motion` é respeitado.
- Expansões bloqueadas continuam visualmente presentes e direcionam ao Cofre em vez de desaparecer.

## Conquistas
- Conquistas de Colheita: Primeiro Eco, Acumulador de Almas, O Peso da Alma e Ceifador.
- Conquistas para cada expansão desbloqueada.
- Primeira Alma para a primeira ficha.
- Recompensas de conquista entram no Ledger.
- Ceifador concede o cosmético `moldura-fenda` como entitlement server-side.

## ADM
- Console SoulDrakma incorporado ao painel administrativo.
- Consulta de saldo, capacidades, entitlements e Ledger por conta.
- Concessão/remoção de moeda exige motivo e é auditada.
- Concessão/revogação de expansão/slot exige motivo e gera evento permanente no Ledger.
- Chaves de entitlement são validadas pelo banco.
- Expansões não podem ser artificialmente concedidas a Mestre/ADM porque esses papéis já têm acesso inerente.

## Segurança
- Wallet, Ledger, catálogo, entitlements, Colheitas e conquistas usam RLS/RPC.
- Funções auxiliares econômicas foram retiradas da superfície pública de RPC.
- Não existe transferência de SoulDrakma entre contas.
- Papel global continua controlado pelo fluxo administrativo já existente; Jogador não pode autopromover-se a Mestre para contornar a economia.
- `save_character_secure` e `create_table_secure` validam capacidade e acesso no servidor.
- Erros do `save_character_secure` agora são propagados pela camada DB/Services em vez de poderem virar falso sucesso.

## Qualidade
- 36/36 arquivos JavaScript sintaticamente válidos.
- 73/73 testes automatizados aprovados.
