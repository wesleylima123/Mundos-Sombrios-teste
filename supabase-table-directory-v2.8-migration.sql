-- Mundos Sombrios V2.8.0 — Diretório de Fendas, Recrutamento e Solicitações Atômicas
-- Execute no MESMO projeto Supabase usado pelo site, DEPOIS das migrações V2.7 e V2.7.3.
-- Não expõe conteúdo interno de mesas a não membros. Diretório retorna apenas metadados sanitizados.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1) Presença agregada para o diretório (sem conceder acesso a canais privados).
-- ---------------------------------------------------------------------------
create table if not exists public.table_presence (
  table_id text not null references public.tables(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  connected boolean not null default true,
  last_seen_at timestamptz not null default now(),
  primary key(table_id,user_id)
);
create index if not exists idx_table_presence_recent_v28 on public.table_presence(table_id,last_seen_at desc) where connected=true;
alter table public.table_presence enable row level security;
revoke all on public.table_presence from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Solicitações formais de entrada.
-- ---------------------------------------------------------------------------
create table if not exists public.table_join_requests (
  id uuid primary key default gen_random_uuid(),
  table_id text not null references public.tables(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','approved','rejected','auto_rejected','cancelled')),
  rejection_reason text,
  decision_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_table_join_requests_table_status_v28 on public.table_join_requests(table_id,status,created_at desc);
create index if not exists idx_table_join_requests_user_v28 on public.table_join_requests(user_id,created_at desc);
create unique index if not exists idx_table_join_requests_pending_v28 on public.table_join_requests(table_id,user_id) where status='pending';
alter table public.table_join_requests enable row level security;
revoke all on public.table_join_requests from anon, authenticated;
grant select on public.table_join_requests to authenticated;
create policy ms_join_requests_read_v28 on public.table_join_requests for select to authenticated
using (user_id=(select auth.uid()) or public.can_manage_table(table_id) or public.current_profile_role()='admin');

-- ---------------------------------------------------------------------------
-- 3) Convites públicos/específicos de recrutamento. Separados dos códigos privados.
-- ---------------------------------------------------------------------------
create table if not exists public.table_recruitment_invites (
  id uuid primary key default gen_random_uuid(),
  table_id text not null references public.tables(id) on delete cascade,
  scope text not null check(scope in ('global','user')),
  target_user_id uuid references auth.users(id) on delete cascade,
  message text not null default '',
  active boolean not null default true,
  accepted_count integer not null default 0,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((scope='global' and target_user_id is null) or (scope='user' and target_user_id is not null))
);
create index if not exists idx_recruit_invites_table_v28 on public.table_recruitment_invites(table_id,active,created_at desc);
create index if not exists idx_recruit_invites_target_v28 on public.table_recruitment_invites(target_user_id,active,created_at desc);
alter table public.table_recruitment_invites enable row level security;
revoke all on public.table_recruitment_invites from anon, authenticated;
-- A leitura é feita por RPC sanitizado; não há SELECT direto para clientes.

-- ---------------------------------------------------------------------------
-- 4) Helper privado: valida a ficha e a lotação. Retorna NULL quando elegível.
-- ---------------------------------------------------------------------------
create or replace function private.table_join_rejection(p_table_id text,p_user_id uuid,p_character_id text)
returns text language plpgsql security definer set search_path=public,private
as $$
declare
  v_table public.tables;
  v_char public.characters;
  v_rec jsonb;
  v_mode text;
  v_allowed_exp jsonb;
  v_allowed_classes jsonb;
  v_max integer;
  v_count integer;
begin
  if p_user_id is null then return 'AUTH_REQUIRED'; end if;
  select * into v_table from public.tables where id=p_table_id;
  if v_table.id is null then return 'TABLE_NOT_FOUND'; end if;
  if v_table.status not in ('active','paused') then return 'TABLE_NOT_AVAILABLE'; end if;

  if exists(select 1 from public.table_members where table_id=p_table_id and user_id=p_user_id and status='banned') then return 'MEMBER_BANNED'; end if;
  if exists(select 1 from public.table_members where table_id=p_table_id and user_id=p_user_id and status='active') then return 'ALREADY_MEMBER'; end if;

  select * into v_char from public.characters where id=p_character_id and user_id=p_user_id::text;
  if v_char.id is null then return 'CHARACTER_NOT_OWNED'; end if;

  v_rec:=coalesce(v_table.settings->'recruitment','{}'::jsonb);
  v_mode:=lower(coalesce(v_table.game_mode,'exodo'));
  if v_mode not in ('exodo','ocultatun','hybrid') then v_mode:='exodo'; end if;
  if v_mode<>'hybrid' and lower(coalesce(v_char.mode,''))<>v_mode then return 'GAME_MODE_MISMATCH'; end if;
  if v_mode='hybrid' and lower(coalesce(v_char.mode,'')) not in ('exodo','ocultatun') then return 'GAME_MODE_MISMATCH'; end if;

  v_allowed_exp:=case when jsonb_typeof(v_rec->'allowedExpansions')='array' then v_rec->'allowedExpansions' else '[]'::jsonb end;
  if jsonb_array_length(v_allowed_exp)>0 and not (v_allowed_exp ? coalesce(v_char.nature,'')) then return 'EXPANSION_MISMATCH'; end if;

  v_allowed_classes:=case when jsonb_typeof(v_rec->'allowedClasses')='array' then v_rec->'allowedClasses' else '[]'::jsonb end;
  if jsonb_array_length(v_allowed_classes)>0 and not (v_allowed_classes ? coalesce(v_char.class_name,'')) then return 'CLASS_MISMATCH'; end if;

  begin v_max:=greatest(1,least(20,coalesce((v_rec->>'maxPlayers')::integer,6))); exception when others then v_max:=6; end;
  select count(*)::integer into v_count from public.table_members where table_id=p_table_id and status='active' and member_role='jogador';
  if v_count>=v_max then return 'TABLE_FULL'; end if;
  return null;
end;
$$;
revoke all on function private.table_join_rejection(text,uuid,text) from public,anon,authenticated;

-- ---------------------------------------------------------------------------
-- 5) Lista pública sanitizada. NÃO retorna code, settings, state, chat ou fichas.
-- ---------------------------------------------------------------------------
create or replace function public.fetch_public_table_directory()
returns table(
  id text,
  name text,
  theme text,
  game_mode text,
  owner_username text,
  description text,
  allowed_expansions jsonb,
  allowed_classes jsonb,
  max_players integer,
  player_count bigint,
  online_count bigint,
  accepting_requests boolean,
  is_member boolean,
  request_status text,
  request_reason text,
  invite_id uuid,
  invite_scope text,
  invite_message text
)
language sql security definer set search_path=public
as $$
  with me as (select (select auth.uid()) uid),
  base as (
    select tb.*,
      coalesce(tb.settings->'recruitment','{}'::jsonb) rec,
      coalesce((select p.username from public.profiles p where p.id=tb.owner_id limit 1),'Mestre') owner_name
    from public.tables tb
    where auth.uid() is not null
      and tb.status='active'
      and case lower(coalesce(tb.settings->'recruitment'->>'published','true')) when 'false' then false else true end
  )
  select b.id,b.name,b.theme,b.game_mode,b.owner_name,
    coalesce(b.settings->>'description','Sem descrição pública.') description,
    case when jsonb_typeof(b.rec->'allowedExpansions')='array' then b.rec->'allowedExpansions' else '[]'::jsonb end,
    case when jsonb_typeof(b.rec->'allowedClasses')='array' then b.rec->'allowedClasses' else '[]'::jsonb end,
    case when coalesce(b.rec->>'maxPlayers','') ~ '^[0-9]+$' then greatest(1,least(20,(b.rec->>'maxPlayers')::integer)) else 6 end,
    (select count(*) from public.table_members tm where tm.table_id=b.id and tm.status='active' and tm.member_role='jogador') player_count,
    (select count(*) from public.table_presence tp join public.table_members tm on tm.table_id=tp.table_id and tm.user_id=tp.user_id and tm.status='active' and tm.member_role='jogador' where tp.table_id=b.id and tp.connected=true and tp.last_seen_at>now()-interval '45 seconds') online_count,
    case lower(coalesce(b.rec->>'acceptingRequests','true')) when 'false' then false else true end accepting_requests,
    exists(select 1 from public.table_members tm where tm.table_id=b.id and tm.user_id=(select uid from me) and tm.status='active') is_member,
    rq.status,rq.rejection_reason,
    inv.id,inv.scope,inv.message
  from base b
  left join lateral (
    select r.status,r.rejection_reason from public.table_join_requests r
    where r.table_id=b.id and r.user_id=(select uid from me)
    order by r.created_at desc limit 1
  ) rq on true
  left join lateral (
    select i.id,i.scope,i.message from public.table_recruitment_invites i
    where i.table_id=b.id and i.active=true and (i.expires_at is null or i.expires_at>now())
      and (i.scope='global' or (i.scope='user' and i.target_user_id=(select uid from me)))
    order by case when i.scope='user' then 0 else 1 end,i.created_at desc limit 1
  ) inv on true
  order by b.updated_at desc;
