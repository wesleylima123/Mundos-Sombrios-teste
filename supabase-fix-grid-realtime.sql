-- ============================================================================
-- Mundos Sombrios — correção: grid/cenário não atualiza para os jogadores
-- Pode ser executado mais de uma vez (idempotente). Não apaga dados.
--
-- Causa: o cliente espera o Broadcast 'table:refresh' no canal ms:table:<id>
-- quando o estado da mesa, os membros, o status da mesa ou as sessões mudam,
-- mas o instalador nunca criou os gatilhos que enviam esse aviso.
-- Edições do Construtor de Cenário (paredes, objetos, mapa) só gravam
-- table_state, então os jogadores nunca recebiam nada.
-- ============================================================================
begin;

create schema if not exists private;

create or replace function private.broadcast_table_refresh()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_row jsonb;
  v_table text;
  v_entity text;
  v_payload jsonb;
begin
  v_row := to_jsonb(case when TG_OP = 'DELETE' then old else new end);
  if TG_TABLE_NAME = 'tables' then
    v_table := v_row->>'id';
    v_entity := 'table';
  else
    v_table := v_row->>'table_id';
    v_entity := TG_TABLE_NAME;
  end if;
  if v_table is null then return null; end if;

  v_payload := jsonb_build_object('entity', v_entity, 'tableId', v_table, 'op', TG_OP, 'at', now());
  if TG_TABLE_NAME = 'tables' then
    v_payload := v_payload || jsonb_build_object('status', v_row->>'status');
  end if;

  begin
    perform realtime.send(v_payload, 'table:refresh', 'ms:table:' || v_table, true);
  exception when others then
    raise warning 'broadcast_table_refresh: %', sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function private.broadcast_table_refresh() from public, anon, authenticated;

drop trigger if exists trg_ms_table_state_refresh on public.table_state;
create trigger trg_ms_table_state_refresh
after insert or update on public.table_state
for each row execute function private.broadcast_table_refresh();

drop trigger if exists trg_ms_table_members_refresh on public.table_members;
create trigger trg_ms_table_members_refresh
after insert or update or delete on public.table_members
for each row execute function private.broadcast_table_refresh();

drop trigger if exists trg_ms_tables_status_refresh on public.tables;
create trigger trg_ms_tables_status_refresh
after update of status on public.tables
for each row execute function private.broadcast_table_refresh();

do $$ begin
  if to_regclass('public.game_sessions') is not null then
    execute 'drop trigger if exists trg_ms_game_sessions_refresh on public.game_sessions';
    execute 'create trigger trg_ms_game_sessions_refresh after insert or update or delete on public.game_sessions for each row execute function private.broadcast_table_refresh()';
  end if;
end $$;

commit;
