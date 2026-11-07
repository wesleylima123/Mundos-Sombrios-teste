# Changelog — Mundos Sombrios V2.7.3

## Correções de Mestre e ADM

- Corrigido o retorno **Escudo do Mestre → Mesa ao Vivo** em produção e no Sandbox. O contexto da mesa é preservado em `sessionStorage` e, ao retornar, a autoridade é recalculada a partir do usuário/mesa em vez de confiar no contexto salvo.
- Corrigido **Memórias do Mundo**: o painel inicia recolhido, abre e recolhe pelo ícone, pode ser movido pelo cabeçalho, respeita o viewport e remove corretamente listeners ao ser desmontado.
- Corrigido `mountShield()` para não apagar a autoridade GM imediatamente após a montagem.
- Separado o direito de **consultar o Escudo** do direito de **dirigir a mesa**. Mestre/ADM podem consultar o Escudo; proprietário, Co-Mestre autorizado e ADM mantêm as ações de direção apropriadas.
- Mudanças de papel durante a sessão recalculam os controles disponíveis sem exigir nova entrada na Mesa.

## Correções multiplayer encontradas na varredura

- Expulsão/banimento e arquivamento passam a encerrar a sessão afetada sem permitir cancelar a saída forçada.
- Arquivar a mesa transmite o novo estado para participantes conectados.
- Pausa da sessão passa a ser aplicada também no servidor: jogadores não podem contornar a interface e publicar eventos enquanto a mesa estiver pausada.
- Corrigida a propriedade de totens. Tokens de jogador não usam mais `owner='me'`, que fazia outros navegadores interpretarem o token remoto como próprio.
- Adicionados eventos persistentes `token_add`, `token_move` e `token_remove`, com propriedade autenticada e reconstrução segura pelo histórico.
- Eventos de token agora recebem carimbo server-side de propriedade/autoridade e validação contra o personagem vinculado em `table_members`.
- Corrigido estado de pausa/status que podia ficar obsoleto ao alternar Mesa ↔ Escudo.

## Banco

Nova migração complementar:

`supabase-table-session-v2.7.3-migration.sql`

Ela deve ser executada **depois** de `supabase-table-session-v2.7-migration.sql` no mesmo projeto Supabase utilizado pelo frontend. Esta entrega não aplicou alterações no banco remoto.

## Validação

- `npm run syntax`: 41 arquivos JavaScript válidos.
- `npm test`: 116 testes aprovados, 0 falhas.
- `npm run build`: aprovado.
- Incluídos testes funcionais em VM para retorno Escudo → Mesa, alternância das Memórias e operações críticas de Mestre/ADM no Sandbox.

## Limitação de validação visual automatizada

O Chromium disponível no ambiente de execução bloqueou navegação para `localhost` por política administrativa. Por isso, a validação foi feita por regressão automatizada, testes funcionais do runtime Sandbox, validação sintática e build. O roteiro manual multiaba continua documentado no Sandbox.