$$;
revoke all on function public.fetch_public_table_directory() from public;
grant execute on function public.fetch_public_table_directory() to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Solicitar / cancelar / decidir entrada.
-- ---------------------------------------------------------------------------
create or replace function public.request_table_join(p_table_id text,p_character_id text)
returns public.table_join_requests language plpgsql security definer set search_path=public,private
as $$
declare v_reason text; v public.table_join_requests; v_rec jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select coalesce(settings->'recruitment','{}'::jsonb) into v_rec from public.tables where id=p_table_id;
  if v_rec is null then raise exception 'TABLE_NOT_FOUND'; end if;
  if lower(coalesce(v_rec->>'acceptingRequests','true'))='false' then raise exception 'REQUESTS_CLOSED'; end if;
  if exists(select 1 from public.table_join_requests where table_id=p_table_id and user_id=auth.uid() and status='pending') then raise exception 'REQUEST_ALREADY_PENDING'; end if;
  v_reason:=private.table_join_rejection(p_table_id,auth.uid(),p_character_id);
  insert into public.table_join_requests(table_id,user_id,character_id,status,rejection_reason)
  values(p_table_id,auth.uid(),p_character_id,case when v_reason is null then 'pending' else 'auto_rejected' end,v_reason)
  returning * into v;
  return v;
