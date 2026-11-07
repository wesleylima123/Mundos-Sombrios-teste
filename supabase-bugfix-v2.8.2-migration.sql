-- Mundos Sombrios V2.8.2 — correções de autoridade de mesa e moderação ADM
-- Pode ser aplicado em uma instalação existente após supabase-production.sql.
-- Não exige reset de usuários, mesas ou solicitações.
begin;

-- Um proprietário pode existir em dois formatos históricos:
--   1) tables.owner_id = profiles.id (canônico atual)
--   2) tables.owner_id = auth.users.id::text (legado)
-- A função central aceita ambos e preserva Co-Mestre/ADM.
create or replace function public.can_manage_table(p_table_id text)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select auth.uid() is not null and (
    public.current_profile_role()='admin'
    or exists(
      select 1 from public.tables tb
      where tb.id=p_table_id
        and (
          tb.owner_id=auth.uid()::text
          or tb.owner_id=(select p.id from public.profiles p where p.auth_user_id=auth.uid() limit 1)
        )
    )
    or exists(
      select 1 from public.table_members tm
      where tm.table_id=p_table_id
        and tm.user_id=auth.uid()
        and tm.status='active'
        and tm.member_role in ('mestre','co_mestre')
    )
  );
$$;
revoke all on function public.can_manage_table(text) from public;
grant execute on function public.can_manage_table(text) to authenticated;

-- Acesso à sessão ao vivo usa a mesma identidade canônica, mas também aceita membros ativos.
create or replace function public.can_access_table_session(p_table_id text)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select auth.uid() is not null and (
    public.can_manage_table(p_table_id)
    or exists(
      select 1 from public.table_members tm
      where tm.table_id=p_table_id
        and tm.user_id=auth.uid()
        and tm.status='active'
    )
  );
$$;
revoke all on function public.can_access_table_session(text) from public;
grant execute on function public.can_access_table_session(text) to authenticated;

-- Excluir a Fenda continua restrito ao proprietário real ou ADM; Co-Mestre não pode apagar.
create or replace function public.delete_table_secure(p_table_id text)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(
    select 1 from public.tables tb
    where tb.id=p_table_id
      and (
        public.current_profile_role()='admin'
        or tb.owner_id=auth.uid()::text
        or tb.owner_id=(select p.id from public.profiles p where p.auth_user_id=auth.uid() limit 1)
      )
  ) then raise exception 'OWNER_REQUIRED'; end if;
  delete from public.tables where id=p_table_id;
  return found;
end;
$$;
revoke all on function public.delete_table_secure(text) from public;
grant execute on function public.delete_table_secure(text) to authenticated;

create or replace function public.update_table_settings_secure(p_table_id text,p_settings jsonb)
returns public.tables
language plpgsql
security definer
set search_path=public
as $$
declare v public.tables;
begin
  if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
  update public.tables
  set settings=coalesce(p_settings,'{}'::jsonb),updated_at=now()
  where id=p_table_id
  returning * into v;
  if v.id is null then raise exception 'TABLE_NOT_FOUND'; end if;
  return v;
end;
$$;
revoke all on function public.update_table_settings_secure(text,jsonb) from public;
grant execute on function public.update_table_settings_secure(text,jsonb) to authenticated;

-- RLS de mesas passa a reconhecer os dois formatos de owner_id também em operações diretas.
drop policy if exists ms_tables_update on public.tables;
create policy ms_tables_update on public.tables for update to authenticated using (
  public.current_profile_role()='admin'
  or owner_id=auth.uid()::text
  or owner_id=(select p.id from public.profiles p where p.auth_user_id=auth.uid() limit 1)
);
drop policy if exists ms_tables_delete on public.tables;
create policy ms_tables_delete on public.tables for delete to authenticated using (
  public.current_profile_role()='admin'
  or owner_id=auth.uid()::text
  or owner_id=(select p.id from public.profiles p where p.auth_user_id=auth.uid() limit 1)
);

-- Resolve de solicitação administrativa consolidado no backend principal.
create or replace function public.resolve_admin_request_secure(p_request_id text,p_approved boolean)
returns public.admin_requests
language plpgsql
security definer
set search_path=public
as $$
declare v public.admin_requests; v_type text; v_role text; v_auth_user uuid;
begin
  if auth.uid() is null or public.current_profile_role()<>'admin' then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v from public.admin_requests where id=p_request_id for update;
  if v.id is null then raise exception 'REQUEST_NOT_FOUND'; end if;
  if lower(coalesce(v.status,'pending'))<>'pending' then return v; end if;
  v_type:=lower(coalesce(v.data->>'type','master_role'));
  if p_approved and v_type in ('master_role','admin_role') then
    v_role:=case when v_type='admin_role' then 'admin' else 'mestre' end;
    begin
      v_auth_user:=v.user_id::uuid;
    exception when invalid_text_representation then
      v_auth_user:=null;
    end;
    update public.profiles
    set role=v_role,banned=false,status='active',updated_at=now()
    where (v_auth_user is not null and auth_user_id=v_auth_user)
       or id=v.user_id
       or lower(username)=lower(v.username);
    if not found then raise exception 'REQUEST_USER_NOT_FOUND'; end if;
  end if;
  update public.admin_requests
  set status=case when p_approved then 'approved' else 'rejected' end,updated_at=now()
  where id=v.id returning * into v;
  return v;
end;
$$;
revoke all on function public.resolve_admin_request_secure(text,boolean) from public;
grant execute on function public.resolve_admin_request_secure(text,boolean) to authenticated;

-- Silenciar mantém o registro para auditoria, mas o retira da fila pendente.
create or replace function public.silence_admin_request_secure(p_request_id text)
returns public.admin_requests
language plpgsql
security definer
set search_path=public
as $$
declare v public.admin_requests;
begin
  if auth.uid() is null or public.current_profile_role()<>'admin' then raise exception 'ADMIN_REQUIRED'; end if;
  select * into v from public.admin_requests where id=p_request_id for update;
  if v.id is null then raise exception 'REQUEST_NOT_FOUND'; end if;
  if lower(coalesce(v.status,'pending'))='pending' then
    update public.admin_requests set status='silenced',updated_at=now() where id=v.id returning * into v;
  end if;
  return v;
end;
$$;
revoke all on function public.silence_admin_request_secure(text) from public;
grant execute on function public.silence_admin_request_secure(text) to authenticated;

-- Exclusão definitiva existe somente via RPC administrativa.
create or replace function public.delete_admin_request_secure(p_request_id text)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null or public.current_profile_role()<>'admin' then raise exception 'ADMIN_REQUIRED'; end if;
  delete from public.admin_requests where id=p_request_id;
  return found;
end;
$$;
revoke all on function public.delete_admin_request_secure(text) from public;
grant execute on function public.delete_admin_request_secure(text) to authenticated;

commit;
