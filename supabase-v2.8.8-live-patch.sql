-- Mundos Sombrios V2.8.8 — Patch consolidado para instalação hospedada
-- Aplicar no MESMO projeto Supabase utilizado pelo site.
-- Reúne presença/status de mesa, sumários, exclusão segura e Categoria obrigatória.
begin;

create table if not exists public.table_presence (
  table_id text not null references public.tables(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  connected boolean not null default true,
  last_seen_at timestamptz not null default now(),
  primary key(table_id,user_id)
);
create index if not exists idx_table_presence_recent_v288
  on public.table_presence(table_id,last_seen_at desc) where connected=true;
alter table public.table_presence enable row level security;
revoke all on public.table_presence from anon, authenticated;

create or replace function public.touch_table_presence(p_table_id text,p_online boolean default true)
returns boolean language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid() is null or not public.can_access_table_session(p_table_id) then
    raise exception 'TABLE_ACCESS_REQUIRED';
  end if;
  insert into public.table_presence(table_id,user_id,connected,last_seen_at)
  values(p_table_id,auth.uid(),coalesce(p_online,true),now())
  on conflict(table_id,user_id) do update
    set connected=excluded.connected,last_seen_at=now();
  return true;
end;
$$;
revoke all on function public.touch_table_presence(text,boolean) from public;
grant execute on function public.touch_table_presence(text,boolean) to authenticated;

create or replace function public.set_table_live_status(p_table_id text,p_status text)
returns public.tables language plpgsql security definer set search_path=public
as $$
declare v public.tables; v_status text:=lower(trim(coalesce(p_status,'')));
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_status not in ('active','paused','archived') then raise exception 'INVALID_STATUS'; end if;
  if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
  update public.tables set status=v_status,updated_at=now()
  where id=p_table_id returning * into v;
  if v.id is null then raise exception 'TABLE_NOT_FOUND'; end if;
  return v;
end;
$$;
revoke all on function public.set_table_live_status(text,text) from public;
grant execute on function public.set_table_live_status(text,text) to authenticated;

create or replace function public.fetch_my_table_summaries()
returns table(
  id text, code text, name text, theme text, game_mode text, settings jsonb,
  owner_id text, status text, created_at timestamptz, updated_at timestamptz,
  active_members integer, my_member_role text, my_character_id text, is_owner boolean
)
language sql security definer set search_path=public
as $$
  with me as (
    select auth.uid() as auth_user_id,
           (select p.id from public.profiles p where p.auth_user_id=auth.uid() limit 1) as profile_id,
           public.current_profile_role() as role
  ), scoped as (
    select tb.*,
      (tb.owner_id=me.auth_user_id::text or tb.owner_id=me.profile_id) as owner_match,
      tm.member_role, tm.character_id
    from public.tables tb
    cross join me
    left join public.table_members tm
      on tm.table_id=tb.id and tm.user_id=me.auth_user_id and tm.status='active'
    where (
      tb.owner_id=me.auth_user_id::text
      or tb.owner_id=me.profile_id
      or me.role='admin'
      or tm.id is not null
    )
  )
  select s.id,s.code,s.name,s.theme,s.game_mode,coalesce(s.settings,'{}'::jsonb),
         s.owner_id,s.status,s.created_at,s.updated_at,
         coalesce((select count(*)::integer from public.table_members m where m.table_id=s.id and m.status='active'),0),
         case when s.owner_match then 'mestre' when coalesce(s.member_role,'')<>'' then s.member_role else null end,
         s.character_id,s.owner_match
  from scoped s
  order by s.updated_at desc,s.created_at desc;
$$;
revoke all on function public.fetch_my_table_summaries() from public;
grant execute on function public.fetch_my_table_summaries() to authenticated;

create or replace function public.delete_table_secure(p_table_id text)
returns boolean language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(
    select 1 from public.tables tb
    where tb.id=p_table_id and (
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

create or replace function public.save_character_secure(
  p_id text,p_name text,p_mode text,p_nature text,p_class_name text,p_payload jsonb
) returns public.characters
language plpgsql security definer set search_path=public
as $$
declare v_character public.characters; v_existing public.characters; v_key text; v_count integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if trim(coalesce(p_name,''))='' then raise exception 'CHARACTER_NAME_REQUIRED'; end if;
  if trim(coalesce(p_payload->>'category',p_payload#>>'{concept,category}',''))='' then raise exception 'CHARACTER_CATEGORY_REQUIRED'; end if;
  if trim(coalesce(p_nature,''))='' then raise exception 'CHARACTER_EXPANSION_REQUIRED'; end if;
  if trim(coalesce(p_class_name,''))='' then raise exception 'CHARACTER_CLASS_REQUIRED'; end if;
  select * into v_existing from public.characters where id=p_id and user_id=auth.uid()::text;
  v_key:=public.soul_expansion_key_for_nature(p_nature);
  if v_existing.id is null then
    select count(*) into v_count from public.characters where user_id=auth.uid()::text;
    if v_count>=public.soul_character_capacity(auth.uid()) then raise exception 'CHARACTER_SLOT_LIMIT'; end if;
    if not public.soul_has_expansion(auth.uid(),v_key) then raise exception 'EXPANSION_LOCKED:%',coalesce(v_key,'unknown'); end if;
    insert into public.characters(id,owner_id,user_id,name,mode,nature,class_name,payload)
    values(coalesce(nullif(p_id,''),'c-'||gen_random_uuid()::text),auth.uid()::text,auth.uid()::text,trim(p_name),coalesce(nullif(p_mode,''),'exodo'),p_nature,p_class_name,coalesce(p_payload,'{}'::jsonb)) returning * into v_character;
  else
    if v_key is not null and v_key is distinct from public.soul_expansion_key_for_nature(v_existing.nature) and not public.soul_has_expansion(auth.uid(),v_key) then raise exception 'EXPANSION_LOCKED:%',v_key; end if;
    insert into public.character_versions(character_id,owner_id,version_no,snapshot)
    select v_existing.id,auth.uid(),coalesce(max(version_no),0)+1,v_existing.payload from public.character_versions where character_id=v_existing.id;
    update public.characters set name=trim(p_name),mode=coalesce(nullif(p_mode,''),mode),nature=p_nature,class_name=p_class_name,payload=coalesce(p_payload,'{}'::jsonb),updated_at=now() where id=v_existing.id returning * into v_character;
  end if;
  perform public.soul_check_achievements(auth.uid());
  return v_character;
end;
$$;
revoke all on function public.save_character_secure(text,text,text,text,text,jsonb) from public;
grant execute on function public.save_character_secure(text,text,text,text,text,jsonb) to authenticated;

commit;