end;
$$;
revoke all on function public.request_table_join(text,text) from public;
grant execute on function public.request_table_join(text,text) to authenticated;

create or replace function public.cancel_table_join_request(p_request_id uuid)
returns boolean language plpgsql security definer set search_path=public
as $$
begin
  update public.table_join_requests set status='cancelled',updated_at=now(),decided_at=now()
  where id=p_request_id and user_id=auth.uid() and status='pending';
  return found;
end;
$$;
revoke all on function public.cancel_table_join_request(uuid) from public;
grant execute on function public.cancel_table_join_request(uuid) to authenticated;

create or replace function public.fetch_table_join_requests(p_table_id text)
returns table(id uuid,user_id uuid,username text,character_id text,character_name text,character_mode text,character_nature text,character_class text,status text,rejection_reason text,created_at timestamptz)
language sql security definer set search_path=public
as $$
 select r.id,r.user_id,coalesce(p.username,'Jogador'),r.character_id,c.name,c.mode,c.nature,c.class_name,r.status,r.rejection_reason,r.created_at
 from public.table_join_requests r
 left join public.profiles p on p.auth_user_id=r.user_id
 left join public.characters c on c.id=r.character_id
 where public.can_manage_table(p_table_id) and r.table_id=p_table_id
 order by case when r.status='pending' then 0 else 1 end,r.created_at desc;
$$;
revoke all on function public.fetch_table_join_requests(text) from public;
grant execute on function public.fetch_table_join_requests(text) to authenticated;

