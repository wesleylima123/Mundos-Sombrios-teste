# Mundos Sombrios — Multiplayer Realtime 0.66.0

## Fonte de verdade
- PostgreSQL/Supabase: contas, personagens, mesas, membros, estado persistente, histórico e sessões.
- RLS/RPC: autorização e mutações sensíveis.
- Broadcast privado: eventos de baixa latência da mesa.
- Presence: participantes conectados.

## Canal
`ms:table:<table_id>` — sempre privado em produção.

## Regra de sincronização
1. Carregar estado persistente do PostgreSQL.
2. Entrar no canal privado.
3. Receber Broadcast/Presence.
4. Persistir apenas estado durável.
5. Ao reconectar, recarregar PostgreSQL e assinar novamente.

## Segurança
Acesso ao canal é autorizado pela relação entre `auth.uid()`, `tables.owner_id` e `table_members.status='active'`.

## Configuração Supabase
Em Realtime Settings, desabilitar `Allow public access` para forçar canais privados.

## Eventos de mesa
Eventos duráveis continuam em `table_events`. Os clientes recebem Broadcast imediato para chat, dados, controles e movimentos de tokens. Alterações de membros/estado/sessões geram `table:refresh` por trigger do banco.
