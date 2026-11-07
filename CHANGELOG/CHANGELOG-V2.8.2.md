# Mundos Sombrios V2.8.2 — Mesa e Moderação ADM

## Corrigido
- Controles `SAIR DA MESA` e `SALVAR FENDA` permanecem acessíveis em larguras até 1050 px.
- Exclusão de mesa reconhece tanto `profiles.id` quanto UUID legado de autenticação como proprietário.
- `can_manage_table` e `can_access_table_session` consolidam autoridade de proprietário, Co-Mestre, membro ativo e ADM.
- `resolve_admin_request_secure` passa a fazer parte do esquema consolidado `supabase-production.sql`.
- ADM agora pode **silenciar** solicitações, preservando-as para auditoria com status `silenced`.
- ADM agora pode **excluir definitivamente** solicitações através de RPC protegida.
- O `X` da janela administrativa passa a significar silenciamento persistente, e não apenas remoção visual temporária.

## Banco existente
Aplicar `supabase-bugfix-v2.8.2-migration.sql`. A migração não apaga mesas, usuários ou fichas.