create or replace function public.resolve_table_join_request(p_request_id uuid,p_approved boolean,p_reason text default null)
returns public.table_join_requests language plpgsql security definer set search_path=public,private
as $$
declare v public.table_join_requests; v_reason text; v_locked_table text;
begin
  select * into v from public.table_join_requests where id=p_request_id for update;
  if v.id is null then raise exception 'REQUEST_NOT_FOUND'; end if;
  if not public.can_manage_table(v.table_id) then raise exception 'GM_REQUIRED'; end if;
  if v.status<>'pending' then return v; end if;
  -- Serialize approvals per table so two simultaneous approvals cannot exceed capacity.
  select id into v_locked_table from public.tables where id=v.table_id for update;
  if v_locked_table is null then raise exception 'TABLE_NOT_FOUND'; end if;
  if p_approved then
    v_reason:=private.table_join_rejection(v.table_id,v.user_id,v.character_id);
    if v_reason is not null then
      update public.table_join_requests set status='rejected',rejection_reason=v_reason,decision_by=auth.uid(),decided_at=now(),updated_at=now() where id=v.id returning * into v;
      return v;
    end if;
    insert into public.table_members(table_id,user_id,character_id,member_role,status)
    values(v.table_id,v.user_id,v.character_id,'jogador','active')
    on conflict(table_id,user_id) do update set character_id=excluded.character_id,member_role='jogador',status='active',updated_at=now();
    update public.table_join_requests set status='approved',rejection_reason=null,decision_by=auth.uid(),decided_at=now(),updated_at=now() where id=v.id returning * into v;
  else
    update public.table_join_requests set status='rejected',rejection_reason=coalesce(nullif(trim(p_reason),''),'Recusada pelo Mestre.'),decision_by=auth.uid(),decided_at=now(),updated_at=now() where id=v.id returning * into v;
  end if;
  return v;
end;
$$;
revoke all on function public.resolve_table_join_request(uuid,boolean,text) from public;
grant execute on function public.resolve_table_join_request(uuid,boolean,text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7) Convites de recrutamento globais e direcionados.
-- ---------------------------------------------------------------------------
create or replace function public.create_table_recruitment_invite(p_table_id text,p_scope text,p_target_username text default null,p_message text default '',p_expires_at timestamptz default null)
returns public.table_recruitment_invites language plpgsql security definer set search_path=public
as $$
declare v_scope text:=lower(trim(coalesce(p_scope,''))); v_target uuid; v public.table_recruitment_invites;
begin
  if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
  if not exists(select 1 from public.tables where id=p_table_id and status='active') then raise exception 'TABLE_NOT_ACTIVE'; end if;
  if v_scope not in ('global','user') then raise exception 'INVALID_INVITE_SCOPE'; end if;
  if v_scope='user' then
    select auth_user_id into v_target from public.profiles where lower(username)=lower(trim(coalesce(p_target_username,''))) and banned=false limit 1;
    if v_target is null then raise exception 'USER_NOT_FOUND'; end if;
    if exists(select 1 from public.table_members where table_id=p_table_id and user_id=v_target and status='active') then raise exception 'ALREADY_MEMBER'; end if;
  end if;
  update public.table_recruitment_invites set active=false,updated_at=now()
  where table_id=p_table_id and active=true and scope=v_scope and ((v_scope='global' and target_user_id is null) or target_user_id=v_target);
  insert into public.table_recruitment_invites(table_id,scope,target_user_id,message,created_by,expires_at)
  values(p_table_id,v_scope,v_target,left(coalesce(p_message,''),500),auth.uid(),p_expires_at) returning * into v;
  return v;
end;
$$;
revoke all on function public.create_table_recruitment_invite(text,text,text,text,timestamptz) from public;
grant execute on function public.create_table_recruitment_invite(text,text,text,text,timestamptz) to authenticated;

