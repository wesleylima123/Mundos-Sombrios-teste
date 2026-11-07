# Evolução autônoma e leitura guiada

## Comportamento

Jogador solicita sucessos, Mestre aprova. Com sucessos e requisitos narrativos aprovados e PEG suficiente, Evoluir agora apresenta grau atual/novo grau, custo e saldo restante. Confirmação aplica evolução, desconta PEG e reinicia os sucessos da trilha conforme a regra existente, sem nova autorização do Mestre. Sem saldo, o pedido de apoio em PEG continua disponível.

O caminho autônomo reutiliza a operação semântica existente. O marcador SELF_EVOLVE: identifica confirmação explícita; pedidos de apoio e clientes antigos não gastam automaticamente só porque o saldo aumentou. Pedidos antigos pendentes são reaproveitados quando o jogador confirma a evolução. Repetir a operação não aplica novamente sem novos sucessos.

Modo local verifica propriedade, vínculo, saldo, prontidão e limites de atributo. SQL verifica usuário autenticado, propriedade, associação, prontidão e custo no servidor; bloqueia trilha, personagem e conta com FOR UPDATE; reutiliza a função privada de aplicação, com desconto e histórico na mesma transação. Não foram concedidas permissões de Mestre ao jogador. Aprovação de sucessos continua restrita. Solicitações recusadas não descontam pontos.

## Instalação remota necessária

Os arquivos supabase-progression-v2.10.1-hotfix.sql, supabase-progression-v2.10.1-live-compat.sql e supabase-install-completo-v2.10.1.sql foram atualizados. Para banco já instalado com as dependências de evolução V2.10.1, aplicar o hotfix atualizado no SQL Editor. Não foi executado SQL em banco remoto nem em PostgreSQL local neste ambiente: não há conexão configurada nem cliente PostgreSQL. O modo local está implementado e testado; o modo remoto depende da aplicação e validação deste SQL. Sem essa atualização, o cliente não informa falsamente que uma evolução pendente já foi aplicada.

Referência consultada: https://supabase.com/docs/guides/database/functions . Funções existentes mantêm revogação de PUBLIC/anon e acesso autenticado com verificação de propriedade.

## Criação guiada

Área principal ampliada; prévia abaixo do formulário. Cards de origem/classe em uma coluna, retrato acima e texto abaixo. Setas do carrossel em linha própria, evitando estreitar os cards. Fontes de corpo com 1rem e entrelinha 1.65; remoção de alturas restritivas e quebras inadequadas. Colunas se empilham em telas menores. Não há promessa de ausência de problemas visuais sem inspeção real de navegador, indisponível neste ambiente.

## Validação

Build completo: 290 testes, 271 aprovados, nenhuma falha, 19 ignorados históricos. Testes novos validam solicitação/aprovação de sucessos, autonomia, saldo debitado uma vez, consumo dos sucessos, bloqueio de personagem alheio, falta de saldo e conclusão de pedido pendente após concessão. Testes de padrões antigos foram atualizados para a nova interface. SQL revisado estaticamente; execução transacional remota ainda pendente.

ZIP reconstruído em arquivo temporário, validado e extraído integralmente antes da entrega.
