-- ============================================================================
-- Mundos Sombrios — correção: chat e dados não chegam aos outros jogadores
-- Pode ser executado mais de uma vez (idempotente). Não apaga dados.
--
-- Causa:
--  1) append_table_event_v3 grava em table_events.client_event_id/schema_version,
--     mas o instalador nunca criou essas colunas nem o índice usado no ON CONFLICT.
--     Resultado: a gravação de chat/dado falha no servidor.
--  2) Nenhum gatilho transmitia o evento gravado para o canal privado
--     ms:table:<id>. O cliente só escuta o Broadcast 'table:event', então os
--     outros jogadores nunca recebiam nada até recarregar a página.
-- ============================================================================
begin;

alter table public.table_events add column if not exists client_event_id uuid;
alter table public.table_events add column if not exists schema_version integer not null default 1;

create unique index if not exists ux_table_events_client_event
  on public.table_events(table_id, client_event_id)
  where client_event_id is not null;

create index if not exists idx_table_events_table_id_id
  on public.table_events(table_id, id);

create schema if not exists private;

create or replace function private.broadcast_table_event()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  begin
    perform realtime.send(to_jsonb(new), 'table:event', 'ms:table:' || new.table_id, true);
  exception when others then
    -- Uma falha de transmissão não pode impedir a gravação do evento;
    -- os clientes recuperam pelo histórico ao reconectar.
    raise warning 'broadcast_table_event: %', sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function private.broadcast_table_event() from public, anon, authenticated;

drop trigger if exists trg_ms_table_event_broadcast_v27 on public.table_events;
create trigger trg_ms_table_event_broadcast_v27
after insert on public.table_events
for each row execute function private.broadcast_table_event();

notify pgrst, 'reload schema';
commit;