create or replace function public.accept_table_recruitment_invite(p_invite_id uuid,p_character_id text)
returns public.tables language plpgsql security definer set search_path=public,private
as $$
declare v_inv public.table_recruitment_invites; v_table public.tables; v_reason text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_inv from public.table_recruitment_invites where id=p_invite_id for update;
  if v_inv.id is null or not v_inv.active or (v_inv.expires_at is not null and v_inv.expires_at<=now()) then raise exception 'INVITE_NOT_AVAILABLE'; end if;
  if v_inv.scope='user' and v_inv.target_user_id<>auth.uid() then raise exception 'INVITE_NOT_FOR_USER'; end if;
  -- Serialize admissions for the same table before validating remaining capacity.
  select * into v_table from public.tables where id=v_inv.table_id for update;
  if v_table.id is null then raise exception 'TABLE_NOT_FOUND'; end if;
  v_reason:=private.table_join_rejection(v_inv.table_id,auth.uid(),p_character_id);
  if v_reason is not null then raise exception '%',v_reason; end if;
  insert into public.table_members(table_id,user_id,character_id,member_role,status)
  values(v_inv.table_id,auth.uid(),p_character_id,'jogador','active')
  on conflict(table_id,user_id) do update set character_id=excluded.character_id,member_role='jogador',status='active',updated_at=now();
  update public.table_recruitment_invites set accepted_count=accepted_count+1,active=case when scope='user' then false else active end,updated_at=now() where id=v_inv.id;
  update public.table_join_requests set status='cancelled',rejection_reason='Entrada concluída por convite.',decided_at=now(),updated_at=now() where table_id=v_inv.table_id and user_id=auth.uid() and status='pending';
  select * into v_table from public.tables where id=v_inv.table_id;
  return v_table;
end;
$$;
revoke all on function public.accept_table_recruitment_invite(uuid,text) from public;
grant execute on function public.accept_table_recruitment_invite(uuid,text) to authenticated;

create or replace function public.cancel_table_recruitment_invite(p_invite_id uuid)
returns boolean language plpgsql security definer set search_path=public
as $$
declare v_table_id text;
begin
  select table_id into v_table_id from public.table_recruitment_invites where id=p_invite_id;
  if v_table_id is null then return false; end if;
  if not public.can_manage_table(v_table_id) then raise exception 'GM_REQUIRED'; end if;
  update public.table_recruitment_invites set active=false,updated_at=now() where id=p_invite_id;
  return found;
end;
$$;
revoke all on function public.cancel_table_recruitment_invite(uuid) from public;
grant execute on function public.cancel_table_recruitment_invite(uuid) to authenticated;

create or replace function public.fetch_table_recruitment_invites(p_table_id text)
returns table(id uuid,scope text,target_username text,message text,active boolean,accepted_count integer,expires_at timestamptz,created_at timestamptz)
language sql security definer set search_path=public
as $$
 select i.id,i.scope,p.username,i.message,i.active,i.accepted_count,i.expires_at,i.created_at
 from public.table_recruitment_invites i left join public.profiles p on p.auth_user_id=i.target_user_id
 where public.can_manage_table(p_table_id) and i.table_id=p_table_id
 order by i.created_at desc;
$$;
revoke all on function public.fetch_table_recruitment_invites(text) from public;
grant execute on function public.fetch_table_recruitment_invites(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 8) Configuração de recrutamento controlada pelo gestor.
-- ---------------------------------------------------------------------------
create or replace function public.update_table_recruitment_secure(p_table_id text,p_game_mode text,p_description text,p_recruitment jsonb)
returns public.tables language plpgsql security definer set search_path=public
as $$
declare v public.tables; v_mode text:=lower(trim(coalesce(p_game_mode,''))); v_rec jsonb:=coalesce(p_recruitment,'{}'::jsonb); v_max integer;
begin
  if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
  if v_mode not in ('exodo','ocultatun','hybrid') then raise exception 'INVALID_GAME_MODE'; end if;
  begin v_max:=greatest(1,least(20,coalesce((v_rec->>'maxPlayers')::integer,6))); exception when others then v_max:=6; end;
  v_rec:=jsonb_build_object(
    'published',case lower(coalesce(v_rec->>'published','true')) when 'false' then false else true end,
    'acceptingRequests',case lower(coalesce(v_rec->>'acceptingRequests','true')) when 'false' then false else true end,
    'maxPlayers',v_max,
    'allowedExpansions',case when jsonb_typeof(v_rec->'allowedExpansions')='array' then v_rec->'allowedExpansions' else '[]'::jsonb end,
    'allowedClasses',case when jsonb_typeof(v_rec->'allowedClasses')='array' then v_rec->'allowedClasses' else '[]'::jsonb end
  );
  update public.tables set game_mode=v_mode,settings=jsonb_set(jsonb_set(jsonb_set(coalesce(settings,'{}'::jsonb),'{description}',to_jsonb(left(coalesce(p_description,''),2000)),true),'{recruitment}',v_rec,true),'{expansions}',v_rec->'allowedExpansions',true),updated_at=now()
  where id=p_table_id returning * into v;
  if v.id is null then raise exception 'TABLE_NOT_FOUND'; end if;
  return v;
