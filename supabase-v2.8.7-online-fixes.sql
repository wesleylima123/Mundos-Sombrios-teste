-- Mundos Sombrios V2.8.7 — Correções de mesa online, exclusão e sumários
-- Execute no MESMO projeto Supabase usado pelo site, após as migrações online anteriores.

begin;

create or replace function public.set_table_live_status(p_table_id text,p_status text)
returns public.tables
language plpgsql
security definer
set search_path=public
as $$
declare
  v public.tables;
  v_status text := lower(trim(coalesce(p_status,'')));
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_status not in ('active','paused','archived') then
    raise exception 'INVALID_STATUS';
  end if;
  if not public.can_manage_table(p_table_id) then
    raise exception 'GM_REQUIRED';
  end if;
  update public.tables
  set status = v_status,
      updated_at = now()
  where id = p_table_id
  returning * into v;
  if v.id is null then raise exception 'TABLE_NOT_FOUND'; end if;
  return v;
end;
$$;
revoke all on function public.set_table_live_status(text,text) from public;
grant execute on function public.set_table_live_status(text,text) to authenticated;

create or replace function public.fetch_my_table_summaries()
returns table(
  id text,
  code text,
  name text,
  theme text,
  game_mode text,
  settings jsonb,
  owner_id text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  active_members integer,
  my_member_role text,
  my_character_id text,
  is_owner boolean
)
language sql
security definer
set search_path=public
as $$
  with me as (
    select auth.uid() as auth_user_id,
           (select p.id from public.profiles p where p.auth_user_id=auth.uid() limit 1) as profile_id,
           public.current_profile_role() as role
  ), scoped as (
    select tb.*,
      case
        when tb.owner_id = me.auth_user_id::text or tb.owner_id = me.profile_id then true
        else false
      end as owner_match,
      tm.member_role,
      tm.character_id
    from public.tables tb
    cross join me
    left join public.table_members tm
      on tm.table_id = tb.id and tm.user_id = me.auth_user_id and tm.status = 'active'
    where tb.status <> 'archived'
      and (
        tb.owner_id = me.auth_user_id::text
        or tb.owner_id = me.profile_id
        or me.role = 'admin'
        or tm.id is not null
      )
  )
  select
    s.id,
    s.code,
    s.name,
    s.theme,
    s.game_mode,
    coalesce(s.settings,'{}'::jsonb) as settings,
    s.owner_id,
    s.status,
    s.created_at,
    s.updated_at,
    coalesce((select count(*)::integer from public.table_members tm where tm.table_id=s.id and tm.status='active'),0) as active_members,
    case
      when s.owner_match then 'mestre'
      when coalesce(s.member_role,'') <> '' then s.member_role
      else null
    end as my_member_role,
    s.character_id as my_character_id,
    s.owner_match as is_owner
  from scoped s
  order by s.updated_at desc, s.created_at desc;
$$;
revoke all on function public.fetch_my_table_summaries() from public;
grant execute on function public.fetch_my_table_summaries() to authenticated;

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
    where tb.id = p_table_id
      and (
        public.current_profile_role() = 'admin'
        or tb.owner_id = auth.uid()::text
        or tb.owner_id = (select p.id from public.profiles p where p.auth_user_id = auth.uid() limit 1)
      )
  ) then
    raise exception 'OWNER_REQUIRED';
  end if;

  delete from public.tables where id = p_table_id;
  return found;
end;
$$;
revoke all on function public.delete_table_secure(text) from public;
grant execute on function public.delete_table_secure(text) to authenticated;

commit;