end;
$$;
revoke all on function public.update_table_recruitment_secure(text,text,text,jsonb) from public;
grant execute on function public.update_table_recruitment_secure(text,text,text,jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 9) Heartbeat de presença: usuário só toca a própria presença numa mesa acessível.
-- ---------------------------------------------------------------------------
create or replace function public.touch_table_presence(p_table_id text,p_online boolean default true)
returns boolean language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid() is null or not public.can_access_table_session(p_table_id) then raise exception 'TABLE_ACCESS_REQUIRED'; end if;
  insert into public.table_presence(table_id,user_id,connected,last_seen_at) values(p_table_id,auth.uid(),coalesce(p_online,true),now())
  on conflict(table_id,user_id) do update set connected=excluded.connected,last_seen_at=now();
  return true;
end;
$$;
revoke all on function public.touch_table_presence(text,boolean) from public;
grant execute on function public.touch_table_presence(text,boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 10) Entrada por código/invite legado também respeita pré-requisitos.
-- ---------------------------------------------------------------------------
create or replace function public.join_table_secure(p_code text,p_character_id text default null)
returns public.tables language plpgsql security definer set search_path=public,private
as $$
declare v_table public.tables; v_invite public.table_invites; v_reason text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select tb.* into v_table from public.tables tb where tb.code=upper(trim(p_code)) and tb.status in ('active','paused') limit 1 for update;
  if v_table.id is null then
    select ti.* into v_invite from public.table_invites ti where ti.code=upper(trim(p_code)) and ti.active=true and (ti.expires_at is null or ti.expires_at>now()) and (ti.max_uses=0 or ti.uses<ti.max_uses) limit 1 for update;
    if v_invite.id is null then raise exception 'TABLE_NOT_FOUND'; end if;
    select * into v_table from public.tables where id=v_invite.table_id and status in ('active','paused') for update;
    if v_table.id is null then raise exception 'TABLE_NOT_AVAILABLE'; end if;
  end if;
  v_reason:=private.table_join_rejection(v_table.id,auth.uid(),p_character_id);
  if v_reason='ALREADY_MEMBER' then
    -- Existing members may relink only to a character they actually own.
    if p_character_id is null or not exists(
      select 1 from public.characters c where c.id=p_character_id and c.user_id=auth.uid()::text
    ) then raise exception 'CHARACTER_NOT_OWNED'; end if;
    update public.table_members set character_id=p_character_id,updated_at=now() where table_id=v_table.id and user_id=auth.uid() and status='active';
    return v_table;
  elsif v_reason is not null then raise exception '%',v_reason; end if;
  insert into public.table_members(table_id,user_id,character_id,member_role,status)
  values(v_table.id,auth.uid(),p_character_id,'jogador','active')
  on conflict(table_id,user_id) do update set character_id=excluded.character_id,member_role='jogador',status='active',updated_at=now();
  if v_invite.id is not null then update public.table_invites set uses=uses+1,active=case when max_uses>0 and uses+1>=max_uses then false else active end where id=v_invite.id; end if;
  return v_table;
end;
$$;
revoke all on function public.join_table_secure(text,text) from public;
grant execute on function public.join_table_secure(text,text) to authenticated;

-- ---------------------------------------------------------------------------
-- 11) Full tables permanecem privadas: membro ativo / proprietário / ADM apenas.
-- ---------------------------------------------------------------------------
drop policy if exists ms_tables_select on public.tables;
drop policy if exists ms_tables_select_v27 on public.tables;
create policy ms_tables_select_v28 on public.tables for select to authenticated using (
  owner_id=(select p.id from public.profiles p where p.auth_user_id=(select auth.uid()) limit 1)
  or public.current_profile_role()='admin'
  or exists(select 1 from public.table_members tm where tm.table_id=tables.id and tm.user_id=(select auth.uid()) and tm.status='active')
);

-- ---------------------------------------------------------------------------
-- 12) Resolver solicitação de Mestre/ADM em UMA transação e de modo idempotente.
-- ---------------------------------------------------------------------------
create or replace function public.resolve_admin_request_secure(p_request_id text,p_approved boolean)
returns public.admin_requests language plpgsql security definer set search_path=public
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
    update public.profiles set role=v_role,banned=false,status='active',updated_at=now()
    where (v_auth_user is not null and auth_user_id=v_auth_user)
       or id=v.user_id
       or lower(username)=lower(v.username);
    if not found then raise exception 'REQUEST_USER_NOT_FOUND'; end if;
  end if;
  update public.admin_requests set status=case when p_approved then 'approved' else 'rejected' end,updated_at=now()
  where id=v.id returning * into v;
  return v;
end;
$$;
revoke all on function public.resolve_admin_request_secure(text,boolean) from public;
grant execute on function public.resolve_admin_request_secure(text,boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 13) Roster público da própria mesa: todos os membros ativos veem identidade básica
--     dos participantes, mas fichas completas continuam restritas pelo RPC específico.
-- ---------------------------------------------------------------------------
create or replace function public.fetch_table_roster(p_table_id text)
returns table(user_id uuid, username text, character_id text, character_name text, member_role text, status text)
language sql security definer set search_path=public
as $$
  select tm.user_id,coalesce(p.username,'jogador'),tm.character_id,coalesce(c.name,'Sem personagem'),tm.member_role,tm.status
  from public.table_members tm
  left join public.profiles p on p.auth_user_id=tm.user_id
  left join public.characters c on c.id=tm.character_id
  where tm.table_id=p_table_id
    and tm.status='active'
    and public.can_access_table_session(p_table_id)
  order by case tm.member_role when 'mestre' then 0 when 'co_mestre' then 1 when 'observador' then 2 else 3 end,coalesce(p.username,'jogador');
$$;
revoke all on function public.fetch_table_roster(text) from public;
grant execute on function public.fetch_table_roster(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 14) Lobby privado para invalidar o diretório. Somente leitura do cliente.
--     Não criamos objetos no schema realtime; apenas política permitida pela plataforma.
-- ---------------------------------------------------------------------------
drop policy if exists ms_realtime_lobby_select_v28 on realtime.messages;
create policy ms_realtime_lobby_select_v28 on realtime.messages for select to authenticated using (
  (select realtime.topic())='ms:lobby'
);

create or replace function private.broadcast_lobby_refresh()
returns trigger language plpgsql security definer set search_path=public,private
as $$
declare v_table text;
begin
  if TG_TABLE_NAME='tables' then
    if TG_OP='DELETE' then v_table:=old.id; else v_table:=new.id; end if;
  else
    if TG_OP='DELETE' then v_table:=old.table_id; else v_table:=new.table_id; end if;
  end if;
  perform realtime.send(jsonb_build_object('tableId',v_table,'entity',TG_TABLE_NAME,'at',now()),'lobby:refresh','ms:lobby',true);
  return null; -- AFTER trigger: retorno não altera a linha e evita incompatibilidade entre rowtypes.
end;
$$;
revoke all on function private.broadcast_lobby_refresh() from public,anon,authenticated;

drop trigger if exists trg_lobby_join_requests_v28 on public.table_join_requests;
create trigger trg_lobby_join_requests_v28 after insert or update or delete on public.table_join_requests for each row execute function private.broadcast_lobby_refresh();
drop trigger if exists trg_lobby_recruit_invites_v28 on public.table_recruitment_invites;
create trigger trg_lobby_recruit_invites_v28 after insert or update or delete on public.table_recruitment_invites for each row execute function private.broadcast_lobby_refresh();
drop trigger if exists trg_lobby_members_v28 on public.table_members;
create trigger trg_lobby_members_v28 after insert or update or delete on public.table_members for each row execute function private.broadcast_lobby_refresh();
drop trigger if exists trg_lobby_tables_v28 on public.tables;
create trigger trg_lobby_tables_v28 after update of settings,game_mode,status,name,theme on public.tables for each row execute function private.broadcast_lobby_refresh();

-- Data API: exposição mínima e explícita.
grant select on public.table_join_requests to authenticated;
revoke all on public.table_presence,public.table_recruitment_invites from anon,authenticated;

commit;
