-- MUNDOS SOMBRIOS V2.9.0 — INSTALAÇÃO COMPLETA E GENÉRICA PARA SUPABASE
--
-- Árvore canônica de banco da consolidação V2.9.0.
-- Não contém project-ref, URL, chave ou credencial. Execute manualmente no projeto que o proprietário escolher.
-- O histórico V2.8.x é aplicado em ordem e a seção final V2.9.0 reassegura as definições canônicas.

-- ============================================================================
-- BASE DE PRODUÇÃO :: supabase-production.sql
-- ============================================================================
-- Mundos Sombrios — Schema completo de produção 0.65.0
-- Execute este arquivo inteiro em uma instalação nova.

-- Supabase schema for Mundos Sombrios
-- 1) profiles
create table if not exists public.profiles (
  id text primary key,
  username text not null,
  email text,
  role text not null default 'jogador',
  banned boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

alter table public.profiles add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists banned boolean not null default false;
alter table public.profiles add column if not exists status text not null default 'active';

-- 2) tables
create table if not exists public.tables (
  id text primary key,
  code text not null unique,
  name text not null,
  theme text not null default 'default',
  game_mode text not null default 'exodo',
  owner_id text not null,
  participants jsonb not null default '[]'::jsonb,
  banned jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  settings jsonb not null default '{}'::jsonb
);

-- 3) characters
create table if not exists public.characters (
  id text primary key,
  owner_id text not null,
  user_id text not null,
  name text not null,
  mode text not null default 'exodo',
  nature text,
  class_name text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) admin_requests
create table if not exists public.admin_requests (
  id text primary key,
  user_id text not null,
  username text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

alter table public.admin_requests add column if not exists data jsonb not null default '{}'::jsonb;

-- 5) site_content (portal content and content blocks moved from JS to Supabase)
create table if not exists public.site_content (
  key text primary key,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6) posts (editorial content and announcements)
create table if not exists public.posts (
  id text primary key,
  slug text not null unique,
  type text not null default 'post',
  title text not null,
  subtitle text,
  summary text,
  body text,
  category text,
  world text,
  status text not null default 'draft',
  published boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7) site_settings (generic key/value settings)
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- helpful indexes
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_tables_owner on public.tables(owner_id);
create index if not exists idx_tables_code on public.tables(code);
create index if not exists idx_characters_owner on public.characters(owner_id);
create index if not exists idx_admin_requests_user on public.admin_requests(user_id);
create index if not exists idx_posts_status on public.posts(status, published);
create index if not exists idx_site_content_updated_at on public.site_content(updated_at desc);

-- ATENÇÃO: esta definição histórica não deve ser usada sozinha em produção.
-- Execute `supabase-online-migration.sql` imediatamente após este arquivo.
-- A migração habilita RLS, cria as policies e muda autenticação para Supabase Auth.
-- Não desabilite RLS para publicar este projeto.

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists trg_tables_updated_at on public.tables;
create trigger trg_tables_updated_at
before update on public.tables
for each row execute function public.touch_updated_at();

drop trigger if exists trg_characters_updated_at on public.characters;
create trigger trg_characters_updated_at
before update on public.characters
for each row execute function public.touch_updated_at();

drop trigger if exists trg_admin_requests_updated_at on public.admin_requests;
create trigger trg_admin_requests_updated_at
before update on public.admin_requests
for each row execute function public.touch_updated_at();

drop trigger if exists trg_site_content_updated_at on public.site_content;
create trigger trg_site_content_updated_at
before update on public.site_content
for each row execute function public.touch_updated_at();

drop trigger if exists trg_posts_updated_at on public.posts;
create trigger trg_posts_updated_at
before update on public.posts
for each row execute function public.touch_updated_at();

drop trigger if exists trg_site_settings_updated_at on public.site_settings;
create trigger trg_site_settings_updated_at
before update on public.site_settings
for each row execute function public.touch_updated_at();


-- Mundos Sombrios — Fundação Online Segura
-- Executar DEPOIS de supabase-schema.sql no projeto Supabase.
-- Esta migração não cria service_role no navegador e não expõe senhas.

create extension if not exists pgcrypto;

-- 1) Vincular perfis ao Supabase Auth.
alter table public.profiles add column if not exists auth_user_id uuid unique;
alter table public.profiles drop column if exists password_hash;
create unique index if not exists idx_profiles_username_lower on public.profiles(lower(username));

-- Backfill seguro para instalações nas quais o id já é um UUID do Auth.
update public.profiles
set auth_user_id = id::uuid
where auth_user_id is null
  and id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

-- 2) Relacionamento normalizado de membros da mesa.
create table if not exists public.table_members (
  id uuid primary key default gen_random_uuid(),
  table_id text not null references public.tables(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  character_id text,
  member_role text not null default 'jogador' check (member_role in ('mestre','jogador')),
  status text not null default 'active' check (status in ('active','banned','left')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(table_id, user_id)
);

create index if not exists idx_table_members_table on public.table_members(table_id);
create index if not exists idx_table_members_user on public.table_members(user_id);

-- 3) Estado persistente da mesa.
create table if not exists public.table_state (
  table_id text primary key references public.tables(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 4) Eventos em tempo real: chat, dados, movimento e outros eventos da mesa.
create table if not exists public.table_events (
  id bigint generated always as identity primary key,
  table_id text not null references public.tables(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  actor_id uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_table_events_table_created on public.table_events(table_id, created_at desc);

-- 5) Dados persistentes das ferramentas privadas do Mestre.
create table if not exists public.gm_notes (
  id text primary key,
  table_id text not null references public.tables(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.gm_npcs (
  id text primary key,
  table_id text not null references public.tables(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.gm_files (
  id uuid primary key default gen_random_uuid(),
  table_id text not null references public.tables(id) on delete cascade,
  path text not null unique,
  name text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_gm_notes_table on public.gm_notes(table_id);
create index if not exists idx_gm_npcs_table on public.gm_npcs(table_id);
create index if not exists idx_gm_files_table on public.gm_files(table_id);

-- 6) Trigger para novos usuários do Auth.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_username text;
  v_request_master boolean;
begin
  v_username := coalesce(nullif(new.raw_user_meta_data->>'username',''), split_part(new.email, '@', 1));
  v_request_master := lower(coalesce(new.raw_user_meta_data->>'request_master','false')) = 'true';

  insert into public.profiles(id, auth_user_id, username, email, role, banned, status, data)
  values (new.id::text, new.id, v_username, new.email, 'jogador', false, 'active', jsonb_build_object('auth_source','supabase'))
  on conflict (auth_user_id) do update
    set email = excluded.email, username = coalesce(nullif(public.profiles.username,''), excluded.username);

  if v_request_master then
    insert into public.admin_requests(id, user_id, username, status, data)
    values ('req-' || new.id::text, new.id::text, v_username, 'pending', jsonb_build_object('source','auth_signup'))
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- 7) Resolve de login por usuário sem expor uma listagem de perfis.
create or replace function public.resolve_login_email(p_identifier text)
returns text
language sql
security definer
set search_path = public
as $$
  select email
  from public.profiles
  where lower(username) = lower(trim(p_identifier))
     or lower(email) = lower(trim(p_identifier))
  limit 1;
$$;
revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;

create or replace function public.admin_exists()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles where role='admin' and banned=false);
$$;
revoke all on function public.admin_exists() from public;
grant execute on function public.admin_exists() to anon, authenticated;

-- 8) Auxiliar para consultar o perfil autenticado.
create or replace function public.current_profile_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where auth_user_id = auth.uid() limit 1;
$$;

-- 9) Bootstrap do primeiro ADM. Só funciona quando ainda não existe administrador.
create or replace function public.bootstrap_first_admin(p_username text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists(select 1 from public.profiles where role = 'admin' and status <> 'banned') then
    raise exception 'ADMIN_ALREADY_EXISTS';
  end if;

  update public.profiles
  set username = coalesce(nullif(trim(p_username),''), username), role='admin', banned=false, status='active', updated_at=now()
  where auth_user_id = auth.uid()
  returning * into v_profile;

  if v_profile.id is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  return v_profile;
end;
$$;

-- 10) RPCs administrativas: somente um ADM autenticado pode usá-las.
-- Edição segura de ficha pelo Mestre: o cliente nunca recebe permissão direta para alterar personagens de terceiros.
create or replace function public.gm_update_character(
  p_table_id text,
  p_character_id text,
  p_name text,
  p_mode text,
  p_nature text,
  p_class_name text,
  p_payload jsonb
)
returns public.characters
language plpgsql
security definer
set search_path = public
as $$
declare v_character public.characters;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.tables tb where tb.id=p_table_id and (tb.owner_id=auth.uid()::text or public.current_profile_role()='admin')) then
    raise exception 'GM_REQUIRED';
  end if;
  if not exists(select 1 from public.table_members tm where tm.table_id=p_table_id and tm.character_id=p_character_id and tm.status='active') then
    raise exception 'CHARACTER_NOT_IN_TABLE';
  end if;
  update public.characters
  set name=trim(coalesce(p_name,name)), mode=coalesce(nullif(p_mode,''),mode), nature=p_nature, class_name=p_class_name,
      payload=coalesce(p_payload,'{}'::jsonb), updated_at=now()
  where id=p_character_id
  returning * into v_character;
  if v_character.id is null then raise exception 'CHARACTER_NOT_FOUND'; end if;
  return v_character;
end;
$$;
revoke all on function public.gm_update_character(text,text,text,text,text,text,jsonb) from public;
grant execute on function public.gm_update_character(text,text,text,text,text,text,jsonb) to authenticated;

create or replace function public.admin_set_user_role(p_user_id text, p_role text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare v_profile public.profiles;
begin
  if not exists(select 1 from public.profiles where auth_user_id=auth.uid() and role='admin' and banned=false) then raise exception 'ADMIN_REQUIRED'; end if;
  if lower(p_role) not in ('jogador','mestre','admin') then raise exception 'INVALID_ROLE'; end if;
  if lower(p_role)='admin' and exists(select 1 from public.profiles where role='admin' and id<>p_user_id and banned=false) then raise exception 'ONLY_ONE_ADMIN'; end if;
  update public.profiles set role=lower(p_role), updated_at=now() where id=p_user_id returning * into v_profile;
  return v_profile;
end;
$$;

create or replace function public.admin_set_user_banned(p_user_id text, p_banned boolean)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare v_profile public.profiles;
begin
  if not exists(select 1 from public.profiles where auth_user_id=auth.uid() and role='admin' and banned=false) then raise exception 'ADMIN_REQUIRED'; end if;
  if p_user_id = (select id from public.profiles where auth_user_id=auth.uid()) and p_banned then raise exception 'CANNOT_BAN_SELF'; end if;
  update public.profiles set banned=p_banned, status=case when p_banned then 'banned' else 'active' end, updated_at=now() where id=p_user_id returning * into v_profile;
  return v_profile;
end;
$$;

create or replace function public.create_table_secure(p_id text, p_code text, p_name text, p_theme text, p_game_mode text, p_settings jsonb default '{}'::jsonb)
returns public.tables
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table public.tables;
  v_user text;
  v_id text;
  v_created boolean := false;
begin
  v_user := (select id from public.profiles where auth_user_id=auth.uid() and banned=false and role in ('mestre','admin'));
  if v_user is null then raise exception 'GM_REQUIRED'; end if;

  -- V2.8.6: p_id funciona como chave idempotente. Repetir o mesmo salvamento
  -- (duplo clique, retry de rede ou resposta lenta) devolve a mesma mesa.
  v_id := coalesce(nullif(trim(p_id),''), gen_random_uuid()::text);
  insert into public.tables(id,code,name,theme,game_mode,owner_id,participants,banned,settings)
  values(v_id, upper(trim(p_code)), trim(p_name), coalesce(p_theme,'default'), coalesce(p_game_mode,'exodo'), v_user, '[]'::jsonb, '[]'::jsonb, coalesce(p_settings,'{}'::jsonb))
  on conflict (id) do nothing
  returning * into v_table;

  if v_table.id is null then
    select * into v_table from public.tables where id=v_id;
    if v_table.id is null or v_table.owner_id <> v_user then
      raise exception 'TABLE_ID_CONFLICT';
    end if;
  else
    v_created := true;
  end if;

  insert into public.table_members(table_id,user_id,member_role)
  values(v_table.id, auth.uid(), 'mestre')
  on conflict do nothing;

  -- Só inicializa o snapshot legado na primeira criação; um retry nunca apaga
  -- participantes que já tenham entrado na campanha.
  if v_created then
    update public.tables
       set participants=jsonb_build_array(jsonb_build_object(
         'userId',auth.uid()::text,
         'charId',null,
         'charName',(select username from public.profiles where auth_user_id=auth.uid()),
         'ownerId',v_user,
         'isOwner',true,
         'linkedAt',extract(epoch from now())*1000
       ))
     where id=v_table.id
     returning * into v_table;
  end if;

  insert into public.table_state(table_id,state)
  values(v_table.id,'{}'::jsonb)
  on conflict do nothing;
  return v_table;
end;
$$;

create or replace function public.leave_table_secure(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_table_id text;
begin
  select id into v_table_id from public.tables where code=upper(trim(p_code));
  if v_table_id is null then return false; end if;
  update public.table_members set status='left',updated_at=now() where table_id=v_table_id and user_id=auth.uid();
  update public.tables set participants=(select coalesce(jsonb_agg(item),'[]'::jsonb) from jsonb_array_elements(participants) item where coalesce(item->>'userId','')<>auth.uid()::text) where id=v_table_id;
  return true;
end;
$$;

revoke all on function public.bootstrap_first_admin(text) from public;
grant execute on function public.bootstrap_first_admin(text) to authenticated;
revoke all on function public.admin_set_user_role(text,text) from public;
grant execute on function public.admin_set_user_role(text,text) to authenticated;
revoke all on function public.admin_set_user_banned(text,boolean) from public;
grant execute on function public.admin_set_user_banned(text,boolean) to authenticated;
revoke all on function public.create_table_secure(text,text,text,text,text,jsonb) from public;
grant execute on function public.create_table_secure(text,text,text,text,text,jsonb) to authenticated;
revoke all on function public.join_table_secure(text,text) from public;
grant execute on function public.join_table_secure(text,text) to authenticated;
revoke all on function public.leave_table_secure(text) from public;
grant execute on function public.leave_table_secure(text) to authenticated;

-- Role autenticada sem depender de uma leitura RLS recursiva.
create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where auth_user_id=auth.uid() limit 1;
$$;
revoke all on function public.current_profile_role() from public;
grant execute on function public.current_profile_role() to authenticated;

-- 11) RLS: negar por padrão e liberar apenas o necessário.

alter table public.profiles enable row level security;
alter table public.tables enable row level security;
alter table public.characters enable row level security;
alter table public.admin_requests enable row level security;
alter table public.site_content enable row level security;
alter table public.posts enable row level security;
alter table public.site_settings enable row level security;
alter table public.table_members enable row level security;
alter table public.table_state enable row level security;
alter table public.table_events enable row level security;
alter table public.gm_notes enable row level security;
alter table public.gm_npcs enable row level security;
alter table public.gm_files enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles','tables','characters','admin_requests','site_content','posts','site_settings','table_members','table_state','table_events','gm_notes','gm_npcs','gm_files'] loop
    execute format('drop policy if exists ms_%s_select on public.%I', t, t);
    execute format('drop policy if exists ms_%s_insert on public.%I', t, t);
    execute format('drop policy if exists ms_%s_update on public.%I', t, t);
    execute format('drop policy if exists ms_%s_delete on public.%I', t, t);
  end loop;
end $$;

create policy ms_profiles_select on public.profiles for select using (
  auth_user_id=auth.uid() or exists(select 1 from public.profiles me where me.auth_user_id=auth.uid() and me.role='admin' and me.banned=false)
);
create policy ms_profiles_insert on public.profiles for insert with check (auth_user_id=auth.uid() and role='jogador');
create policy ms_profiles_update on public.profiles for update using (auth_user_id=auth.uid()) with check (auth_user_id=auth.uid() and role=public.current_profile_role());

create policy ms_characters_select on public.characters for select using (
  user_id=auth.uid()::text or exists(select 1 from public.table_members tm join public.tables tb on tb.id=tm.table_id where tm.user_id=auth.uid() and tm.status='active' and (characters.id=tm.character_id or tb.owner_id=auth.uid()::text))
);
create policy ms_characters_insert on public.characters for insert with check (user_id=auth.uid()::text);
create policy ms_characters_update on public.characters for update using (user_id=auth.uid()::text) with check (user_id=auth.uid()::text);
create policy ms_characters_delete on public.characters for delete using (user_id=auth.uid()::text);

create policy ms_tables_select on public.tables for select using (
  owner_id=auth.uid()::text or exists(select 1 from public.table_members tm where tm.table_id=tables.id and tm.user_id=auth.uid() and tm.status='active') or public.current_profile_role()='admin'
);
create policy ms_tables_update on public.tables for update using (owner_id=auth.uid()::text or public.current_profile_role()='admin');
create policy ms_tables_delete on public.tables for delete using (owner_id=auth.uid()::text or public.current_profile_role()='admin');

create policy ms_table_members_select on public.table_members for select using (
  user_id=auth.uid() or exists(select 1 from public.tables tb where tb.id=table_members.table_id and tb.owner_id=auth.uid()::text) or public.current_profile_role()='admin'
);

create policy ms_table_state_select on public.table_state for select using (
  exists(select 1 from public.table_members tm where tm.table_id=table_state.table_id and tm.user_id=auth.uid() and tm.status='active') or exists(select 1 from public.tables tb where tb.id=table_state.table_id and tb.owner_id=auth.uid()::text)
);
create policy ms_table_state_update on public.table_state for insert with check (exists(select 1 from public.tables tb where tb.id=table_state.table_id and tb.owner_id=auth.uid()::text));
create policy ms_table_state_upsert on public.table_state for update using (exists(select 1 from public.tables tb where tb.id=table_state.table_id and tb.owner_id=auth.uid()::text));

create policy ms_table_events_select on public.table_events for select using (
  exists(select 1 from public.table_members tm where tm.table_id=table_events.table_id and tm.user_id=auth.uid() and tm.status='active') or exists(select 1 from public.tables tb where tb.id=table_events.table_id and tb.owner_id=auth.uid()::text)
);
create policy ms_table_events_insert on public.table_events for insert with check (
  actor_id=auth.uid() and (exists(select 1 from public.table_members tm where tm.table_id=table_events.table_id and tm.user_id=auth.uid() and tm.status='active') or exists(select 1 from public.tables tb where tb.id=table_events.table_id and tb.owner_id=auth.uid()::text))
);

create policy ms_admin_requests_select on public.admin_requests for select using (user_id=auth.uid()::text or public.current_profile_role()='admin');
create policy ms_admin_requests_insert on public.admin_requests for insert with check (user_id=auth.uid()::text);
create policy ms_admin_requests_update on public.admin_requests for update using (public.current_profile_role()='admin');

create policy ms_site_content_select on public.site_content for select using (true);
create policy ms_site_content_write on public.site_content for all using (public.current_profile_role()='admin') with check (public.current_profile_role()='admin');
create policy ms_posts_select on public.posts for select using (published=true or public.current_profile_role()='admin');
create policy ms_posts_write on public.posts for all using (public.current_profile_role()='admin') with check (public.current_profile_role()='admin');
create policy ms_site_settings_select on public.site_settings for select using (true);
create policy ms_site_settings_write on public.site_settings for all using (public.current_profile_role()='admin') with check (public.current_profile_role()='admin');

create policy ms_gm_notes_all on public.gm_notes for all using (exists(select 1 from public.tables tb where tb.id=gm_notes.table_id and tb.owner_id=auth.uid()::text)) with check (exists(select 1 from public.tables tb where tb.id=gm_notes.table_id and tb.owner_id=auth.uid()::text));
create policy ms_gm_npcs_all on public.gm_npcs for all using (exists(select 1 from public.tables tb where tb.id=gm_npcs.table_id and tb.owner_id=auth.uid()::text)) with check (exists(select 1 from public.tables tb where tb.id=gm_npcs.table_id and tb.owner_id=auth.uid()::text));
create policy ms_gm_files_select on public.gm_files for select using (exists(select 1 from public.tables tb where tb.id=gm_files.table_id and tb.owner_id=auth.uid()::text));
create policy ms_gm_files_insert on public.gm_files for insert with check (exists(select 1 from public.tables tb where tb.id=gm_files.table_id and tb.owner_id=auth.uid()::text));
create policy ms_gm_files_delete on public.gm_files for delete using (exists(select 1 from public.tables tb where tb.id=gm_files.table_id and tb.owner_id=auth.uid()::text));

-- 12) Storage privado para arquivos do Mestre.
insert into storage.buckets(id, name, public) values ('gm-assets','gm-assets',false) on conflict (id) do update set public=false;

drop policy if exists ms_gm_assets_select on storage.objects;
drop policy if exists ms_gm_assets_insert on storage.objects;
drop policy if exists ms_gm_assets_delete on storage.objects;
create policy ms_gm_assets_select on storage.objects for select using (bucket_id='gm-assets' and (name like auth.uid()::text || '/%' or exists(select 1 from public.tables tb where tb.owner_id=auth.uid()::text and name like auth.uid()::text || '/' || tb.id || '/%')));
create policy ms_gm_assets_insert on storage.objects for insert with check (bucket_id='gm-assets' and name like auth.uid()::text || '/%' and exists(select 1 from public.tables tb where tb.owner_id=auth.uid()::text and name like auth.uid()::text || '/' || tb.id || '/%'));
create policy ms_gm_assets_delete on storage.objects for delete using (bucket_id='gm-assets' and name like auth.uid()::text || '/%');

-- 13) Realtime: habilitar eventos necessários.
do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='table_events') then alter publication supabase_realtime add table public.table_events; end if; end $$;
do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='table_state') then alter publication supabase_realtime add table public.table_state; end if; end $$;
do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='tables') then alter publication supabase_realtime add table public.tables; end if; end $$;

-- 13.1) Autorização de Broadcast + Presence para canais privados `ms:table:<id>`.
-- No painel Supabase > Realtime > Settings, mantenha "Allow public access" DESABILITADO.
create or replace function public.can_access_ms_realtime_topic(p_topic text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_topic not like 'ms:table:%' then false
    else exists(
      select 1 from public.tables tb
      where tb.id = substring(p_topic from length('ms:table:') + 1)
        and (
          tb.owner_id = auth.uid()::text
          or exists(
            select 1 from public.table_members tm
            where tm.table_id = tb.id
              and tm.user_id = auth.uid()
              and tm.status = 'active'
          )
        )
    )
  end;
$$;
revoke all on function public.can_access_ms_realtime_topic(text) from public;
grant execute on function public.can_access_ms_realtime_topic(text) to authenticated;

drop policy if exists ms_realtime_table_select on realtime.messages;
drop policy if exists ms_realtime_table_insert on realtime.messages;
create policy ms_realtime_table_select
on realtime.messages for select to authenticated
using (
  realtime.messages.extension in ('broadcast','presence')
  and realtime.topic() like 'ms:table:%'
  and public.can_access_ms_realtime_topic((select realtime.topic()))
);
create policy ms_realtime_table_insert
on realtime.messages for insert to authenticated
with check (
  realtime.messages.extension in ('broadcast','presence')
  and realtime.topic() like 'ms:table:%'
  and public.can_access_ms_realtime_topic((select realtime.topic()))
);


-- 14) Updated-at triggers nas tabelas novas.
drop trigger if exists trg_table_members_updated_at on public.table_members;
create trigger trg_table_members_updated_at before update on public.table_members for each row execute function public.touch_updated_at();
drop trigger if exists trg_table_state_updated_at on public.table_state;
create trigger trg_table_state_updated_at before update on public.table_state for each row execute function public.touch_updated_at();
drop trigger if exists trg_gm_notes_updated_at on public.gm_notes;
create trigger trg_gm_notes_updated_at before update on public.gm_notes for each row execute function public.touch_updated_at();
drop trigger if exists trg_gm_npcs_updated_at on public.gm_npcs;
create trigger trg_gm_npcs_updated_at before update on public.gm_npcs for each row execute function public.touch_updated_at();

create or replace function public.admin_update_username(p_user_id text, p_username text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare v_profile public.profiles;
begin
  if not exists(select 1 from public.profiles where auth_user_id=auth.uid() and role='admin' and banned=false) then raise exception 'ADMIN_REQUIRED'; end if;
  if trim(coalesce(p_username,'')) = '' then raise exception 'USERNAME_REQUIRED'; end if;
  if exists(select 1 from public.profiles where lower(username)=lower(trim(p_username)) and id<>p_user_id) then raise exception 'USERNAME_IN_USE'; end if;
  update public.profiles set username=trim(p_username), updated_at=now() where id=p_user_id returning * into v_profile;
  return v_profile;
end;
$$;
revoke all on function public.admin_update_username(text,text) from public;
grant execute on function public.admin_update_username(text,text) to authenticated;

-- 15) Storage do portal: leitura pública e escrita somente por ADM.
insert into storage.buckets(id, name, public) values ('portal-media','portal-media',true)
on conflict (id) do update set public=true;
drop policy if exists ms_portal_media_select on storage.objects;
drop policy if exists ms_portal_media_insert on storage.objects;
drop policy if exists ms_portal_media_delete on storage.objects;
create policy ms_portal_media_select on storage.objects for select using (bucket_id='portal-media');
create policy ms_portal_media_insert on storage.objects for insert with check (bucket_id='portal-media' and public.current_profile_role()='admin');
create policy ms_portal_media_delete on storage.objects for delete using (bucket_id='portal-media' and public.current_profile_role()='admin');

-- ================================================================
-- 16) Modelo online canônico: convites, versões de ficha, campanha e sessões
-- ================================================================
create table if not exists public.table_invites (
  id uuid primary key default gen_random_uuid(),
  table_id text not null references public.tables(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz,
  max_uses integer not null default 0,
  uses integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_table_invites_table on public.table_invites(table_id);
create index if not exists idx_table_invites_code on public.table_invites(code);

create table if not exists public.character_versions (
  id uuid primary key default gen_random_uuid(),
  character_id text not null references public.characters(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  version_no integer not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(character_id, version_no)
);
create index if not exists idx_character_versions_character on public.character_versions(character_id, version_no desc);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  table_id text not null unique references public.tables(id) on delete cascade,
  name text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  table_id text not null references public.tables(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  title text not null default 'Sessão',
  status text not null default 'planned' check(status in ('planned','active','ended')),
  started_at timestamptz,
  ended_at timestamptz,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_game_sessions_table on public.game_sessions(table_id, created_at desc);

alter table public.table_invites enable row level security;
alter table public.character_versions enable row level security;
alter table public.campaigns enable row level security;
alter table public.game_sessions enable row level security;

drop policy if exists ms_table_invites_select on public.table_invites;
drop policy if exists ms_character_versions_select on public.character_versions;
drop policy if exists ms_campaigns_select on public.campaigns;
drop policy if exists ms_campaigns_write on public.campaigns;
drop policy if exists ms_game_sessions_select on public.game_sessions;
drop policy if exists ms_game_sessions_write on public.game_sessions;

create policy ms_table_invites_select on public.table_invites for select using (
  exists(select 1 from public.tables tb where tb.id=table_invites.table_id and (tb.owner_id=auth.uid()::text or public.current_profile_role()='admin'))
);
create policy ms_character_versions_select on public.character_versions for select using (
  owner_id=auth.uid() or exists(select 1 from public.table_members tm join public.tables tb on tb.id=tm.table_id where tm.character_id=character_versions.character_id and tm.status='active' and tb.owner_id=auth.uid()::text)
);
create policy ms_campaigns_select on public.campaigns for select using (
  exists(select 1 from public.tables tb where tb.id=campaigns.table_id and (tb.owner_id=auth.uid()::text or public.current_profile_role()='admin' or exists(select 1 from public.table_members tm where tm.table_id=tb.id and tm.user_id=auth.uid() and tm.status='active')))
);
create policy ms_campaigns_write on public.campaigns for all using (
  exists(select 1 from public.tables tb where tb.id=campaigns.table_id and (tb.owner_id=auth.uid()::text or public.current_profile_role()='admin'))
) with check (
  exists(select 1 from public.tables tb where tb.id=campaigns.table_id and (tb.owner_id=auth.uid()::text or public.current_profile_role()='admin'))
);
create policy ms_game_sessions_select on public.game_sessions for select using (
  exists(select 1 from public.tables tb where tb.id=game_sessions.table_id and (tb.owner_id=auth.uid()::text or public.current_profile_role()='admin' or exists(select 1 from public.table_members tm where tm.table_id=tb.id and tm.user_id=auth.uid() and tm.status='active')))
);
create policy ms_game_sessions_write on public.game_sessions for all using (
  exists(select 1 from public.tables tb where tb.id=game_sessions.table_id and (tb.owner_id=auth.uid()::text or public.current_profile_role()='admin'))
) with check (
  exists(select 1 from public.tables tb where tb.id=game_sessions.table_id and (tb.owner_id=auth.uid()::text or public.current_profile_role()='admin'))
);

-- 17) RPCs canônicas: personagem, mesa, roster e convites.
create or replace function public.save_character_secure(
  p_id text, p_name text, p_mode text, p_nature text, p_class_name text, p_payload jsonb
) returns public.characters
language plpgsql security definer set search_path=public
as $$
declare v_character public.characters; v_version integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if trim(coalesce(p_name,''))='' then raise exception 'CHARACTER_NAME_REQUIRED'; end if;
  if trim(coalesce(p_payload->>'category',p_payload#>>'{concept,category}',''))='' then raise exception 'CHARACTER_CATEGORY_REQUIRED'; end if;
  if trim(coalesce(p_nature,''))='' then raise exception 'CHARACTER_EXPANSION_REQUIRED'; end if;
  if trim(coalesce(p_class_name,''))='' then raise exception 'CHARACTER_CLASS_REQUIRED'; end if;
  select * into v_character from public.characters where id=p_id and user_id=auth.uid()::text;
  if v_character.id is null then
    insert into public.characters(id,owner_id,user_id,name,mode,nature,class_name,payload)
    values(coalesce(nullif(p_id,''),'c-'||gen_random_uuid()::text),auth.uid()::text,auth.uid()::text,trim(p_name),coalesce(nullif(p_mode,''),'exodo'),p_nature,p_class_name,coalesce(p_payload,'{}'::jsonb))
    returning * into v_character;
  else
    insert into public.character_versions(character_id,owner_id,version_no,snapshot)
    select v_character.id, auth.uid(), coalesce(max(version_no),0)+1, v_character.payload
    from public.character_versions where character_id=v_character.id;
    update public.characters set name=trim(p_name),mode=coalesce(nullif(p_mode,''),mode),nature=p_nature,class_name=p_class_name,payload=coalesce(p_payload,'{}'::jsonb),updated_at=now() where id=v_character.id returning * into v_character;
  end if;
  return v_character;
end;
$$;
revoke all on function public.save_character_secure(text,text,text,text,text,jsonb) from public;
grant execute on function public.save_character_secure(text,text,text,text,text,jsonb) to authenticated;

create or replace function public.delete_my_character(p_character_id text)
returns boolean language plpgsql security definer set search_path=public
as $$
begin
  if not exists(select 1 from public.characters where id=p_character_id and user_id=auth.uid()::text) then raise exception 'CHARACTER_NOT_FOUND'; end if;
  delete from public.characters where id=p_character_id and user_id=auth.uid()::text;
  return true;
end;
$$;
revoke all on function public.delete_my_character(text) from public;
grant execute on function public.delete_my_character(text) to authenticated;

create or replace function public.restore_character_version(p_character_id text, p_version_id uuid)
returns public.characters language plpgsql security definer set search_path=public
as $$
declare v public.character_versions; c public.characters;
begin
  select * into c from public.characters where id=p_character_id and user_id=auth.uid()::text;
  if c.id is null then raise exception 'CHARACTER_NOT_FOUND'; end if;
  select * into v from public.character_versions where id=p_version_id and character_id=p_character_id and owner_id=auth.uid();
  if v.id is null then raise exception 'VERSION_NOT_FOUND'; end if;
  insert into public.character_versions(character_id,owner_id,version_no,snapshot)
  select c.id,auth.uid(),coalesce(max(version_no),0)+1,c.payload from public.character_versions where character_id=c.id;
  update public.characters set name=coalesce(v.snapshot->>'name',c.name),mode=coalesce(v.snapshot->>'mode',c.mode),nature=v.snapshot->>'nature',class_name=v.snapshot->>'className',payload=v.snapshot,updated_at=now() where id=c.id returning * into c;
  return c;
end;
$$;
revoke all on function public.restore_character_version(text,uuid) from public;
grant execute on function public.restore_character_version(text,uuid) to authenticated;

create or replace function public.fetch_table_roster(p_table_id text)
returns table(user_id uuid, username text, character_id text, character_name text, member_role text, status text)
language sql security definer set search_path=public
as $$
  select tm.user_id, coalesce(p.username,'jogador'), tm.character_id, coalesce(c.name,'Sem personagem'), tm.member_role, tm.status
  from public.table_members tm
  left join public.profiles p on p.auth_user_id=tm.user_id
  left join public.characters c on c.id=tm.character_id
  where tm.table_id=p_table_id
    and (tm.user_id=auth.uid() or exists(select 1 from public.tables tb where tb.id=p_table_id and tb.owner_id=auth.uid()::text) or public.current_profile_role()='admin');
$$;
revoke all on function public.fetch_table_roster(text) from public;
grant execute on function public.fetch_table_roster(text) to authenticated;

create or replace function public.set_table_member_status(p_table_id text, p_user_id uuid, p_status text)
returns boolean language plpgsql security definer set search_path=public
as $$
begin
  if not exists(select 1 from public.tables tb where tb.id=p_table_id and (tb.owner_id=auth.uid()::text or public.current_profile_role()='admin')) then raise exception 'GM_REQUIRED'; end if;
  if p_status not in ('active','banned','left') then raise exception 'INVALID_STATUS'; end if;
  update public.table_members set status=p_status,updated_at=now() where table_id=p_table_id and user_id=p_user_id;
  update public.tables set participants=(select coalesce(jsonb_agg(item),'[]'::jsonb) from jsonb_array_elements(participants) item where coalesce(item->>'userId','')<>p_user_id::text or p_status='active') where id=p_table_id;
  return true;
end;
$$;
revoke all on function public.set_table_member_status(text,uuid,text) from public;
grant execute on function public.set_table_member_status(text,uuid,text) to authenticated;

create or replace function public.link_table_character(p_table_id text, p_character_id text)
returns boolean language plpgsql security definer set search_path=public
as $$
begin
  if not exists(select 1 from public.table_members tm where tm.table_id=p_table_id and tm.user_id=auth.uid() and tm.status='active') then raise exception 'MEMBER_REQUIRED'; end if;
  if not exists(select 1 from public.characters c where c.id=p_character_id and c.user_id=auth.uid()::text) then raise exception 'CHARACTER_NOT_OWNED'; end if;
  update public.table_members set character_id=p_character_id,updated_at=now() where table_id=p_table_id and user_id=auth.uid();
  update public.tables set participants=(select coalesce(jsonb_agg(item),'[]'::jsonb) from jsonb_array_elements(participants) item where coalesce(item->>'userId','')<>auth.uid()::text)
    || jsonb_build_array(jsonb_build_object('userId',auth.uid()::text,'charId',p_character_id,'charName',(select name from public.characters where id=p_character_id),'ownerId',auth.uid()::text,'isOwner',false,'linkedAt',extract(epoch from now())*1000)) where id=p_table_id;
  return true;
end;
$$;
revoke all on function public.link_table_character(text,text) from public;
grant execute on function public.link_table_character(text,text) to authenticated;

create or replace function public.delete_table_secure(p_table_id text)
returns boolean language plpgsql security definer set search_path=public
as $$
begin
  if not exists(select 1 from public.tables where id=p_table_id and (owner_id=auth.uid()::text or public.current_profile_role()='admin')) then raise exception 'GM_REQUIRED'; end if;
  delete from public.tables where id=p_table_id;
  return true;
end;
$$;
revoke all on function public.delete_table_secure(text) from public;
grant execute on function public.delete_table_secure(text) to authenticated;

create or replace function public.update_table_settings_secure(p_table_id text, p_settings jsonb)
returns public.tables language plpgsql security definer set search_path=public
as $$
declare v public.tables;
begin
  if not exists(select 1 from public.tables where id=p_table_id and (owner_id=auth.uid()::text or public.current_profile_role()='admin')) then raise exception 'GM_REQUIRED'; end if;
  update public.tables set settings=coalesce(p_settings,'{}'::jsonb) where id=p_table_id returning * into v;
  return v;
end;
$$;
revoke all on function public.update_table_settings_secure(text,jsonb) from public;
grant execute on function public.update_table_settings_secure(text,jsonb) to authenticated;

create or replace function public.create_table_invite(p_table_id text, p_expires_at timestamptz default null, p_max_uses integer default 0)
returns public.table_invites language plpgsql security definer set search_path=public
as $$
declare v public.table_invites; c text;
begin
  if not exists(select 1 from public.tables where id=p_table_id and (owner_id=auth.uid()::text or public.current_profile_role()='admin')) then raise exception 'GM_REQUIRED'; end if;
  c := 'MS-'||upper(encode(gen_random_bytes(5),'hex'));
  insert into public.table_invites(table_id,code,created_by,expires_at,max_uses) values(p_table_id,c,auth.uid(),p_expires_at,greatest(coalesce(p_max_uses,0),0)) returning * into v;
  return v;
end;
$$;
revoke all on function public.create_table_invite(text,timestamptz,integer) from public;
grant execute on function public.create_table_invite(text,timestamptz,integer) to authenticated;

-- reforço: só o dono pode vincular personagem próprio ao entrar.
create or replace function public.join_table_secure(p_code text, p_character_id text default null)
returns public.tables language plpgsql security definer set search_path=public
as $$
declare v_table public.tables; v_code text; v_user text; v_char_name text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select tb.* into v_table from public.tables tb where tb.code=upper(trim(p_code)) limit 1 for update;
  if v_table.id is null then
    select ti.code, tb.* into v_code, v_table from public.table_invites ti join public.tables tb on tb.id=ti.table_id
    where ti.code=upper(trim(p_code)) and ti.active=true and (ti.expires_at is null or ti.expires_at>now()) and (ti.max_uses=0 or ti.uses<ti.max_uses) limit 1 for update;
    if v_table.id is null then raise exception 'TABLE_NOT_FOUND'; end if;
    update public.table_invites set uses=uses+1, active=case when max_uses>0 and uses+1>=max_uses then false else active end where code=upper(trim(p_code));
  end if;
  if exists(select 1 from public.table_members where table_id=v_table.id and user_id=auth.uid() and status='banned') then raise exception 'MEMBER_BANNED'; end if;
  if p_character_id is not null then
    if not exists(select 1 from public.characters where id=p_character_id and user_id=auth.uid()::text) then raise exception 'CHARACTER_NOT_OWNED'; end if;
    select name into v_char_name from public.characters where id=p_character_id and user_id=auth.uid()::text;
  end if;
  insert into public.table_members(table_id,user_id,character_id,member_role,status)
  values(v_table.id,auth.uid(),p_character_id,'jogador','active')
  on conflict(table_id,user_id) do update set character_id=excluded.character_id,status='active',updated_at=now();
  update public.tables set participants=(select coalesce(jsonb_agg(item),'[]'::jsonb) from jsonb_array_elements(participants) item where coalesce(item->>'userId','')<>auth.uid()::text)
    || jsonb_build_array(jsonb_build_object('userId',auth.uid()::text,'charId',p_character_id,'charName',coalesce(v_char_name,'Alma Vinculada'),'ownerId',auth.uid()::text,'isOwner',false,'linkedAt',extract(epoch from now())*1000)) where id=v_table.id returning * into v_table;
  return v_table;
end;
$$;
revoke all on function public.join_table_secure(text,text) from public;
grant execute on function public.join_table_secure(text,text) to authenticated;

create or replace function public.fetch_table_characters(p_table_id text)
returns table(id text, owner_id text, user_id text, name text, mode text, nature text, class_name text, payload jsonb, updated_at timestamptz)
language sql security definer set search_path=public
as $$
  select c.id,c.owner_id,c.user_id,c.name,c.mode,c.nature,c.class_name,c.payload,c.updated_at
  from public.characters c
  where (
    c.user_id=auth.uid()::text and exists(select 1 from public.table_members tm where tm.table_id=p_table_id and tm.user_id=auth.uid() and tm.status='active')
  ) or (
    exists(select 1 from public.tables tb where tb.id=p_table_id and (tb.owner_id=auth.uid()::text or public.current_profile_role()='admin'))
  ) and exists(select 1 from public.table_members tm where tm.table_id=p_table_id and tm.character_id=c.id and tm.status='active');
$$;
revoke all on function public.fetch_table_characters(text) from public;
grant execute on function public.fetch_table_characters(text) to authenticated;

-- V2.3: execute também supabase-master-v2.3-migration.sql para habilitar Co-Mestre/Observador e colaboração segura.

-- V2.8.2: autoridade de mesa compatível + moderação administrativa completa.
-- Mundos Sombrios V2.8.2 — correções de autoridade de mesa e moderação ADM
-- Pode ser aplicado em uma instalação existente após supabase-production.sql.
-- Não exige reset de usuários, mesas ou solicitações.

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

-- ================================================================
-- V2.8.8 — Consolidação de presença, status ao vivo e sumários
-- ================================================================
create table if not exists public.table_presence (
  table_id text not null references public.tables(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  connected boolean not null default true,
  last_seen_at timestamptz not null default now(),
  primary key(table_id,user_id)
);
create index if not exists idx_table_presence_recent_v288 on public.table_presence(table_id,last_seen_at desc) where connected=true;
alter table public.table_presence enable row level security;
revoke all on public.table_presence from anon, authenticated;

create or replace function public.touch_table_presence(p_table_id text,p_online boolean default true)
returns boolean language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid() is null or not public.can_access_table_session(p_table_id) then raise exception 'TABLE_ACCESS_REQUIRED'; end if;
  insert into public.table_presence(table_id,user_id,connected,last_seen_at)
  values(p_table_id,auth.uid(),coalesce(p_online,true),now())
  on conflict(table_id,user_id) do update set connected=excluded.connected,last_seen_at=now();
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
  update public.tables set status=v_status,updated_at=now() where id=p_table_id returning * into v;
  if v.id is null then raise exception 'TABLE_NOT_FOUND'; end if;
  return v;
end;
$$;
revoke all on function public.set_table_live_status(text,text) from public;
grant execute on function public.set_table_live_status(text,text) to authenticated;

create or replace function public.fetch_my_table_summaries()
returns table(id text,code text,name text,theme text,game_mode text,settings jsonb,owner_id text,status text,created_at timestamptz,updated_at timestamptz,active_members integer,my_member_role text,my_character_id text,is_owner boolean)
language sql security definer set search_path=public
as $$
  with me as (
    select auth.uid() as auth_user_id,
           (select p.id from public.profiles p where p.auth_user_id=auth.uid() limit 1) as profile_id,
           public.current_profile_role() as role
  ), scoped as (
    select tb.*,
      (tb.owner_id=me.auth_user_id::text or tb.owner_id=me.profile_id) as owner_match,
      tm.member_role,tm.character_id
    from public.tables tb cross join me
    left join public.table_members tm on tm.table_id=tb.id and tm.user_id=me.auth_user_id and tm.status='active'
    where (tb.owner_id=me.auth_user_id::text or tb.owner_id=me.profile_id or me.role='admin' or tm.id is not null)
  )
  select s.id,s.code,s.name,s.theme,s.game_mode,coalesce(s.settings,'{}'::jsonb),s.owner_id,s.status,s.created_at,s.updated_at,
    coalesce((select count(*)::integer from public.table_members x where x.table_id=s.id and x.status='active'),0),
    case when s.owner_match then 'mestre' when coalesce(s.member_role,'')<>'' then s.member_role else null end,
    s.character_id,s.owner_match
  from scoped s order by s.updated_at desc,s.created_at desc;
$$;
revoke all on function public.fetch_my_table_summaries() from public;
grant execute on function public.fetch_my_table_summaries() to authenticated;


-- ============================================================================
-- MESTRE V2.3 :: supabase-master-v2.3-migration.sql
-- ============================================================================
-- Mundos Sombrios V2.3 — papéis operacionais de mesa
-- Execute após supabase-production.sql em instalações existentes.
begin;

alter table public.table_members drop constraint if exists table_members_member_role_check;
alter table public.table_members add constraint table_members_member_role_check
  check (member_role in ('mestre','co_mestre','observador','jogador'));

create or replace function public.can_manage_table(p_table_id text)
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(select 1 from public.tables tb where tb.id=p_table_id and tb.owner_id=auth.uid()::text)
      or public.current_profile_role()='admin'
      or exists(select 1 from public.table_members tm where tm.table_id=p_table_id and tm.user_id=auth.uid() and tm.status='active' and tm.member_role in ('mestre','co_mestre'));
$$;
revoke all on function public.can_manage_table(text) from public;
grant execute on function public.can_manage_table(text) to authenticated;

create or replace function public.set_table_member_role(p_table_id text, p_user_id uuid, p_role text)
returns boolean language plpgsql security definer set search_path=public
as $$
begin
  if not exists(select 1 from public.tables tb where tb.id=p_table_id and (tb.owner_id=auth.uid()::text or public.current_profile_role()='admin')) then raise exception 'OWNER_REQUIRED'; end if;
  if p_role not in ('co_mestre','observador','jogador') then raise exception 'INVALID_MEMBER_ROLE'; end if;
  update public.table_members set member_role=p_role,updated_at=now() where table_id=p_table_id and user_id=p_user_id and member_role<>'mestre';
  return found;
end;
$$;
revoke all on function public.set_table_member_role(text,uuid,text) from public;
grant execute on function public.set_table_member_role(text,uuid,text) to authenticated;

create or replace function public.fetch_table_roster(p_table_id text)
returns table(user_id uuid, username text, character_id text, character_name text, member_role text, status text)
language sql security definer set search_path=public
as $$
  select tm.user_id, coalesce(p.username,'jogador'), tm.character_id, coalesce(c.name,'Sem personagem'), tm.member_role, tm.status
  from public.table_members tm
  left join public.profiles p on p.auth_user_id=tm.user_id
  left join public.characters c on c.id=tm.character_id
  where tm.table_id=p_table_id
    and (tm.user_id=auth.uid() or public.can_manage_table(p_table_id));
$$;

-- Estado estrutural e acervo privado: Co-Mestre pode colaborar; Observador permanece somente leitura pública da mesa.
drop policy if exists ms_table_state_update on public.table_state;
drop policy if exists ms_table_state_upsert on public.table_state;
create policy ms_table_state_update on public.table_state for insert with check (public.can_manage_table(table_id));
create policy ms_table_state_upsert on public.table_state for update using (public.can_manage_table(table_id)) with check (public.can_manage_table(table_id));

drop policy if exists ms_gm_notes_all on public.gm_notes;
drop policy if exists ms_gm_npcs_all on public.gm_npcs;
drop policy if exists ms_gm_files_select on public.gm_files;
drop policy if exists ms_gm_files_insert on public.gm_files;
drop policy if exists ms_gm_files_delete on public.gm_files;
create policy ms_gm_notes_all on public.gm_notes for all using (public.can_manage_table(table_id)) with check (public.can_manage_table(table_id));
create policy ms_gm_npcs_all on public.gm_npcs for all using (public.can_manage_table(table_id)) with check (public.can_manage_table(table_id));
create policy ms_gm_files_select on public.gm_files for select using (public.can_manage_table(table_id));
create policy ms_gm_files_insert on public.gm_files for insert with check (public.can_manage_table(table_id));
create policy ms_gm_files_delete on public.gm_files for delete using (public.can_manage_table(table_id));

commit;


-- ============================================================================
-- SOULDRAKMA V2.5 :: supabase-soul-economy-v2.5-migration.sql
-- ============================================================================
-- Mundos Sombrios V2.5 — Soul Economy
-- Execute APÓS supabase-production.sql e supabase-master-v2.3-migration.sql.
-- Saldo, Colheita, compras, slots e expansões são server-authoritative.
begin;

create table if not exists public.soul_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  lifetime_earned bigint not null default 0 check (lifetime_earned >= 0),
  lifetime_harvested bigint not null default 0 check (lifetime_harvested >= 0),
  lifetime_spent bigint not null default 0 check (lifetime_spent >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.soul_wallets add column if not exists lifetime_harvested bigint not null default 0 check (lifetime_harvested >= 0);

create table if not exists public.soul_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount bigint not null,
  balance_after bigint not null,
  tx_type text not null check (tx_type in ('HARVEST','ACHIEVEMENT','PURCHASE','ADMIN_GRANT','ADMIN_REMOVE','ENTITLEMENT_GRANT','ENTITLEMENT_REVOKE','REFUND','SYSTEM_REWARD')),
  source text not null default 'system',
  reference_id text,
  metadata jsonb not null default '{}'::jsonb,
  admin_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_soul_transactions_user_created on public.soul_transactions(user_id,created_at desc);
alter table public.soul_transactions drop constraint if exists soul_transactions_tx_type_check;
alter table public.soul_transactions add constraint soul_transactions_tx_type_check check (tx_type in ('HARVEST','ACHIEVEMENT','PURCHASE','ADMIN_GRANT','ADMIN_REMOVE','ENTITLEMENT_GRANT','ENTITLEMENT_REVOKE','REFUND','SYSTEM_REWARD'));

create table if not exists public.soul_catalog (
  product_key text primary key,
  product_type text not null check (product_type in ('character_slot','table_slot','expansion')),
  display_name text not null,
  price bigint not null check (price >= 0),
  entitlement_key text not null,
  description text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.soul_catalog(product_key,product_type,display_name,price,entitlement_key,description,metadata,sort_order) values
 ('character_slot','character_slot','Slot adicional de ficha',20000,'character_slot_bonus','Amplia em +1 a capacidade de fichas da conta.','{"icon":"soul-slot-character"}'::jsonb,10),
 ('exp_aprimorador','expansion','Arquiteto de Linhagem · Aprimorador',50000,'aprimorador','Desbloqueia criação de fichas da expansão Aprimorador.','{"world":"exodo"}'::jsonb,20),
 ('exp_player','expansion','Operador de Sistema · Projeto Player',55000,'projeto-player','Desbloqueia criação de fichas do Projeto Player.','{"world":"exodo"}'::jsonb,30),
 ('exp_linhagem','expansion','Classer · Linhagem Herdada',60000,'linhagem-herdada','Desbloqueia criação de fichas da Linhagem Herdada.','{"world":"exodo"}'::jsonb,40),
 ('exp_envolto','expansion','O Envolto',70000,'envolto','Desbloqueia criação de fichas do Envolto.','{"world":"ocultatun","rarity":"alta"}'::jsonb,50),
 ('exp_ordem','expansion','A Ordem dos Sete Arcanjos',70000,'ordem-dos-sete','Desbloqueia criação de fichas da Ordem dos Sete.','{"world":"ocultatun","rarity":"alta"}'::jsonb,60),
 ('master_table_slot','table_slot','Slot adicional de mesa',70000,'table_slot_bonus','Amplia em +1 a capacidade de mesas de uma conta Mestre.','{"role":"mestre"}'::jsonb,70)
on conflict(product_key) do update set product_type=excluded.product_type,display_name=excluded.display_name,price=excluded.price,entitlement_key=excluded.entitlement_key,description=excluded.description,metadata=excluded.metadata,sort_order=excluded.sort_order,active=true,updated_at=now();

create table if not exists public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_type text not null check (entitlement_type in ('expansion','character_slot_bonus','table_slot_bonus','cosmetic','title')),
  entitlement_key text not null,
  quantity integer not null default 1 check (quantity >= 0),
  source text not null default 'purchase',
  metadata jsonb not null default '{}'::jsonb,
  granted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,entitlement_type,entitlement_key)
);
create index if not exists idx_user_entitlements_user on public.user_entitlements(user_id);

create table if not exists public.soul_harvest_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_activity_at timestamptz not null default now(),
  credited_minutes integer not null default 0 check (credited_minutes between 0 and 10),
  status text not null default 'active' check (status in ('active','complete','cancelled')),
  source text not null default 'interaction',
  created_at timestamptz not null default now()
);
create index if not exists idx_soul_harvest_user_status on public.soul_harvest_sessions(user_id,status,started_at desc);
create unique index if not exists idx_soul_harvest_one_active on public.soul_harvest_sessions(user_id) where status='active';

create table if not exists public.soul_achievements (
  achievement_key text primary key,
  title text not null,
  description text not null,
  category text not null,
  threshold bigint not null default 0,
  reward bigint not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0
);
insert into public.soul_achievements(achievement_key,title,description,category,threshold,reward,metadata,sort_order) values
 ('first_harvest','Primeiro Eco','Complete sua primeira Colheita.','COLHEITA',20,50,'{"badge":"eco"}'::jsonb,10),
 ('collector_10k','Acumulador de Almas','Colha 10.000 SoulDrakmas em sessões de Colheita.','COLHEITA',10000,250,'{"badge":"acumulador"}'::jsonb,20),
 ('collector_50k','O Peso da Alma','Colha 50.000 SoulDrakmas em sessões de Colheita.','COLHEITA',50000,1000,'{"badge":"peso"}'::jsonb,30),
 ('collector_100k','Ceifador','Colha 100.000 SoulDrakmas em sessões de Colheita.','COLHEITA',100000,2500,'{"badge":"ceifador","cosmetic":"moldura-fenda"}'::jsonb,40),
 ('unlock_aprimorador','Arquiteto da Carne','Desbloqueie Aprimorador.','EXPANSÕES',1,250,'{"entitlement":"aprimorador"}'::jsonb,50),
 ('unlock_player','Código Fantasma','Desbloqueie Projeto Player.','EXPANSÕES',1,250,'{"entitlement":"projeto-player"}'::jsonb,60),
 ('unlock_linhagem','Sangue Antigo','Desbloqueie Linhagem Herdada.','EXPANSÕES',1,250,'{"entitlement":"linhagem-herdada"}'::jsonb,70),
 ('unlock_envolto','Além do Véu','Desbloqueie O Envolto.','EXPANSÕES',1,500,'{"entitlement":"envolto"}'::jsonb,80),
 ('unlock_ordem','Sete Vozes','Desbloqueie a Ordem dos Sete.','EXPANSÕES',1,500,'{"entitlement":"ordem-dos-sete"}'::jsonb,90),
 ('first_character','Primeira Alma','Forje sua primeira ficha.','PERSONAGENS',1,100,'{}'::jsonb,100)
on conflict(achievement_key) do update set title=excluded.title,description=excluded.description,category=excluded.category,threshold=excluded.threshold,reward=excluded.reward,metadata=excluded.metadata,sort_order=excluded.sort_order;

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_key text not null references public.soul_achievements(achievement_key) on delete cascade,
  unlocked_at timestamptz not null default now(),
  reward_granted bigint not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  primary key(user_id,achievement_key)
);

create or replace function public.soul_profile_role(p_user uuid default auth.uid()) returns text
language sql stable security definer set search_path=public as $$
  select coalesce((select role from public.profiles where auth_user_id=p_user and banned=false limit 1),'jogador');
$$;

create or replace function public.soul_ensure_wallet(p_user uuid default auth.uid()) returns public.soul_wallets
language plpgsql security definer set search_path=public as $$
declare w public.soul_wallets;
begin
  if p_user is null then raise exception 'AUTH_REQUIRED'; end if;
  insert into public.soul_wallets(user_id) values(p_user) on conflict(user_id) do nothing;
  select * into w from public.soul_wallets where user_id=p_user;
  return w;
end; $$;

create or replace function public.soul_slot_bonus(p_user uuid,p_type text) returns integer
language sql stable security definer set search_path=public as $$
 select coalesce(sum(quantity),0)::integer from public.user_entitlements where user_id=p_user and entitlement_type=p_type;
$$;

create or replace function public.soul_character_capacity(p_user uuid default auth.uid()) returns integer
language plpgsql stable security definer set search_path=public as $$
declare r text; base integer;
begin
 r:=public.soul_profile_role(p_user);
 if r='admin' then return 2147483647; end if;
 base:=case when r='mestre' then 5 else 3 end;
 return base + public.soul_slot_bonus(p_user,'character_slot_bonus');
end; $$;

create or replace function public.soul_table_capacity(p_user uuid default auth.uid()) returns integer
language plpgsql stable security definer set search_path=public as $$
declare r text; base integer;
begin
 r:=public.soul_profile_role(p_user);
 if r='admin' then return 2147483647; end if;
 if r<>'mestre' then return 0; end if;
 base:=3;
 return base + public.soul_slot_bonus(p_user,'table_slot_bonus');
end; $$;

create or replace function public.soul_expansion_key_for_nature(p_nature text) returns text
language plpgsql immutable as $$
declare n text:=lower(coalesce(p_nature,'')); begin
 if n like '%aprimorador%' or n like '%arquiteto de linhagem%' then return 'aprimorador'; end if;
 if n like '%proj. player%' or n like '%projeto player%' or n like '%operador de sistema%' then return 'projeto-player'; end if;
 if n like '%classer%' or n like '%linhagem herdada%' then return 'linhagem-herdada'; end if;
 if n like '%envolto%' then return 'envolto'; end if;
 if n like '%ordem dos sete%' then return 'ordem-dos-sete'; end if;
 return null;
end; $$;

create or replace function public.soul_has_expansion(p_user uuid,p_key text) returns boolean
language plpgsql stable security definer set search_path=public as $$
declare r text; begin
 if p_key is null or trim(p_key)='' then return true; end if;
 r:=public.soul_profile_role(p_user);
 if r in ('mestre','admin') then return true; end if;
 return exists(select 1 from public.user_entitlements where user_id=p_user and entitlement_type='expansion' and entitlement_key=p_key and quantity>0);
end; $$;

create or replace function public.soul_add_transaction(p_user uuid,p_amount bigint,p_type text,p_source text,p_reference text default null,p_metadata jsonb default '{}'::jsonb,p_admin uuid default null)
returns bigint language plpgsql security definer set search_path=public as $$
declare new_balance bigint; begin
 perform public.soul_ensure_wallet(p_user);
 update public.soul_wallets set
   balance=balance+p_amount,
   lifetime_earned=lifetime_earned+case when p_amount>0 then p_amount else 0 end,
   lifetime_harvested=lifetime_harvested+case when p_type='HARVEST' and p_amount>0 then p_amount else 0 end,
   lifetime_spent=lifetime_spent+case when p_amount<0 then -p_amount else 0 end,
   updated_at=now()
 where user_id=p_user and balance+p_amount>=0 returning balance into new_balance;
 if new_balance is null then raise exception 'INSUFFICIENT_SOULDRAKMA'; end if;
 insert into public.soul_transactions(user_id,amount,balance_after,tx_type,source,reference_id,metadata,admin_id)
 values(p_user,p_amount,new_balance,p_type,coalesce(nullif(p_source,''),'system'),p_reference,coalesce(p_metadata,'{}'::jsonb),p_admin);
 return new_balance;
end; $$;
revoke all on function public.soul_add_transaction(uuid,bigint,text,text,text,jsonb,uuid) from public,anon,authenticated;

create or replace function public.soul_unlock_achievement(p_user uuid,p_key text) returns boolean
language plpgsql security definer set search_path=public as $$
declare a public.soul_achievements; affected integer:=0; begin
 select * into a from public.soul_achievements where achievement_key=p_key;
 if a.achievement_key is null then return false; end if;
 insert into public.user_achievements(user_id,achievement_key,reward_granted,metadata)
 values(p_user,p_key,a.reward,a.metadata) on conflict do nothing;
 get diagnostics affected = row_count;
 if affected>0 then
   if a.reward>0 then perform public.soul_add_transaction(p_user,a.reward,'ACHIEVEMENT','achievement',p_key,jsonb_build_object('title',a.title),null); end if;
   if nullif(a.metadata->>'cosmetic','') is not null then
     insert into public.user_entitlements(user_id,entitlement_type,entitlement_key,quantity,source,metadata)
     values(p_user,'cosmetic',a.metadata->>'cosmetic',1,'achievement',jsonb_build_object('achievement',p_key))
     on conflict(user_id,entitlement_type,entitlement_key) do update set quantity=greatest(public.user_entitlements.quantity,1),source='achievement',updated_at=now();
   end if;
   if nullif(a.metadata->>'title','') is not null then
     insert into public.user_entitlements(user_id,entitlement_type,entitlement_key,quantity,source,metadata)
     values(p_user,'title',a.metadata->>'title',1,'achievement',jsonb_build_object('achievement',p_key))
     on conflict(user_id,entitlement_type,entitlement_key) do update set quantity=greatest(public.user_entitlements.quantity,1),source='achievement',updated_at=now();
   end if;
 end if;
 return affected>0;
end; $$;
revoke all on function public.soul_unlock_achievement(uuid,text) from public,anon,authenticated;

create or replace function public.soul_check_achievements(p_user uuid default auth.uid()) returns void
language plpgsql security definer set search_path=public as $$
declare harvested bigint; rec record; begin
 perform public.soul_ensure_wallet(p_user);
 select lifetime_harvested into harvested from public.soul_wallets where user_id=p_user;
 if harvested>=20 then perform public.soul_unlock_achievement(p_user,'first_harvest'); end if;
 if harvested>=10000 then perform public.soul_unlock_achievement(p_user,'collector_10k'); end if;
 if harvested>=50000 then perform public.soul_unlock_achievement(p_user,'collector_50k'); end if;
 if harvested>=100000 then perform public.soul_unlock_achievement(p_user,'collector_100k'); end if;
 if exists(select 1 from public.characters where user_id=p_user::text) then perform public.soul_unlock_achievement(p_user,'first_character'); end if;
 for rec in select entitlement_key from public.user_entitlements where user_id=p_user and entitlement_type='expansion' and quantity>0 loop
   perform public.soul_unlock_achievement(p_user,case rec.entitlement_key when 'aprimorador' then 'unlock_aprimorador' when 'projeto-player' then 'unlock_player' when 'linhagem-herdada' then 'unlock_linhagem' when 'envolto' then 'unlock_envolto' when 'ordem-dos-sete' then 'unlock_ordem' else '__none__' end);
 end loop;
end; $$;
revoke all on function public.soul_check_achievements(uuid) from public,anon,authenticated;

create or replace function public.soul_settle_harvest(p_user uuid default auth.uid()) returns jsonb
language plpgsql security definer set search_path=public as $$
declare h public.soul_harvest_sessions; target integer; delta integer; award bigint; w public.soul_wallets; effective_until timestamptz; begin
 if p_user is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into h from public.soul_harvest_sessions where user_id=p_user and status='active' order by started_at desc limit 1 for update;
 if h.id is not null then
   effective_until:=least(now(),h.expires_at,h.last_activity_at+interval '75 seconds');
   target:=greatest(0,least(10,floor(extract(epoch from (effective_until-h.started_at))/60)::integer));
   delta:=greatest(0,target-h.credited_minutes); award:=delta*2;
   if award>0 then perform public.soul_add_transaction(p_user,award,'HARVEST','colheita',h.id::text,jsonb_build_object('minutes',delta),null); end if;
   update public.soul_harvest_sessions set credited_minutes=target,status=case when now()>=expires_at or target>=10 then 'complete' else status end where id=h.id returning * into h;
 end if;
 select * into w from public.soul_ensure_wallet(p_user);
 perform public.soul_check_achievements(p_user);
 select * into w from public.soul_wallets where user_id=p_user;
 return jsonb_build_object('wallet',to_jsonb(w),'harvest',case when h.id is null then null else to_jsonb(h) end);
end; $$;

create or replace function public.soul_touch_activity(p_source text default 'interaction') returns jsonb
language plpgsql security definer set search_path=public as $$
declare old jsonb; h public.soul_harvest_sessions; begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 old:=public.soul_settle_harvest(auth.uid());
 select * into h from public.soul_harvest_sessions where user_id=auth.uid() and status='active' order by started_at desc limit 1;
 if h.id is null then
   insert into public.soul_harvest_sessions(user_id,started_at,expires_at,last_activity_at,status,source)
   values(auth.uid(),now(),now()+interval '10 minutes',now(),'active',left(coalesce(p_source,'interaction'),80)) returning * into h;
 else
   update public.soul_harvest_sessions set last_activity_at=now() where id=h.id returning * into h;
 end if;
 return jsonb_build_object('wallet',(select to_jsonb(w) from public.soul_wallets w where user_id=auth.uid()),'harvest',to_jsonb(h));
end; $$;

create or replace function public.soul_harvest_tick() returns jsonb
language plpgsql security definer set search_path=public as $$
declare result jsonb; h public.soul_harvest_sessions; begin
 result:=public.soul_settle_harvest(auth.uid());
 update public.soul_harvest_sessions set last_activity_at=now() where user_id=auth.uid() and status='active' returning * into h;
 if h.id is not null then result:=jsonb_set(result,'{harvest}',to_jsonb(h),true); end if;
 return result;
end; $$;

create or replace function public.soul_purchase(p_product_key text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare p public.soul_catalog; r text; w public.soul_wallets; etype text; newq integer; begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into p from public.soul_catalog where product_key=p_product_key and active=true for update;
 if p.product_key is null then raise exception 'PRODUCT_NOT_FOUND'; end if;
 r:=public.soul_profile_role(auth.uid());
 if r='admin' then raise exception 'ADMIN_UNLIMITED_ACCESS'; end if;
 if p.product_type='table_slot' and r<>'mestre' then raise exception 'MASTER_ONLY_PRODUCT'; end if;
 if p.product_type='expansion' and r<>'jogador' then raise exception 'EXPANSIONS_ALREADY_UNLOCKED'; end if;
 if p.product_type='expansion' and public.soul_has_expansion(auth.uid(),p.entitlement_key) then raise exception 'ALREADY_UNLOCKED'; end if;
 perform public.soul_add_transaction(auth.uid(),-p.price,'PURCHASE','soul-vault',p.product_key,jsonb_build_object('product',p.display_name),null);
 etype:=case p.product_type when 'character_slot' then 'character_slot_bonus' when 'table_slot' then 'table_slot_bonus' else 'expansion' end;
 insert into public.user_entitlements(user_id,entitlement_type,entitlement_key,quantity,source,metadata)
 values(auth.uid(),etype,p.entitlement_key,1,'purchase',jsonb_build_object('product_key',p.product_key))
 on conflict(user_id,entitlement_type,entitlement_key) do update set quantity=public.user_entitlements.quantity+1,updated_at=now(),source='purchase';
 perform public.soul_check_achievements(auth.uid());
 select * into w from public.soul_wallets where user_id=auth.uid();
 select quantity into newq from public.user_entitlements where user_id=auth.uid() and entitlement_type=etype and entitlement_key=p.entitlement_key;
 return jsonb_build_object('ok',true,'product',to_jsonb(p),'wallet',to_jsonb(w),'quantity',newq);
end; $$;

create or replace function public.soul_get_account_state() returns jsonb
language plpgsql security definer set search_path=public as $$
declare r text; w public.soul_wallets; h public.soul_harvest_sessions; cc integer; tc integer; begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 perform public.soul_settle_harvest(auth.uid());
 perform public.soul_check_achievements(auth.uid());
 r:=public.soul_profile_role(auth.uid()); select * into w from public.soul_wallets where user_id=auth.uid();
 select * into h from public.soul_harvest_sessions where user_id=auth.uid() and status='active' order by started_at desc limit 1;
 cc:=public.soul_character_capacity(auth.uid()); tc:=public.soul_table_capacity(auth.uid());
 return jsonb_build_object(
   'role',r,'wallet',to_jsonb(w),'characterCapacity',cc,'tableCapacity',tc,
   'unlimitedCharacters',r='admin','unlimitedTables',r='admin','allExpansions',r in ('mestre','admin'),
   'entitlements',(select coalesce(jsonb_agg(to_jsonb(e) order by e.entitlement_type,e.entitlement_key),'[]'::jsonb) from public.user_entitlements e where e.user_id=auth.uid() and e.quantity>0),
   'catalog',(select coalesce(jsonb_agg(to_jsonb(c) order by c.sort_order),'[]'::jsonb) from public.soul_catalog c where c.active=true),
   'harvest',case when h.id is null then null else to_jsonb(h) end,
   'achievements',(select coalesce(jsonb_agg(jsonb_build_object('key',a.achievement_key,'title',a.title,'description',a.description,'category',a.category,'threshold',a.threshold,'reward',a.reward,'metadata',a.metadata,'unlocked',ua.user_id is not null,'unlocked_at',ua.unlocked_at) order by a.sort_order),'[]'::jsonb) from public.soul_achievements a left join public.user_achievements ua on ua.achievement_key=a.achievement_key and ua.user_id=auth.uid()),
   'transactions',(select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]'::jsonb) from (select * from public.soul_transactions where user_id=auth.uid() order by created_at desc limit 30) t)
 );
end; $$;

create or replace function public.soul_admin_resolve_user(p_profile_id text) returns uuid
language plpgsql stable security definer set search_path=public as $$
declare u uuid; begin
 if public.soul_profile_role(auth.uid())<>'admin' then raise exception 'ADMIN_REQUIRED'; end if;
 select auth_user_id into u from public.profiles where id=p_profile_id or auth_user_id::text=p_profile_id limit 1;
 if u is null then raise exception 'USER_NOT_FOUND'; end if; return u;
end; $$;

create or replace function public.soul_admin_adjust_balance(p_profile_id text,p_amount bigint,p_reason text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid; nb bigint; begin
 u:=public.soul_admin_resolve_user(p_profile_id);
 if p_amount=0 then raise exception 'ZERO_ADJUSTMENT'; end if;
 if trim(coalesce(p_reason,''))='' then raise exception 'REASON_REQUIRED'; end if;
 nb:=public.soul_add_transaction(u,p_amount,case when p_amount>0 then 'ADMIN_GRANT' else 'ADMIN_REMOVE' end,'admin-console',null,jsonb_build_object('reason',trim(p_reason)),auth.uid());
 return jsonb_build_object('ok',true,'balance',nb);
end; $$;

create or replace function public.soul_admin_set_entitlement(p_profile_id text,p_type text,p_key text,p_quantity integer,p_reason text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid; target_role text; begin
 u:=public.soul_admin_resolve_user(p_profile_id); target_role:=public.soul_profile_role(u);
 if p_type not in ('expansion','character_slot_bonus','table_slot_bonus','cosmetic','title') then raise exception 'INVALID_ENTITLEMENT_TYPE'; end if;
 if trim(coalesce(p_key,''))='' or trim(coalesce(p_reason,''))='' then raise exception 'KEY_AND_REASON_REQUIRED'; end if;
 if p_type='expansion' and p_key not in ('aprimorador','projeto-player','linhagem-herdada','envolto','ordem-dos-sete') then raise exception 'INVALID_EXPANSION_KEY'; end if;
 if p_type='expansion' and target_role in ('mestre','admin') then raise exception 'ROLE_HAS_INHERENT_EXPANSIONS'; end if;
 if p_type='character_slot_bonus' and p_key<>'character_slot_bonus' then raise exception 'INVALID_CHARACTER_SLOT_KEY'; end if;
 if p_type='table_slot_bonus' and p_key<>'table_slot_bonus' then raise exception 'INVALID_TABLE_SLOT_KEY'; end if;
 if p_quantity<=0 then
   delete from public.user_entitlements where user_id=u and entitlement_type=p_type and entitlement_key=p_key;
   perform public.soul_add_transaction(u,0,'ENTITLEMENT_REVOKE','admin-console',p_key,jsonb_build_object('reason',trim(p_reason),'type',p_type,'quantity',0),auth.uid());
 else
   insert into public.user_entitlements(user_id,entitlement_type,entitlement_key,quantity,source,metadata) values(u,p_type,p_key,p_quantity,'admin',jsonb_build_object('reason',trim(p_reason),'admin',auth.uid())) on conflict(user_id,entitlement_type,entitlement_key) do update set quantity=excluded.quantity,source='admin',metadata=excluded.metadata,updated_at=now();
   perform public.soul_add_transaction(u,0,'ENTITLEMENT_GRANT','admin-console',p_key,jsonb_build_object('reason',trim(p_reason),'type',p_type,'quantity',p_quantity),auth.uid());
 end if;
 return jsonb_build_object('ok',true,'quantity',greatest(p_quantity,0));
end; $$;

create or replace function public.soul_admin_get_account(p_profile_id text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid; r text; begin
 u:=public.soul_admin_resolve_user(p_profile_id); r:=public.soul_profile_role(u); perform public.soul_ensure_wallet(u);
 return jsonb_build_object('role',r,'wallet',(select to_jsonb(w) from public.soul_wallets w where w.user_id=u),'characterCapacity',public.soul_character_capacity(u),'tableCapacity',public.soul_table_capacity(u),'entitlements',(select coalesce(jsonb_agg(to_jsonb(e)),'[]'::jsonb) from public.user_entitlements e where e.user_id=u),'transactions',(select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]'::jsonb) from (select * from public.soul_transactions where user_id=u order by created_at desc limit 50) t));
end; $$;

-- Guardas server-side de criação de personagens e uso de expansões.
create or replace function public.save_character_secure(p_id text,p_name text,p_mode text,p_nature text,p_class_name text,p_payload jsonb)
returns public.characters language plpgsql security definer set search_path=public as $$
declare v_character public.characters; v_existing public.characters; v_key text; v_count integer; begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if trim(coalesce(p_name,''))='' then raise exception 'CHARACTER_NAME_REQUIRED'; end if;
  if trim(coalesce(p_nature,''))='' then raise exception 'CHARACTER_EXPANSION_REQUIRED'; end if;
  if trim(coalesce(p_class_name,''))='' then raise exception 'CHARACTER_CLASS_REQUIRED'; end if;
 select * into v_existing from public.characters where id=p_id and user_id=auth.uid()::text;
 v_key:=public.soul_expansion_key_for_nature(p_nature);
 if v_existing.id is null then
   select count(*) into v_count from public.characters where user_id=auth.uid()::text;
   if v_count>=public.soul_character_capacity(auth.uid()) then raise exception 'CHARACTER_SLOT_LIMIT'; end if;
   if not public.soul_has_expansion(auth.uid(),v_key) then raise exception 'EXPANSION_LOCKED:%',coalesce(v_key,'unknown'); end if;
   insert into public.characters(id,owner_id,user_id,name,mode,nature,class_name,payload) values(coalesce(nullif(p_id,''),'c-'||gen_random_uuid()::text),auth.uid()::text,auth.uid()::text,trim(p_name),coalesce(nullif(p_mode,''),'exodo'),p_nature,p_class_name,coalesce(p_payload,'{}'::jsonb)) returning * into v_character;
 else
   -- Personagens legados permanecem editáveis mesmo se o entitlement for removido. Trocar para outra expansão bloqueada não é permitido.
   if v_key is not null and v_key is distinct from public.soul_expansion_key_for_nature(v_existing.nature) and not public.soul_has_expansion(auth.uid(),v_key) then raise exception 'EXPANSION_LOCKED:%',v_key; end if;
   insert into public.character_versions(character_id,owner_id,version_no,snapshot) select v_existing.id,auth.uid(),coalesce(max(version_no),0)+1,v_existing.payload from public.character_versions where character_id=v_existing.id;
   update public.characters set name=trim(p_name),mode=coalesce(nullif(p_mode,''),mode),nature=p_nature,class_name=p_class_name,payload=coalesce(p_payload,'{}'::jsonb),updated_at=now() where id=v_existing.id returning * into v_character;
 end if;
 perform public.soul_check_achievements(auth.uid());
 return v_character;
end; $$;

-- Guardas server-side de criação de mesa.
create or replace function public.create_table_secure(p_id text,p_code text,p_name text,p_theme text,p_game_mode text,p_settings jsonb default '{}'::jsonb)
returns public.tables language plpgsql security definer set search_path=public as $$
declare v_table public.tables; v_user text; v_count integer; v_role text; begin
 v_role:=public.soul_profile_role(auth.uid());
 if v_role not in ('mestre','admin') then raise exception 'GM_REQUIRED'; end if;
 v_user:=(select id from public.profiles where auth_user_id=auth.uid() and banned=false limit 1);
 select count(*) into v_count from public.tables where owner_id=v_user;
 if v_count>=public.soul_table_capacity(auth.uid()) then raise exception 'TABLE_SLOT_LIMIT'; end if;
 insert into public.tables(id,code,name,theme,game_mode,owner_id,participants,banned,settings) values(coalesce(nullif(p_id,''),gen_random_uuid()::text),upper(trim(p_code)),trim(p_name),coalesce(p_theme,'default'),coalesce(p_game_mode,'exodo'),v_user,'[]'::jsonb,'[]'::jsonb,coalesce(p_settings,'{}'::jsonb)) returning * into v_table;
 insert into public.table_members(table_id,user_id,member_role) values(v_table.id,auth.uid(),'mestre') on conflict do nothing;
 update public.tables set participants=jsonb_build_array(jsonb_build_object('userId',auth.uid()::text,'charId',null,'charName',(select username from public.profiles where auth_user_id=auth.uid()),'ownerId',v_user,'isOwner',true,'linkedAt',extract(epoch from now())*1000)) where id=v_table.id returning * into v_table;
 insert into public.table_state(table_id,state) values(v_table.id,'{}'::jsonb) on conflict do nothing;
 return v_table;
end; $$;

-- Funções auxiliares são internas; usuários interagem somente pelas RPCs públicas abaixo.
revoke all on function public.soul_profile_role(uuid) from public,anon,authenticated;
revoke all on function public.soul_ensure_wallet(uuid) from public,anon,authenticated;
revoke all on function public.soul_slot_bonus(uuid,text) from public,anon,authenticated;
revoke all on function public.soul_expansion_key_for_nature(text) from public,anon,authenticated;
revoke all on function public.soul_settle_harvest(uuid) from public,anon,authenticated;
revoke all on function public.soul_admin_resolve_user(text) from public,anon,authenticated;

-- RLS: usuários só leem a própria economia; catálogo/achievements são leitura pública autenticada.
alter table public.soul_wallets enable row level security; alter table public.soul_transactions enable row level security; alter table public.soul_catalog enable row level security; alter table public.user_entitlements enable row level security; alter table public.soul_harvest_sessions enable row level security; alter table public.soul_achievements enable row level security; alter table public.user_achievements enable row level security;
drop policy if exists soul_wallet_self on public.soul_wallets; create policy soul_wallet_self on public.soul_wallets for select using(user_id=auth.uid());
drop policy if exists soul_tx_self on public.soul_transactions; create policy soul_tx_self on public.soul_transactions for select using(user_id=auth.uid());
drop policy if exists soul_catalog_read on public.soul_catalog; create policy soul_catalog_read on public.soul_catalog for select to authenticated using(active=true);
drop policy if exists soul_ent_self on public.user_entitlements; create policy soul_ent_self on public.user_entitlements for select using(user_id=auth.uid());
drop policy if exists soul_harvest_self on public.soul_harvest_sessions; create policy soul_harvest_self on public.soul_harvest_sessions for select using(user_id=auth.uid());
drop policy if exists soul_ach_read on public.soul_achievements; create policy soul_ach_read on public.soul_achievements for select to authenticated using(true);
drop policy if exists soul_user_ach_self on public.user_achievements; create policy soul_user_ach_self on public.user_achievements for select using(user_id=auth.uid());

revoke all on function public.soul_get_account_state() from public; grant execute on function public.soul_get_account_state() to authenticated;
revoke all on function public.soul_touch_activity(text) from public; grant execute on function public.soul_touch_activity(text) to authenticated;
revoke all on function public.soul_harvest_tick() from public; grant execute on function public.soul_harvest_tick() to authenticated;
revoke all on function public.soul_purchase(text) from public; grant execute on function public.soul_purchase(text) to authenticated;
revoke all on function public.soul_admin_adjust_balance(text,bigint,text) from public; grant execute on function public.soul_admin_adjust_balance(text,bigint,text) to authenticated;
revoke all on function public.soul_admin_set_entitlement(text,text,text,integer,text) from public; grant execute on function public.soul_admin_set_entitlement(text,text,text,integer,text) to authenticated;
revoke all on function public.soul_admin_get_account(text) from public; grant execute on function public.soul_admin_get_account(text) to authenticated;
revoke all on function public.soul_character_capacity(uuid) from public,anon,authenticated;
revoke all on function public.soul_table_capacity(uuid) from public,anon,authenticated;
revoke all on function public.soul_has_expansion(uuid,text) from public,anon,authenticated;

commit;


-- ============================================================================
-- FICHAS V2.5.3 :: supabase-character-minimum-v2.5.3-migration.sql
-- ============================================================================
-- Mundos Sombrios V2.5.3
-- Imortalização mínima universal para Êxodo e Ocultatun.
-- Pré-requisitos de conteúdo: Nome + Expansão/Origem + Classe.
-- Requer a Soul Economy V2.5 já instalada para manter slots e entitlements server-side.

begin;

create or replace function public.save_character_secure(
  p_id text,
  p_name text,
  p_mode text,
  p_nature text,
  p_class_name text,
  p_payload jsonb
) returns public.characters
language plpgsql
security definer
set search_path=public
as $$
declare
  v_character public.characters;
  v_existing public.characters;
  v_key text;
  v_count integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  -- Únicos três pré-requisitos editoriais para imortalizar uma ficha.
  if trim(coalesce(p_name,''))='' then raise exception 'CHARACTER_NAME_REQUIRED'; end if;
  if trim(coalesce(p_nature,''))='' then raise exception 'CHARACTER_EXPANSION_REQUIRED'; end if;
  if trim(coalesce(p_class_name,''))='' then raise exception 'CHARACTER_CLASS_REQUIRED'; end if;

  select * into v_existing
  from public.characters
  where id=p_id and user_id=auth.uid()::text;

  v_key:=public.soul_expansion_key_for_nature(p_nature);

  if v_existing.id is null then
    select count(*) into v_count
    from public.characters
    where user_id=auth.uid()::text;

    if v_count>=public.soul_character_capacity(auth.uid()) then
      raise exception 'CHARACTER_SLOT_LIMIT';
    end if;

    if not public.soul_has_expansion(auth.uid(),v_key) then
      raise exception 'EXPANSION_LOCKED:%',coalesce(v_key,'unknown');
    end if;

    insert into public.characters(id,owner_id,user_id,name,mode,nature,class_name,payload)
    values(
      coalesce(nullif(p_id,''),'c-'||gen_random_uuid()::text),
      auth.uid()::text,
      auth.uid()::text,
      trim(p_name),
      coalesce(nullif(p_mode,''),'exodo'),
      p_nature,
      p_class_name,
      coalesce(p_payload,'{}'::jsonb)
    ) returning * into v_character;
  else
    -- Personagens existentes continuam editáveis. Só uma troca para uma expansão
    -- bloqueada é recusada, preservando a política da Soul Economy.
    if v_key is not null
       and v_key is distinct from public.soul_expansion_key_for_nature(v_existing.nature)
       and not public.soul_has_expansion(auth.uid(),v_key) then
      raise exception 'EXPANSION_LOCKED:%',v_key;
    end if;

    insert into public.character_versions(character_id,owner_id,version_no,snapshot)
    select v_existing.id,auth.uid(),coalesce(max(version_no),0)+1,v_existing.payload
    from public.character_versions
    where character_id=v_existing.id;

    update public.characters
    set name=trim(p_name),
        mode=coalesce(nullif(p_mode,''),mode),
        nature=p_nature,
        class_name=p_class_name,
        payload=coalesce(p_payload,'{}'::jsonb),
        updated_at=now()
    where id=v_existing.id
    returning * into v_character;
  end if;

  perform public.soul_check_achievements(auth.uid());
  return v_character;
end;
$$;

revoke all on function public.save_character_secure(text,text,text,text,text,jsonb) from public;
grant execute on function public.save_character_secure(text,text,text,text,text,jsonb) to authenticated;

commit;


-- ============================================================================
-- ATLAS V2.6 :: supabase-atlas-v2.6-migration.sql
-- ============================================================================
-- Mundos Sombrios — Atlas Global / Segurança v2.6.0
-- Executar após supabase-online-migration.sql (e demais migrações da instalação).
--
-- Objetivos:
-- 1) manter site_settings públicos já existentes legíveis pelo portal;
-- 2) restringir qualquer chave `master_shield_*` a Mestre/ADM;
-- 3) manter escrita em site_settings exclusiva do ADM;
-- 4) permitir que somente Mestre/ADM crie solicitações cartográficas;
-- 5) manter aprovação/rejeição de solicitações exclusiva do ADM.
--
-- IMPORTANTE: current_profile_role() já é criada pela migração online do projeto,
-- com EXECUTE concedido somente a authenticated.

alter table public.site_settings enable row level security;
alter table public.admin_requests enable row level security;

-- Grants explícitos: grants definem quais operações alcançam a tabela;
-- as policies abaixo definem quais linhas cada operação pode alcançar.
revoke all on table public.site_settings from anon, authenticated;
grant select on table public.site_settings to anon, authenticated;
grant insert, update, delete on table public.site_settings to authenticated;

revoke all on table public.admin_requests from anon, authenticated;
grant select, insert, update on table public.admin_requests to authenticated;

-- -----------------------------------------------------------------------------
-- SITE_SETTINGS
-- -----------------------------------------------------------------------------
-- Remove as políticas antigas/anteriores que podem conflitar por serem permissivas.
drop policy if exists ms_site_settings_select on public.site_settings;
drop policy if exists ms_site_settings_public_select on public.site_settings;
drop policy if exists ms_site_settings_shield_select on public.site_settings;
drop policy if exists ms_site_settings_write on public.site_settings;
drop policy if exists ms_site_settings_insert on public.site_settings;
drop policy if exists ms_site_settings_update on public.site_settings;
drop policy if exists ms_site_settings_delete on public.site_settings;

-- Configurações que NÃO pertencem ao Escudo continuam disponíveis ao portal.
create policy ms_site_settings_public_select
on public.site_settings
for select
to anon, authenticated
using (key not like 'master_shield_%');

-- Estado cartográfico/econômico do Escudo só pode ser lido por Mestre ou ADM.
create policy ms_site_settings_shield_select
on public.site_settings
for select
to authenticated
using ((select public.current_profile_role()) in ('mestre','admin'));

-- Escrita continua exclusiva do ADM, inclusive quando feita por upsert.
create policy ms_site_settings_insert
on public.site_settings
for insert
to authenticated
with check ((select public.current_profile_role())='admin');

create policy ms_site_settings_update
on public.site_settings
for update
to authenticated
using ((select public.current_profile_role())='admin')
with check ((select public.current_profile_role())='admin');

create policy ms_site_settings_delete
on public.site_settings
for delete
to authenticated
using ((select public.current_profile_role())='admin');

-- -----------------------------------------------------------------------------
-- ADMIN_REQUESTS
-- -----------------------------------------------------------------------------
drop policy if exists ms_admin_requests_select on public.admin_requests;
drop policy if exists ms_admin_requests_insert on public.admin_requests;
drop policy if exists ms_admin_requests_update on public.admin_requests;

-- Cada usuário vê os próprios pedidos; ADM vê todos.
create policy ms_admin_requests_select
on public.admin_requests
for select
to authenticated
using (
  user_id=(select auth.uid())::text
  or (select public.current_profile_role())='admin'
);

-- O usuário só pode criar pedido em seu próprio nome. Solicitações do Atlas são
-- aceitas somente quando o perfil atual é Mestre ou ADM.
create policy ms_admin_requests_insert
on public.admin_requests
for insert
to authenticated
with check (
  user_id=(select auth.uid())::text
  and (
    coalesce(data->>'type','') <> 'atlas_change'
    or (select public.current_profile_role()) in ('mestre','admin')
  )
);

-- Status/aprovação/rejeição é responsabilidade do ADM.
create policy ms_admin_requests_update
on public.admin_requests
for update
to authenticated
using ((select public.current_profile_role())='admin')
with check ((select public.current_profile_role())='admin');


-- ============================================================================
-- SESSÃO V2.7.3 :: supabase-table-session-v2.7.3-migration.sql
-- ============================================================================
-- Mundos Sombrios V2.7.3 — hardening do Multiplayer Core V3
-- Execute DEPOIS de supabase-table-session-v2.7-migration.sql.
-- Não recria dados e não exige reset de mesas.
begin;

create or replace function public.append_table_event_v3(
  p_table_id text,
  p_event_type text,
  p_payload jsonb default '{}'::jsonb,
  p_client_event_id uuid default gen_random_uuid()
)
returns public.table_events
language plpgsql
security definer
set search_path=public
as $$
declare
  v public.table_events;
  v_type text:=trim(coalesce(p_event_type,''));
  v_payload jsonb:=coalesce(p_payload,'{}'::jsonb);
  v_status text;
  v_sender text;
  v_character_id text;
  v_profile_id text;
  v_manager boolean:=false;
begin
  if not public.can_access_table_session(p_table_id) then raise exception 'TABLE_ACCESS_REQUIRED'; end if;
  select status into v_status from public.tables where id=p_table_id;
  if v_status is null then raise exception 'TABLE_NOT_FOUND'; end if;
  if v_status='archived' then raise exception 'TABLE_NOT_LIVE'; end if;
  v_manager:=public.can_manage_table(p_table_id);
  if v_status='paused' and not v_manager then raise exception 'TABLE_PAUSED'; end if;
  if length(v_type)<1 or length(v_type)>64 then raise exception 'INVALID_EVENT_TYPE'; end if;

  if v_type in ('chat','dice','token_add','token_move','token_remove') then
    null;
  elsif v_type in ('control','scene','master_notice','reveal') then
    if not v_manager then raise exception 'GM_EVENT_REQUIRED'; end if;
  else
    -- Eventos de sistema (table_deleted/table_status/table_refresh etc.)
    -- só podem nascer em RPCs/triggers dedicados.
    raise exception 'EVENT_TYPE_NOT_ALLOWED';
  end if;

  -- Totem criado por jogador só pode representar o personagem vinculado à própria mesa.
  -- Identificadores de propriedade são reescritos no servidor e não confiados ao navegador.
  if v_type='token_add' then
    if jsonb_typeof(v_payload->'token')<>'object' or coalesce(v_payload->>'tokenId','')='' then raise exception 'INVALID_TOKEN'; end if;
    select p.id into v_profile_id from public.profiles p where p.auth_user_id=auth.uid() limit 1;
    if not v_manager then
      select tm.character_id into v_character_id from public.table_members tm where tm.table_id=p_table_id and tm.user_id=auth.uid() and tm.status='active' limit 1;
      if v_character_id is null or coalesce(v_payload->>'characterId','')<>v_character_id then raise exception 'TOKEN_CHARACTER_REQUIRED'; end if;
      v_payload:=jsonb_set(v_payload,'{characterId}',to_jsonb(v_character_id),true);
      v_payload:=jsonb_set(v_payload,'{token,characterId}',to_jsonb(v_character_id),true);
      v_payload:=jsonb_set(v_payload,'{token,owner}',to_jsonb('player'::text),true);
    end if;
    v_payload:=jsonb_set(v_payload,'{token,ownerAuthId}',to_jsonb(auth.uid()::text),true);
    v_payload:=jsonb_set(v_payload,'{token,ownerId}',to_jsonb(coalesce(v_profile_id,'')),true);
  end if;
  if v_type in ('token_add','token_move','token_remove') then
    if coalesce(v_payload->>'tokenId','')='' then raise exception 'INVALID_TOKEN'; end if;
    v_payload:=jsonb_set(v_payload,'{actorCanManage}',to_jsonb(v_manager),true);
  end if;

  -- O nome em chat/dado vem do vínculo autenticado, não do payload do navegador.
  if v_type in ('chat','dice') then
    select coalesce(nullif(c.name,''),nullif(p.username,''),'Jogador')
      into v_sender
    from public.profiles p
    left join public.table_members tm
      on tm.table_id=p_table_id and tm.user_id=p.auth_user_id and tm.status='active'
    left join public.characters c on c.id=tm.character_id
    where p.auth_user_id=auth.uid()
    limit 1;
    v_payload:=jsonb_set(v_payload,'{sender}',to_jsonb(coalesce(v_sender,'Jogador')),true);
  end if;

  insert into public.table_events(table_id,event_type,payload,actor_id,client_event_id,schema_version)
  values(p_table_id,v_type,v_payload,auth.uid(),p_client_event_id,3)
  on conflict (table_id,client_event_id) where client_event_id is not null do nothing
  returning * into v;

  if v.id is null then
    select * into v from public.table_events
    where table_id=p_table_id and client_event_id=p_client_event_id
    limit 1;
  end if;
  return v;
end;
$$;
revoke all on function public.append_table_event_v3(text,text,jsonb,uuid) from public;
grant execute on function public.append_table_event_v3(text,text,jsonb,uuid) to authenticated;

-- Corrige RPCs legados que ainda comparavam owner_id (profile.id) com auth.uid().
create or replace function public.update_table_settings_secure(p_table_id text,p_settings jsonb)
returns public.tables language plpgsql security definer set search_path=public
as $$
declare v public.tables;
begin
  if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
  update public.tables set settings=coalesce(p_settings,'{}'::jsonb),updated_at=now()
  where id=p_table_id returning * into v;
  if v.id is null then raise exception 'TABLE_NOT_FOUND'; end if;
  return v;
end;
$$;
revoke all on function public.update_table_settings_secure(text,jsonb) from public;
grant execute on function public.update_table_settings_secure(text,jsonb) to authenticated;

create or replace function public.create_table_invite(p_table_id text,p_expires_at timestamptz default null,p_max_uses integer default 0)
returns public.table_invites language plpgsql security definer set search_path=public
as $$
declare v public.table_invites; c text;
begin
  if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
  if exists(select 1 from public.tables where id=p_table_id and status='archived') then raise exception 'TABLE_NOT_LIVE'; end if;
  c := 'MS-'||upper(encode(gen_random_bytes(5),'hex'));
  insert into public.table_invites(table_id,code,created_by,expires_at,max_uses)
  values(p_table_id,c,auth.uid(),p_expires_at,greatest(coalesce(p_max_uses,0),0)) returning * into v;
  return v;
end;
$$;
revoke all on function public.create_table_invite(text,timestamptz,integer) from public;
grant execute on function public.create_table_invite(text,timestamptz,integer) to authenticated;

create or replace function public.set_table_member_role(p_table_id text,p_user_id uuid,p_role text)
returns boolean language plpgsql security definer set search_path=public
as $$
begin
  if not exists(
    select 1 from public.tables tb
    where tb.id=p_table_id and (
      tb.owner_id=(select id from public.profiles where auth_user_id=auth.uid() limit 1)
      or public.current_profile_role()='admin'
    )
  ) then raise exception 'OWNER_REQUIRED'; end if;
  if p_role not in ('co_mestre','observador','jogador') then raise exception 'INVALID_MEMBER_ROLE'; end if;
  update public.table_members set member_role=p_role,updated_at=now()
  where table_id=p_table_id and user_id=p_user_id and member_role<>'mestre';
  return found;
end;
$$;
revoke all on function public.set_table_member_role(text,uuid,text) from public;
grant execute on function public.set_table_member_role(text,uuid,text) to authenticated;

commit;


-- ============================================================================
-- AUTH V2.8.1 :: supabase-auth-v2.8.1-migration.sql
-- ============================================================================
-- Mundos Sombrios V2.8.1 — Correção de autenticação e vínculo de perfis
-- Aplicar APÓS as migrações V2.8.0. Idempotente.
begin;

alter table public.profiles add column if not exists auth_user_id uuid unique;

-- Vincula perfis legados a contas Auth pelo e-mail sem alterar role/status/id.
update public.profiles p
set auth_user_id = u.id,
    updated_at = now()
from auth.users u
where p.auth_user_id is null
  and p.email is not null
  and u.email is not null
  and lower(trim(p.email)) = lower(trim(u.email))
  and not exists (
    select 1 from public.profiles other
    where other.auth_user_id = u.id and other.id <> p.id
  );

-- Garante perfil mínimo para contas Auth que nunca receberam uma linha em profiles.
insert into public.profiles(id, auth_user_id, username, email, role, banned, status, data)
select u.id::text,
       u.id,
       coalesce(nullif(trim(u.raw_user_meta_data->>'username'),''), split_part(u.email,'@',1), 'jogador'),
       u.email,
       'jogador', false, 'active', jsonb_build_object('auth_source','supabase','repaired_by','v2.8.1')
from auth.users u
where not exists (select 1 from public.profiles p where p.auth_user_id=u.id)
on conflict do nothing;

-- Resolve login legado por username. Mantido por compatibilidade; o frontend também aceita e-mail direto.
create or replace function public.resolve_login_email(p_identifier text)
returns text
language sql
security definer
set search_path = public
as $$
  select email
  from public.profiles
  where email is not null
    and (lower(username)=lower(trim(p_identifier)) or lower(email)=lower(trim(p_identifier)))
    and coalesce(banned,false)=false
    and coalesce(status,'active') <> 'banned'
  limit 1;
$$;
revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;

-- Recupera/vincula o perfil do usuário autenticado preservando papéis administrativos existentes.
create or replace function public.ensure_current_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(coalesce(auth.jwt()->>'email','')));
  v_username text := nullif(trim(coalesce(auth.jwt()->'user_metadata'->>'username','')), '');
  v_profile public.profiles;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_profile from public.profiles where auth_user_id=v_uid limit 1;
  if v_profile.id is not null then return v_profile; end if;

  if v_email <> '' then
    if exists(select 1 from public.profiles where lower(trim(coalesce(email,'')))=v_email and auth_user_id is not null and auth_user_id<>v_uid) then
      raise exception 'PROFILE_EMAIL_CONFLICT';
    end if;

    select * into v_profile
    from public.profiles
    where auth_user_id is null and lower(trim(coalesce(email,'')))=v_email
    order by created_at asc
    limit 1
    for update;

    if v_profile.id is not null then
      update public.profiles
      set auth_user_id=v_uid, updated_at=now()
      where id=v_profile.id
      returning * into v_profile;
      return v_profile;
    end if;
  end if;

  insert into public.profiles(id,auth_user_id,username,email,role,banned,status,data)
  values(v_uid::text,v_uid,coalesce(v_username,nullif(split_part(v_email,'@',1),''),'jogador'),nullif(v_email,''),'jogador',false,'active',jsonb_build_object('auth_source','supabase','created_by','ensure_current_profile'))
  on conflict (auth_user_id) do update set updated_at=now()
  returning * into v_profile;
  return v_profile;
end;
$$;
revoke all on function public.ensure_current_profile() from public;
grant execute on function public.ensure_current_profile() to authenticated;

commit;


-- ============================================================================
-- BUGFIX V2.8.2 :: supabase-bugfix-v2.8.2-migration.sql
-- ============================================================================
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


-- ============================================================================
-- DIRETÓRIO DE MESAS V2.8 :: supabase-table-directory-v2.8-migration.sql
-- ============================================================================
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


-- ============================================================================
-- BUGFIX V2.8.6 :: supabase-bugfix-v2.8.6-migration.sql
-- ============================================================================
-- Mundos Sombrios V2.8.6 — criação idempotente de Fendas
-- Aplicação opcional/manual no Supabase existente. Não é necessária para o sandbox offline.
begin;

create or replace function public.create_table_secure(p_id text, p_code text, p_name text, p_theme text, p_game_mode text, p_settings jsonb default '{}'::jsonb)
returns public.tables
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table public.tables;
  v_user text;
  v_id text;
  v_created boolean := false;
begin
  v_user := (select id from public.profiles where auth_user_id=auth.uid() and banned=false and role in ('mestre','admin'));
  if v_user is null then raise exception 'GM_REQUIRED'; end if;

  v_id := coalesce(nullif(trim(p_id),''), gen_random_uuid()::text);
  insert into public.tables(id,code,name,theme,game_mode,owner_id,participants,banned,settings)
  values(v_id, upper(trim(p_code)), trim(p_name), coalesce(p_theme,'default'), coalesce(p_game_mode,'exodo'), v_user, '[]'::jsonb, '[]'::jsonb, coalesce(p_settings,'{}'::jsonb))
  on conflict (id) do nothing
  returning * into v_table;

  if v_table.id is null then
    select * into v_table from public.tables where id=v_id;
    if v_table.id is null or v_table.owner_id <> v_user then raise exception 'TABLE_ID_CONFLICT'; end if;
  else
    v_created := true;
  end if;

  insert into public.table_members(table_id,user_id,member_role)
  values(v_table.id, auth.uid(), 'mestre') on conflict do nothing;

  if v_created then
    update public.tables
       set participants=jsonb_build_array(jsonb_build_object('userId',auth.uid()::text,'charId',null,'charName',(select username from public.profiles where auth_user_id=auth.uid()),'ownerId',v_user,'isOwner',true,'linkedAt',extract(epoch from now())*1000))
     where id=v_table.id
     returning * into v_table;
  end if;

  insert into public.table_state(table_id,state) values(v_table.id,'{}'::jsonb) on conflict do nothing;
  return v_table;
end;
$$;

revoke all on function public.create_table_secure(text,text,text,text,text,jsonb) from public;
grant execute on function public.create_table_secure(text,text,text,text,text,jsonb) to authenticated;

commit;


-- ============================================================================
-- ONLINE V2.8.7 :: supabase-v2.8.7-online-fixes.sql
-- ============================================================================
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


-- ============================================================================
-- CATEGORIA OBRIGATÓRIA V2.8.8 :: supabase-v2.8.8-category-required.sql
-- ============================================================================
-- Mundos Sombrios V2.8.8 — Categoria obrigatória na imortalização
begin;
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


-- ============================================================================
-- LIVE PATCH V2.8.8 :: supabase-v2.8.8-live-patch.sql
-- ============================================================================
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


-- ============================================================================
-- PROGRESSÃO V2.8.9 :: supabase-progression-v2.8.9-migration.sql
-- ============================================================================
-- Mundos Sombrios V2.8.9 — Governança de Fichas e Evolução Gradual
-- Requer: supabase-production.sql + supabase-soul-economy-v2.5-migration.sql + migrações de mesas V2.8.
-- Autoridade: Supabase. Nenhum saldo, evolução ou recurso protegido é confiado ao navegador.
begin;

create schema if not exists private;

create table if not exists public.progression_config (
  singleton boolean primary key default true check (singleton),
  souldrakma_per_point bigint not null default 1000 check (souldrakma_per_point >= 1),
  purchase_min integer not null default 1 check (purchase_min >= 1),
  purchase_max integer not null default 200 check (purchase_max >= purchase_min),
  updated_at timestamptz not null default now()
);
insert into public.progression_config(singleton) values(true) on conflict(singleton) do nothing;

create table if not exists public.table_progression_wallets (
  table_id text primary key references public.tables(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_purchased integer not null default 0 check (lifetime_purchased >= 0),
  lifetime_admin_granted integer not null default 0 check (lifetime_admin_granted >= 0),
  lifetime_distributed integer not null default 0 check (lifetime_distributed >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.character_progression_accounts (
  table_id text not null references public.tables(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_granted integer not null default 0 check (lifetime_granted >= 0),
  lifetime_spent integer not null default 0 check (lifetime_spent >= 0),
  career_progress integer not null default 0 check (career_progress >= 0),
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key(table_id,character_id)
);
create index if not exists idx_character_progression_user on public.character_progression_accounts(user_id,table_id);

create table if not exists public.progression_transactions (
  id bigint generated always as identity primary key,
  table_id text not null references public.tables(id) on delete cascade,
  character_id text references public.characters(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  amount integer not null,
  balance_after integer,
  tx_type text not null check (tx_type in (
    'SOUL_PURCHASE','ADMIN_TABLE_GRANT','ADMIN_TABLE_REMOVE','TABLE_GRANT_DEBIT','CHARACTER_GRANT',
    'CHARACTER_GRANT_REVERSAL','ATTRIBUTE_UPGRADE','PROPOSAL_SPEND','RESOURCE_ADJUST','RESOURCE_REQUEST_APPROVED','SYSTEM'
  )),
  reason text not null default '',
  reference_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_progression_tx_table_created on public.progression_transactions(table_id,created_at desc);
create index if not exists idx_progression_tx_char_created on public.progression_transactions(character_id,created_at desc);

create table if not exists public.progression_proposals (
  id uuid primary key default gen_random_uuid(),
  table_id text not null references public.tables(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  proposed_payload jsonb not null,
  requested_cost integer not null check (requested_cost > 0),
  final_cost integer,
  note text not null default '',
  status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_progression_proposals_table on public.progression_proposals(table_id,status,created_at desc);

create table if not exists public.character_resource_requests (
  id uuid primary key default gen_random_uuid(),
  table_id text not null references public.tables(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_key text not null,
  delta numeric not null,
  reason text not null default '',
  status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
  decision_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_resource_requests_table on public.character_resource_requests(table_id,status,created_at desc);

alter table public.progression_config enable row level security;
alter table public.table_progression_wallets enable row level security;
alter table public.character_progression_accounts enable row level security;
alter table public.progression_transactions enable row level security;
alter table public.progression_proposals enable row level security;
alter table public.character_resource_requests enable row level security;
revoke all on public.progression_config,public.table_progression_wallets,public.character_progression_accounts,public.progression_transactions,public.progression_proposals,public.character_resource_requests from anon,authenticated;

create or replace function private.character_mechanics_snapshot(p_payload jsonb)
returns jsonb language sql immutable set search_path=public,private as $$
  select coalesce(p_payload,'{}'::jsonb) - array['name','avatar','gallery','concept','updatedAt','createdAt','lastViewedAt'];
$$;
revoke all on function private.character_mechanics_snapshot(jsonb) from public,anon,authenticated;


create or replace function private.character_merge_narrative(p_base jsonb,p_incoming jsonb,p_name text)
returns jsonb language sql immutable set search_path=public,private as $$
  select coalesce(p_base,'{}'::jsonb)
    || jsonb_build_object(
      'name',coalesce(nullif(trim(p_name),''),coalesce(p_base->>'name','Personagem')),
      'avatar',coalesce(p_incoming->'avatar',p_base->'avatar','null'::jsonb),
      'gallery',coalesce(p_incoming->'gallery',p_base->'gallery','[]'::jsonb),
      'concept',coalesce(p_incoming->'concept',p_base->'concept','{}'::jsonb),
      'updatedAt',to_jsonb(now()::text)
    );
$$;
revoke all on function private.character_merge_narrative(jsonb,jsonb,text) from public,anon,authenticated;

create or replace function private.ensure_progression_wallet(p_table_id text)
returns public.table_progression_wallets language plpgsql security definer set search_path=public,private as $$
declare w public.table_progression_wallets;
begin
  insert into public.table_progression_wallets(table_id) values(p_table_id) on conflict(table_id) do nothing;
  select * into w from public.table_progression_wallets where table_id=p_table_id;
  return w;
end; $$;
revoke all on function private.ensure_progression_wallet(text) from public,anon,authenticated;

create or replace function private.character_in_table(p_table_id text,p_character_id text,p_user uuid default null)
returns boolean language sql stable security definer set search_path=public,private as $$
  select exists(
    select 1 from public.table_members tm
    join public.characters c on c.id=tm.character_id
    where tm.table_id=p_table_id and tm.character_id=p_character_id and tm.status='active'
      and (p_user is null or tm.user_id=p_user)
  );
$$;
revoke all on function private.character_in_table(text,text,uuid) from public,anon,authenticated;

-- Ficha criada = mecânica selada. Atualizações comuns posteriores só podem alterar campos narrativos.
create or replace function public.save_character_secure(
  p_id text, p_name text, p_mode text, p_nature text, p_class_name text, p_payload jsonb
) returns public.characters
language plpgsql security definer set search_path=public,private
as $$
declare v_character public.characters;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if trim(coalesce(p_name,''))='' then raise exception 'CHARACTER_NAME_REQUIRED'; end if;
  if trim(coalesce(p_payload->>'category',p_payload#>>'{concept,category}',''))='' then raise exception 'CHARACTER_CATEGORY_REQUIRED'; end if;
  if trim(coalesce(p_nature,''))='' then raise exception 'CHARACTER_EXPANSION_REQUIRED'; end if;
  if trim(coalesce(p_class_name,''))='' then raise exception 'CHARACTER_CLASS_REQUIRED'; end if;

  select * into v_character from public.characters where id=p_id and user_id=auth.uid()::text for update;
  if v_character.id is null then
    p_payload:=jsonb_set(coalesce(p_payload,'{}'::jsonb),'{progression}',coalesce(p_payload->'progression','{}'::jsonb)||jsonb_build_object('locked',true,'createdInCampaign',false),true);
    insert into public.characters(id,owner_id,user_id,name,mode,nature,class_name,payload)
    values(coalesce(nullif(p_id,''),'c-'||gen_random_uuid()::text),auth.uid()::text,auth.uid()::text,trim(p_name),coalesce(nullif(p_mode,''),'exodo'),p_nature,p_class_name,p_payload)
    returning * into v_character;
  else
    if coalesce(nullif(p_mode,''),v_character.mode)<>v_character.mode
       or coalesce(p_nature,'')<>coalesce(v_character.nature,'')
       or coalesce(p_class_name,'')<>coalesce(v_character.class_name,'')
    then raise exception 'CHARACTER_ARCHETYPE_LOCKED'; end if;
    insert into public.character_versions(character_id,owner_id,version_no,snapshot)
      select v_character.id,auth.uid(),coalesce(max(version_no),0)+1,v_character.payload from public.character_versions where character_id=v_character.id;
    update public.characters
      set name=trim(p_name),payload=private.character_merge_narrative(v_character.payload,coalesce(p_payload,'{}'::jsonb),p_name),updated_at=now()
      where id=v_character.id returning * into v_character;
  end if;
  return v_character;
end; $$;
revoke all on function public.save_character_secure(text,text,text,text,text,jsonb) from public;
grant execute on function public.save_character_secure(text,text,text,text,text,jsonb) to authenticated;

-- Edição antiga do Mestre passa a obedecer a mesma trava; mecânica usa RPCs de progressão/recursos.
create or replace function public.gm_update_character(
  p_table_id text,p_character_id text,p_name text,p_mode text,p_nature text,p_class_name text,p_payload jsonb
) returns public.characters
language plpgsql security definer set search_path=public,private as $$
declare v public.characters;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
  if not private.character_in_table(p_table_id,p_character_id,null) then raise exception 'CHARACTER_NOT_IN_TABLE'; end if;
  select * into v from public.characters where id=p_character_id for update;
  if v.id is null then raise exception 'CHARACTER_NOT_FOUND'; end if;
  if coalesce(nullif(p_mode,''),v.mode)<>v.mode or coalesce(p_nature,'')<>coalesce(v.nature,'') or coalesce(p_class_name,'')<>coalesce(v.class_name,'')
  then raise exception 'USE_PROGRESSION_OR_RESOURCE_CONTROL'; end if;
  insert into public.character_versions(character_id,owner_id,version_no,snapshot)
    select v.id,coalesce((select p.auth_user_id from public.profiles p where p.id=v.owner_id limit 1),v.user_id::uuid),coalesce(max(version_no),0)+1,v.payload from public.character_versions where character_id=v.id;
  update public.characters set name=trim(coalesce(p_name,name)),payload=private.character_merge_narrative(v.payload,coalesce(p_payload,'{}'::jsonb),coalesce(p_name,v.name)),updated_at=now() where id=p_character_id returning * into v;
  return v;
end; $$;
revoke all on function public.gm_update_character(text,text,text,text,text,text,jsonb) from public;
grant execute on function public.gm_update_character(text,text,text,text,text,text,jsonb) to authenticated;

create or replace function public.progression_table_state(p_table_id text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare w public.table_progression_wallets; managed boolean; my_char text; my_account jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.can_access_table_session(p_table_id) and not public.can_manage_table(p_table_id) then raise exception 'TABLE_ACCESS_REQUIRED'; end if;
  select * into w from private.ensure_progression_wallet(p_table_id);
  managed:=public.can_manage_table(p_table_id);
  select tm.character_id into my_char from public.table_members tm where tm.table_id=p_table_id and tm.user_id=auth.uid() and tm.status='active' limit 1;
  if my_char is not null then
    insert into public.character_progression_accounts(table_id,character_id,user_id)
      values(p_table_id,my_char,auth.uid()) on conflict(table_id,character_id) do nothing;
    select to_jsonb(a) into my_account from public.character_progression_accounts a where a.table_id=p_table_id and a.character_id=my_char;
  end if;
  return jsonb_build_object(
    'managed',managed,
    'wallet',case when managed then to_jsonb(w) else null end,
    'myAccount',my_account,
    'accounts',case when managed then (select coalesce(jsonb_agg(jsonb_build_object('character_id',a.character_id,'user_id',a.user_id,'balance',a.balance,'lifetime_granted',a.lifetime_granted,'lifetime_spent',a.lifetime_spent,'career_progress',a.career_progress,'name',c.name) order by c.name),'[]'::jsonb) from public.character_progression_accounts a join public.characters c on c.id=a.character_id where a.table_id=p_table_id) else '[]'::jsonb end,
    'pendingProposals',case when managed then (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]'::jsonb) from public.progression_proposals x where x.table_id=p_table_id and x.status='pending') else '[]'::jsonb end,
    'pendingResources',case when managed then (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]'::jsonb) from public.character_resource_requests x where x.table_id=p_table_id and x.status='pending') else '[]'::jsonb end,
    'recentTransactions',case when managed then (select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]'::jsonb) from (select * from public.progression_transactions x where x.table_id=p_table_id order by x.created_at desc limit 20) q) else '[]'::jsonb end,
    'config',(select to_jsonb(c) from public.progression_config c where c.singleton=true)
  );
end; $$;
revoke all on function public.progression_table_state(text) from public;
grant execute on function public.progression_table_state(text) to authenticated;

create or replace function public.progression_buy_table_points(p_table_id text,p_points integer)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare cfg public.progression_config; w public.table_progression_wallets; cost bigint; soul_balance bigint;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
  select * into cfg from public.progression_config where singleton=true;
  if p_points<cfg.purchase_min or p_points>cfg.purchase_max then raise exception 'INVALID_POINT_AMOUNT'; end if;
  cost:=p_points::bigint*cfg.souldrakma_per_point;
  soul_balance:=public.soul_add_transaction(auth.uid(),-cost,'PURCHASE','evolution-gradual',p_table_id,jsonb_build_object('table_id',p_table_id,'points',p_points,'unit_price',cfg.souldrakma_per_point),null);
  perform private.ensure_progression_wallet(p_table_id);
  update public.table_progression_wallets set balance=balance+p_points,lifetime_purchased=lifetime_purchased+p_points,updated_at=now() where table_id=p_table_id returning * into w;
  insert into public.progression_transactions(table_id,actor_id,amount,balance_after,tx_type,reason,metadata)
    values(p_table_id,auth.uid(),p_points,w.balance,'SOUL_PURCHASE','Compra de reserva com SoulDrakma',jsonb_build_object('souldrakma_cost',cost,'soul_balance_after',soul_balance));
  return jsonb_build_object('wallet',to_jsonb(w),'souldrakmaCost',cost,'soulBalance',soul_balance);
end; $$;
revoke all on function public.progression_buy_table_points(text,integer) from public;
grant execute on function public.progression_buy_table_points(text,integer) to authenticated;

create or replace function public.progression_grant_character(p_table_id text,p_character_id text,p_amount integer,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare w public.table_progression_wallets; a public.character_progression_accounts; u uuid; txid bigint;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
  if p_amount<=0 or trim(coalesce(p_reason,''))='' then raise exception 'AMOUNT_AND_REASON_REQUIRED'; end if;
  if not private.character_in_table(p_table_id,p_character_id,null) then raise exception 'CHARACTER_NOT_IN_TABLE'; end if;
  select c.user_id::uuid into u from public.characters c where c.id=p_character_id;
  perform private.ensure_progression_wallet(p_table_id);
  update public.table_progression_wallets set balance=balance-p_amount,lifetime_distributed=lifetime_distributed+p_amount,updated_at=now()
    where table_id=p_table_id and balance>=p_amount returning * into w;
  if w.table_id is null then raise exception 'INSUFFICIENT_TABLE_PROGRESSION'; end if;
  insert into public.character_progression_accounts(table_id,character_id,user_id,balance,lifetime_granted,career_progress)
    values(p_table_id,p_character_id,u,p_amount,p_amount,0)
    on conflict(table_id,character_id) do update set balance=public.character_progression_accounts.balance+p_amount,lifetime_granted=public.character_progression_accounts.lifetime_granted+p_amount,updated_at=now()
    returning * into a;
  insert into public.progression_transactions(table_id,actor_id,amount,balance_after,tx_type,reason,metadata)
    values(p_table_id,auth.uid(),-p_amount,w.balance,'TABLE_GRANT_DEBIT',trim(p_reason),jsonb_build_object('character_id',p_character_id));
  insert into public.progression_transactions(table_id,character_id,actor_id,target_user_id,amount,balance_after,tx_type,reason)
    values(p_table_id,p_character_id,auth.uid(),u,p_amount,a.balance,'CHARACTER_GRANT',trim(p_reason)) returning id into txid;
  return jsonb_build_object('wallet',to_jsonb(w),'account',to_jsonb(a),'transactionId',txid,'targetUserId',u);
end; $$;
revoke all on function public.progression_grant_character(text,text,integer,text) from public;
grant execute on function public.progression_grant_character(text,text,integer,text) to authenticated;


-- Sucessos de Carreira de Ocultatun sÃ£o histÃ³ricos de prÃ¡tica real e NÃO sÃ£o comprados com SoulDrakma.
-- O Mestre/ADM registra estes pontos separadamente da carteira PEG.
create or replace function public.progression_record_career_success(p_table_id text,p_character_id text,p_amount integer,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare a public.character_progression_accounts; u uuid; mode_name text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
  if p_amount<=0 or p_amount>20 or trim(coalesce(p_reason,''))='' then raise exception 'INVALID_CAREER_PROGRESS'; end if;
  if not private.character_in_table(p_table_id,p_character_id,null) then raise exception 'CHARACTER_NOT_IN_TABLE'; end if;
  select c.user_id::uuid,c.mode into u,mode_name from public.characters c where c.id=p_character_id;
  if lower(coalesce(mode_name,''))<>'ocultatun' then raise exception 'OCULTATUN_ONLY'; end if;
  insert into public.character_progression_accounts(table_id,character_id,user_id,career_progress)
    values(p_table_id,p_character_id,u,p_amount)
    on conflict(table_id,character_id) do update set career_progress=public.character_progression_accounts.career_progress+p_amount,updated_at=now()
    returning * into a;
  insert into public.progression_transactions(table_id,character_id,actor_id,target_user_id,amount,balance_after,tx_type,reason,metadata)
    values(p_table_id,p_character_id,auth.uid(),u,p_amount,a.balance,'CAREER_SUCCESS',trim(p_reason),jsonb_build_object('career_progress',a.career_progress));
  return to_jsonb(a);
end; $$;
revoke all on function public.progression_record_career_success(text,text,integer,text) from public;
grant execute on function public.progression_record_career_success(text,text,integer,text) to authenticated;

create or replace function public.progression_reverse_grant(p_transaction_id bigint,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare t public.progression_transactions; a public.character_progression_accounts; w public.table_progression_wallets;
begin
  select * into t from public.progression_transactions where id=p_transaction_id and tx_type='CHARACTER_GRANT' for update;
  if t.id is null then raise exception 'GRANT_NOT_FOUND'; end if;
  if not public.can_manage_table(t.table_id) then raise exception 'GM_REQUIRED'; end if;
  if exists(select 1 from public.progression_transactions x where x.reference_id=t.id::text and x.tx_type='CHARACTER_GRANT_REVERSAL') then raise exception 'ALREADY_REVERSED'; end if;
  update public.character_progression_accounts set balance=balance-t.amount,updated_at=now() where table_id=t.table_id and character_id=t.character_id and balance>=t.amount returning * into a;
  if a.character_id is null then raise exception 'POINTS_ALREADY_SPENT'; end if;
  update public.table_progression_wallets set balance=balance+t.amount,lifetime_distributed=greatest(0,lifetime_distributed-t.amount),updated_at=now() where table_id=t.table_id returning * into w;
  insert into public.progression_transactions(table_id,character_id,actor_id,target_user_id,amount,balance_after,tx_type,reason,reference_id)
    values(t.table_id,t.character_id,auth.uid(),t.target_user_id,-t.amount,a.balance,'CHARACTER_GRANT_REVERSAL',trim(coalesce(p_reason,'Reversão de concessão')),t.id::text);
  return jsonb_build_object('wallet',to_jsonb(w),'account',to_jsonb(a));
end; $$;
revoke all on function public.progression_reverse_grant(bigint,text) from public;
grant execute on function public.progression_reverse_grant(bigint,text) to authenticated;

create or replace function public.progression_upgrade_attribute(p_table_id text,p_character_id text,p_attribute text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare c public.characters; a public.character_progression_accounts; key text; oldv integer; newv integer; cost integer; lvl integer; maxv integer; vno integer;
begin
  key:=lower(trim(coalesce(p_attribute,'')));
  if key not in ('for','vig','agi','int','prn','pre') then raise exception 'INVALID_ATTRIBUTE'; end if;
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.character_in_table(p_table_id,p_character_id,auth.uid()) and not public.can_manage_table(p_table_id) then raise exception 'CHARACTER_MEMBERSHIP_REQUIRED'; end if;
  select * into c from public.characters where id=p_character_id for update;
  if c.id is null then raise exception 'CHARACTER_NOT_FOUND'; end if;
  if not public.can_manage_table(p_table_id) and c.user_id<>auth.uid()::text then raise exception 'CHARACTER_NOT_OWNED'; end if;
  oldv:=coalesce((c.payload->'stats'->>key)::integer,0); newv:=oldv+1;
  if c.mode='ocultatun' then
    begin lvl:=coalesce((c.payload#>>'{progression,existenceLevel}')::integer,5); exception when others then lvl:=5; end;
    maxv:=case lvl when 5 then 4 when 4 then 5 when 3 then 6 when 2 then 7 when 1 then 8 else 10 end;
    cost:=20*newv;
  else
    maxv:=coalesce((c.payload#>>'{progression,maxAttribute}')::integer,6);
    maxv:=least(8,greatest(1,maxv)); cost:=10*greatest(1,newv);
  end if;
  if newv>maxv then raise exception 'ATTRIBUTE_LEVEL_LIMIT'; end if;
  select * into a from public.character_progression_accounts where table_id=p_table_id and character_id=p_character_id for update;
  if a.character_id is null or a.balance<cost then raise exception 'INSUFFICIENT_EVOLUTION_POINTS'; end if;
  select coalesce(max(version_no),0)+1 into vno from public.character_versions where character_id=c.id;
  insert into public.character_versions(character_id,owner_id,version_no,snapshot) values(c.id,c.user_id::uuid,vno,c.payload);
  c.payload:=jsonb_set(c.payload,array['stats',key],to_jsonb(newv),true);
  c.payload:=jsonb_set(c.payload,'{progression,lastTableId}',to_jsonb(p_table_id),true);
  update public.characters set payload=c.payload,updated_at=now() where id=c.id;
  update public.character_progression_accounts set balance=balance-cost,lifetime_spent=lifetime_spent+cost,updated_at=now() where table_id=p_table_id and character_id=p_character_id returning * into a;
  insert into public.progression_transactions(table_id,character_id,actor_id,target_user_id,amount,balance_after,tx_type,reason,metadata)
    values(p_table_id,p_character_id,auth.uid(),c.user_id::uuid,-cost,a.balance,'ATTRIBUTE_UPGRADE','Evolução automática de atributo',jsonb_build_object('attribute',key,'from',oldv,'to',newv,'mode',c.mode));
  return jsonb_build_object('character',to_jsonb(c),'account',to_jsonb(a),'cost',cost,'from',oldv,'to',newv);
end; $$;
revoke all on function public.progression_upgrade_attribute(text,text,text) from public;
grant execute on function public.progression_upgrade_attribute(text,text,text) to authenticated;

create or replace function public.progression_submit_proposal(p_table_id text,p_character_id text,p_payload jsonb,p_requested_cost integer,p_note text)
returns public.progression_proposals language plpgsql security definer set search_path=public,private as $$
declare a public.character_progression_accounts; r public.progression_proposals; c public.characters;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.character_in_table(p_table_id,p_character_id,auth.uid()) then raise exception 'CHARACTER_MEMBERSHIP_REQUIRED'; end if;
  select * into c from public.characters where id=p_character_id and user_id=auth.uid()::text;
  if c.id is null then raise exception 'CHARACTER_NOT_OWNED'; end if;
  select * into a from public.character_progression_accounts where table_id=p_table_id and character_id=p_character_id;
  if p_requested_cost<=0 or a.character_id is null or a.balance<p_requested_cost then raise exception 'INSUFFICIENT_EVOLUTION_POINTS'; end if;
  if private.character_mechanics_snapshot(coalesce(p_payload,'{}'::jsonb))=private.character_mechanics_snapshot(c.payload) then raise exception 'NO_MECHANICAL_CHANGE'; end if;
  insert into public.progression_proposals(table_id,character_id,user_id,proposed_payload,requested_cost,note)
    values(p_table_id,p_character_id,auth.uid(),p_payload,p_requested_cost,left(coalesce(p_note,''),500)) returning * into r;
  return r;
end; $$;
revoke all on function public.progression_submit_proposal(text,text,jsonb,integer,text) from public;
grant execute on function public.progression_submit_proposal(text,text,jsonb,integer,text) to authenticated;

create or replace function public.progression_resolve_proposal(p_proposal_id uuid,p_approved boolean,p_final_cost integer default null,p_reason text default '')
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare r public.progression_proposals; a public.character_progression_accounts; c public.characters; cost integer; vno integer;
begin
  select * into r from public.progression_proposals where id=p_proposal_id for update;
  if r.id is null then raise exception 'PROPOSAL_NOT_FOUND'; end if;
  if not public.can_manage_table(r.table_id) then raise exception 'GM_REQUIRED'; end if;
  if r.status<>'pending' then return jsonb_build_object('proposal',to_jsonb(r)); end if;
  if not p_approved then update public.progression_proposals set status='rejected',decided_by=auth.uid(),decided_at=now() where id=r.id returning * into r; return jsonb_build_object('proposal',to_jsonb(r)); end if;
  cost:=coalesce(p_final_cost,r.requested_cost); if cost<=0 then raise exception 'INVALID_COST'; end if;
  select * into a from public.character_progression_accounts where table_id=r.table_id and character_id=r.character_id for update;
  if a.character_id is null or a.balance<cost then raise exception 'INSUFFICIENT_EVOLUTION_POINTS'; end if;
  select * into c from public.characters where id=r.character_id for update;
  select coalesce(max(version_no),0)+1 into vno from public.character_versions where character_id=c.id;
  insert into public.character_versions(character_id,owner_id,version_no,snapshot) values(c.id,c.user_id::uuid,vno,c.payload);
  update public.characters set payload=jsonb_set(coalesce(r.proposed_payload,'{}'::jsonb),'{progression,lastTableId}',to_jsonb(r.table_id),true),updated_at=now() where id=c.id returning * into c;
  update public.character_progression_accounts set balance=balance-cost,lifetime_spent=lifetime_spent+cost,updated_at=now() where table_id=r.table_id and character_id=r.character_id returning * into a;
  update public.progression_proposals set status='approved',final_cost=cost,decided_by=auth.uid(),decided_at=now() where id=r.id returning * into r;
  insert into public.progression_transactions(table_id,character_id,actor_id,target_user_id,amount,balance_after,tx_type,reason,reference_id,metadata)
    values(r.table_id,r.character_id,auth.uid(),r.user_id,-cost,a.balance,'PROPOSAL_SPEND',coalesce(nullif(trim(p_reason),''),r.note),r.id::text,jsonb_build_object('requested_cost',r.requested_cost,'final_cost',cost));
  return jsonb_build_object('proposal',to_jsonb(r),'character',to_jsonb(c),'account',to_jsonb(a));
end; $$;
revoke all on function public.progression_resolve_proposal(uuid,boolean,integer,text) from public;
grant execute on function public.progression_resolve_proposal(uuid,boolean,integer,text) to authenticated;

create or replace function public.progression_adjust_resource(p_table_id text,p_character_id text,p_resource_key text,p_delta numeric,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare c public.characters; oldv numeric; newv numeric; vno integer; key text;
begin
  if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
  if not private.character_in_table(p_table_id,p_character_id,null) then raise exception 'CHARACTER_NOT_IN_TABLE'; end if;
  key:=trim(coalesce(p_resource_key,'')); if key='' or p_delta=0 or trim(coalesce(p_reason,''))='' then raise exception 'RESOURCE_DELTA_REASON_REQUIRED'; end if;
  select * into c from public.characters where id=p_character_id for update;
  begin oldv:=coalesce((c.payload->'resources'->>key)::numeric,0); exception when others then oldv:=0; end;
  newv:=greatest(0,oldv+p_delta);
  select coalesce(max(version_no),0)+1 into vno from public.character_versions where character_id=c.id;
  insert into public.character_versions(character_id,owner_id,version_no,snapshot) values(c.id,c.user_id::uuid,vno,c.payload);
  c.payload:=jsonb_set(c.payload,array['resources',key],to_jsonb(newv),true);
  update public.characters set payload=c.payload,updated_at=now() where id=c.id;
  insert into public.progression_transactions(table_id,character_id,actor_id,target_user_id,amount,balance_after,tx_type,reason,metadata)
    values(p_table_id,p_character_id,auth.uid(),c.user_id::uuid,0,null,'RESOURCE_ADJUST',trim(p_reason),jsonb_build_object('resource',key,'delta',p_delta,'from',oldv,'to',newv));
  return jsonb_build_object('resource',key,'from',oldv,'to',newv,'character',to_jsonb(c));
end; $$;
revoke all on function public.progression_adjust_resource(text,text,text,numeric,text) from public;
grant execute on function public.progression_adjust_resource(text,text,text,numeric,text) to authenticated;

create or replace function public.progression_request_resource(p_table_id text,p_character_id text,p_resource_key text,p_delta numeric,p_reason text)
returns public.character_resource_requests language plpgsql security definer set search_path=public,private as $$
declare r public.character_resource_requests;
begin
  if not private.character_in_table(p_table_id,p_character_id,auth.uid()) then raise exception 'CHARACTER_MEMBERSHIP_REQUIRED'; end if;
  if p_delta=0 or trim(coalesce(p_resource_key,''))='' or trim(coalesce(p_reason,''))='' then raise exception 'RESOURCE_DELTA_REASON_REQUIRED'; end if;
  insert into public.character_resource_requests(table_id,character_id,user_id,resource_key,delta,reason)
    values(p_table_id,p_character_id,auth.uid(),trim(p_resource_key),p_delta,left(trim(p_reason),500)) returning * into r;
  return r;
end; $$;
revoke all on function public.progression_request_resource(text,text,text,numeric,text) from public;
grant execute on function public.progression_request_resource(text,text,text,numeric,text) to authenticated;

create or replace function public.progression_resolve_resource(p_request_id uuid,p_approved boolean)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare r public.character_resource_requests; result jsonb;
begin
  select * into r from public.character_resource_requests where id=p_request_id for update;
  if r.id is null then raise exception 'REQUEST_NOT_FOUND'; end if;
  if not public.can_manage_table(r.table_id) then raise exception 'GM_REQUIRED'; end if;
  if r.status<>'pending' then return jsonb_build_object('request',to_jsonb(r)); end if;
  if p_approved then result:=public.progression_adjust_resource(r.table_id,r.character_id,r.resource_key,r.delta,r.reason); end if;
  update public.character_resource_requests set status=case when p_approved then 'approved' else 'rejected' end,decision_by=auth.uid(),decided_at=now() where id=r.id returning * into r;
  return jsonb_build_object('request',to_jsonb(r),'result',result);
end; $$;
revoke all on function public.progression_resolve_resource(uuid,boolean) from public;
grant execute on function public.progression_resolve_resource(uuid,boolean) to authenticated;

create or replace function public.progression_admin_tables()
returns table(table_id text,table_name text,game_mode text,status text,owner_username text,balance integer,lifetime_purchased integer,lifetime_admin_granted integer,lifetime_distributed integer)
language plpgsql security definer set search_path=public,private as $$
begin
  if public.current_profile_role()<>'admin' then raise exception 'ADMIN_REQUIRED'; end if;
  insert into public.table_progression_wallets(table_id) select id from public.tables on conflict(table_id) do nothing;
  return query select tb.id,tb.name,tb.game_mode,tb.status,coalesce(p.username,tb.owner_id),w.balance,w.lifetime_purchased,w.lifetime_admin_granted,w.lifetime_distributed
    from public.tables tb join public.table_progression_wallets w on w.table_id=tb.id left join public.profiles p on p.id=tb.owner_id order by tb.updated_at desc;
end; $$;
revoke all on function public.progression_admin_tables() from public;
grant execute on function public.progression_admin_tables() to authenticated;

create or replace function public.progression_admin_adjust_table(p_table_id text,p_amount integer,p_reason text)
returns public.table_progression_wallets language plpgsql security definer set search_path=public,private as $$
declare w public.table_progression_wallets;
begin
  if public.current_profile_role()<>'admin' then raise exception 'ADMIN_REQUIRED'; end if;
  if p_amount=0 or trim(coalesce(p_reason,''))='' then raise exception 'AMOUNT_AND_REASON_REQUIRED'; end if;
  perform private.ensure_progression_wallet(p_table_id);
  update public.table_progression_wallets set balance=balance+p_amount,lifetime_admin_granted=lifetime_admin_granted+case when p_amount>0 then p_amount else 0 end,updated_at=now()
    where table_id=p_table_id and balance+p_amount>=0 returning * into w;
  if w.table_id is null then raise exception 'INSUFFICIENT_TABLE_PROGRESSION'; end if;
  insert into public.progression_transactions(table_id,actor_id,amount,balance_after,tx_type,reason)
    values(p_table_id,auth.uid(),p_amount,w.balance,case when p_amount>0 then 'ADMIN_TABLE_GRANT' else 'ADMIN_TABLE_REMOVE' end,trim(p_reason));
  return w;
end; $$;
revoke all on function public.progression_admin_adjust_table(text,integer,text) from public;
grant execute on function public.progression_admin_adjust_table(text,integer,text) to authenticated;

-- Viewer universal com privacidade definida pela mesa.
create or replace function public.fetch_character_view(p_character_id text,p_table_id text default null)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare c public.characters; visibility text:='summary'; manager boolean:=false; member boolean:=false; own boolean:=false; out_payload jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into c from public.characters where id=p_character_id; if c.id is null then raise exception 'CHARACTER_NOT_FOUND'; end if;
  own:=c.user_id=auth.uid()::text;
  if p_table_id is not null then
    manager:=public.can_manage_table(p_table_id);
    member:=public.can_access_table_session(p_table_id);
    select coalesce(tb.settings#>>'{recruitment,sheetVisibility}','summary') into visibility from public.tables tb where tb.id=p_table_id;
    if not own and not manager and not member then raise exception 'TABLE_ACCESS_REQUIRED'; end if;
  elsif not own and public.current_profile_role()<>'admin' then raise exception 'CHARACTER_VIEW_FORBIDDEN'; end if;
  if own or manager or public.current_profile_role()='admin' or visibility='full' then out_payload:=c.payload;
  elsif visibility='private' then out_payload:=jsonb_build_object('name',c.name,'mode',c.mode,'nature',c.nature,'className',c.class_name,'avatar',c.payload->'avatar','category',coalesce(c.payload->'category',c.payload#>'{concept,category}'));
  else out_payload:=jsonb_build_object('name',c.name,'mode',c.mode,'nature',c.nature,'className',c.class_name,'avatar',c.payload->'avatar','category',coalesce(c.payload->'category',c.payload#>'{concept,category}'),'stats',c.payload->'stats','resources',c.payload->'resources','derived',c.payload->'derived','progression',c.payload->'progression');
  end if;
  return jsonb_build_object('id',c.id,'owner_id',c.owner_id,'user_id',c.user_id,'name',c.name,'mode',c.mode,'nature',c.nature,'class_name',c.class_name,'payload',out_payload,'visibility',case when own or manager or public.current_profile_role()='admin' then 'full' else visibility end,'updated_at',c.updated_at);
end; $$;
revoke all on function public.fetch_character_view(text,text) from public;
grant execute on function public.fetch_character_view(text,text) to authenticated;

-- Validação de nível/patamar na entrada em mesa.
create or replace function private.table_join_rejection(p_table_id text,p_user_id uuid,p_character_id text)
returns text language plpgsql security definer set search_path=public,private as $$
declare v_table public.tables; v_char public.characters; v_rec jsonb; v_mode text; v_allowed_exp jsonb; v_allowed_classes jsonb; v_max integer; v_count integer; rules jsonb; tier text; tier_n integer; min_tier integer; max_tier integer; lvl integer; pmin integer; pmax integer; pat integer; emin integer; emax integer;
begin
  if p_user_id is null then return 'AUTH_REQUIRED'; end if;
  select * into v_table from public.tables where id=p_table_id; if v_table.id is null then return 'TABLE_NOT_FOUND'; end if;
  if v_table.status not in ('active','paused') then return 'TABLE_NOT_AVAILABLE'; end if;
  if exists(select 1 from public.table_members where table_id=p_table_id and user_id=p_user_id and status='banned') then return 'MEMBER_BANNED'; end if;
  if exists(select 1 from public.table_members where table_id=p_table_id and user_id=p_user_id and status='active') then return 'ALREADY_MEMBER'; end if;
  select * into v_char from public.characters where id=p_character_id and user_id=p_user_id::text; if v_char.id is null then return 'CHARACTER_NOT_OWNED'; end if;
  v_rec:=coalesce(v_table.settings->'recruitment','{}'::jsonb); v_mode:=lower(coalesce(v_table.game_mode,'exodo')); if v_mode not in ('exodo','ocultatun','hybrid') then v_mode:='exodo'; end if;
  if v_mode<>'hybrid' and lower(coalesce(v_char.mode,''))<>v_mode then return 'GAME_MODE_MISMATCH'; end if;
  if v_mode='hybrid' and lower(coalesce(v_char.mode,'')) not in ('exodo','ocultatun') then return 'GAME_MODE_MISMATCH'; end if;
  v_allowed_exp:=case when jsonb_typeof(v_rec->'allowedExpansions')='array' then v_rec->'allowedExpansions' else '[]'::jsonb end; if jsonb_array_length(v_allowed_exp)>0 and not (v_allowed_exp ? coalesce(v_char.nature,'')) then return 'EXPANSION_MISMATCH'; end if;
  v_allowed_classes:=case when jsonb_typeof(v_rec->'allowedClasses')='array' then v_rec->'allowedClasses' else '[]'::jsonb end; if jsonb_array_length(v_allowed_classes)>0 and not (v_allowed_classes ? coalesce(v_char.class_name,'')) then return 'CLASS_MISMATCH'; end if;
  rules:=coalesce(v_rec->'levelRules','{}'::jsonb);
  if lower(v_char.mode)='exodo' then
    tier:=lower(coalesce(v_char.payload#>>'{progression,campaignTier}','iniciado')); tier_n:=case tier when 'veterano' then 3 when 'adaptado' then 2 else 1 end;
    min_tier:=case lower(coalesce(rules->>'exodoMin','iniciado')) when 'veterano' then 3 when 'adaptado' then 2 else 1 end;
    max_tier:=case lower(coalesce(rules->>'exodoMax','veterano')) when 'iniciado' then 1 when 'adaptado' then 2 else 3 end;
    if tier_n<min_tier or tier_n>max_tier then return 'CHARACTER_LEVEL_MISMATCH'; end if;
  else
    begin lvl:=coalesce((v_char.payload#>>'{progression,existenceLevel}')::integer,5); exception when others then lvl:=5; end;
    begin pat:=coalesce((v_char.payload#>>'{progression,patamar}')::integer,1); exception when others then pat:=1; end;
    begin emin:=coalesce((rules->>'existenceMin')::integer,5); exception when others then emin:=5; end;
    begin emax:=coalesce((rules->>'existenceMax')::integer,0); exception when others then emax:=0; end;
    begin pmin:=coalesce((rules->>'patamarMin')::integer,1); exception when others then pmin:=1; end;
    begin pmax:=coalesce((rules->>'patamarMax')::integer,4); exception when others then pmax:=4; end;
    if lvl>emin or lvl<emax or pat<pmin or pat>pmax then return 'CHARACTER_LEVEL_MISMATCH'; end if;
  end if;
  begin v_max:=greatest(1,least(20,coalesce((v_rec->>'maxPlayers')::integer,6))); exception when others then v_max:=6; end;
  select count(*)::integer into v_count from public.table_members where table_id=p_table_id and status='active' and member_role='jogador'; if v_count>=v_max then return 'TABLE_FULL'; end if;
  return null;
end; $$;
revoke all on function private.table_join_rejection(text,uuid,text) from public,anon,authenticated;


-- Recrutamento V2.8.9 preserva visibilidade e requisitos de ficha em vez de descartá-los.
create or replace function public.update_table_recruitment_secure(p_table_id text,p_game_mode text,p_description text,p_recruitment jsonb)
returns public.tables language plpgsql security definer set search_path=public as $$
declare v public.tables; v_mode text:=lower(trim(coalesce(p_game_mode,''))); v_rec jsonb:=coalesce(p_recruitment,'{}'::jsonb); v_max integer; v_visibility text; v_rules jsonb;
begin
  if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
  if v_mode not in ('exodo','ocultatun','hybrid') then raise exception 'INVALID_GAME_MODE'; end if;
  begin v_max:=greatest(1,least(20,coalesce((v_rec->>'maxPlayers')::integer,6))); exception when others then v_max:=6; end;
  v_visibility:=lower(coalesce(v_rec->>'sheetVisibility','summary'));
  if v_visibility not in ('full','summary','private') then v_visibility:='summary'; end if;
  v_rules:=case when jsonb_typeof(v_rec->'levelRules')='object' then v_rec->'levelRules' else '{}'::jsonb end;
  v_rec:=jsonb_build_object(
    'published',case lower(coalesce(v_rec->>'published','true')) when 'false' then false else true end,
    'acceptingRequests',case lower(coalesce(v_rec->>'acceptingRequests','true')) when 'false' then false else true end,
    'maxPlayers',v_max,
    'allowedExpansions',case when jsonb_typeof(v_rec->'allowedExpansions')='array' then v_rec->'allowedExpansions' else '[]'::jsonb end,
    'allowedClasses',case when jsonb_typeof(v_rec->'allowedClasses')='array' then v_rec->'allowedClasses' else '[]'::jsonb end,
    'sheetVisibility',v_visibility,
    'levelRules',v_rules
  );
  update public.tables set game_mode=v_mode,settings=jsonb_set(jsonb_set(jsonb_set(coalesce(settings,'{}'::jsonb),'{description}',to_jsonb(left(coalesce(p_description,''),2000)),true),'{recruitment}',v_rec,true),'{expansions}',v_rec->'allowedExpansions',true),updated_at=now()
  where id=p_table_id returning * into v;
  if v.id is null then raise exception 'TABLE_NOT_FOUND'; end if;
  return v;
end; $$;
revoke all on function public.update_table_recruitment_secure(text,text,text,jsonb) from public;
grant execute on function public.update_table_recruitment_secure(text,text,text,jsonb) to authenticated;

commit;


-- ============================================================================
-- CONSOLIDAÇÃO FINAL V2.9.0
-- ============================================================================
-- MUNDOS SOMBRIOS V2.9.0 — CONSOLIDAÇÃO CANÔNICA
-- Patch final e idempotente. Não contém project-ref, URL ou credenciais.
-- Execute MANUALMENTE depois das migrações históricas em uma instalação existente.

begin;

create table if not exists public.ms_schema_meta (
  singleton boolean primary key default true check(singleton),
  version text not null,
  updated_at timestamptz not null default now()
);
insert into public.ms_schema_meta(singleton,version) values(true,'2.9.0')
on conflict(singleton) do update set version=excluded.version,updated_at=now();
revoke all on public.ms_schema_meta from anon,authenticated;

-- ---------------------------------------------------------------------------
-- FICHA: criação completa uma vez; depois, save comum só altera narrativa.
-- ---------------------------------------------------------------------------
create or replace function private.character_merge_narrative(p_base jsonb,p_incoming jsonb,p_name text)
returns jsonb language sql immutable set search_path=public,private as $$
  select coalesce(p_base,'{}'::jsonb)
    || jsonb_build_object(
      'name',coalesce(nullif(trim(p_name),''),coalesce(p_base->>'name','Personagem')),
      'avatar',coalesce(p_incoming->'avatar',p_base->'avatar','null'::jsonb),
      'gallery',coalesce(p_incoming->'gallery',p_base->'gallery','[]'::jsonb),
      'concept',coalesce(p_incoming->'concept',p_base->'concept','{}'::jsonb),
      'updatedAt',to_jsonb(now()::text)
    );
$$;
revoke all on function private.character_merge_narrative(jsonb,jsonb,text) from public,anon,authenticated;

create or replace function public.save_character_secure(
  p_id text,p_name text,p_mode text,p_nature text,p_class_name text,p_payload jsonb
) returns public.characters
language plpgsql security definer set search_path=public,private as $$
declare v public.characters; vno integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if trim(coalesce(p_name,''))='' then raise exception 'CHARACTER_NAME_REQUIRED'; end if;
  select * into v from public.characters where id=p_id and user_id=auth.uid()::text for update;
  if v.id is null then
    if trim(coalesce(p_payload->>'category',p_payload#>>'{concept,category}',''))='' then raise exception 'CHARACTER_CATEGORY_REQUIRED'; end if;
    if trim(coalesce(p_nature,''))='' then raise exception 'CHARACTER_EXPANSION_REQUIRED'; end if;
    if trim(coalesce(p_class_name,''))='' then raise exception 'CHARACTER_CLASS_REQUIRED'; end if;
    p_payload:=jsonb_set(coalesce(p_payload,'{}'::jsonb),'{progression}',coalesce(p_payload->'progression','{}'::jsonb)||jsonb_build_object('locked',true,'createdInCampaign',false),true);
    insert into public.characters(id,owner_id,user_id,name,mode,nature,class_name,payload)
    values(coalesce(nullif(p_id,''),'c-'||gen_random_uuid()::text),auth.uid()::text,auth.uid()::text,trim(p_name),coalesce(nullif(p_mode,''),'exodo'),p_nature,p_class_name,p_payload)
    returning * into v;
  else
    if coalesce(nullif(p_mode,''),v.mode)<>v.mode or coalesce(p_nature,'')<>coalesce(v.nature,'') or coalesce(p_class_name,'')<>coalesce(v.class_name,'') then
      raise exception 'CHARACTER_ARCHETYPE_LOCKED';
    end if;
    select coalesce(max(version_no),0)+1 into vno from public.character_versions where character_id=v.id;
    insert into public.character_versions(character_id,owner_id,version_no,snapshot) values(v.id,auth.uid(),vno,v.payload);
    update public.characters set name=trim(p_name),payload=private.character_merge_narrative(v.payload,coalesce(p_payload,'{}'::jsonb),p_name),updated_at=now()
      where id=v.id returning * into v;
  end if;
  return v;
end; $$;
revoke all on function public.save_character_secure(text,text,text,text,text,jsonb) from public;
grant execute on function public.save_character_secure(text,text,text,text,text,jsonb) to authenticated;

create or replace function public.gm_update_character(
  p_table_id text,p_character_id text,p_name text,p_mode text,p_nature text,p_class_name text,p_payload jsonb
) returns public.characters
language plpgsql security definer set search_path=public,private as $$
declare v public.characters; vno integer;
begin
  if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
  select * into v from public.characters where id=p_character_id for update;
  if v.id is null then raise exception 'CHARACTER_NOT_FOUND'; end if;
  if not exists(select 1 from public.table_members tm where tm.table_id=p_table_id and tm.character_id=p_character_id and tm.status='active') then raise exception 'CHARACTER_NOT_IN_TABLE'; end if;
  if coalesce(nullif(p_mode,''),v.mode)<>v.mode or coalesce(p_nature,'')<>coalesce(v.nature,'') or coalesce(p_class_name,'')<>coalesce(v.class_name,'') then raise exception 'CHARACTER_ARCHETYPE_LOCKED'; end if;
  select coalesce(max(version_no),0)+1 into vno from public.character_versions where character_id=v.id;
  insert into public.character_versions(character_id,owner_id,version_no,snapshot) values(v.id,v.user_id::uuid,vno,v.payload);
  update public.characters set name=trim(coalesce(p_name,v.name)),payload=private.character_merge_narrative(v.payload,coalesce(p_payload,'{}'::jsonb),coalesce(p_name,v.name)),updated_at=now()
  where id=v.id returning * into v;
  return v;
end; $$;
revoke all on function public.gm_update_character(text,text,text,text,text,text,jsonb) from public;
grant execute on function public.gm_update_character(text,text,text,text,text,text,jsonb) to authenticated;

-- Restaurar uma versão não pode ser usado pelo Jogador para restaurar mecânica antiga.
create or replace function public.restore_character_version(p_character_id text,p_version_id uuid)
returns public.characters language plpgsql security definer set search_path=public,private as $$
declare v public.character_versions; c public.characters; vno integer;
begin
  select * into c from public.characters where id=p_character_id and user_id=auth.uid()::text for update;
  if c.id is null then raise exception 'CHARACTER_NOT_FOUND'; end if;
  select * into v from public.character_versions where id=p_version_id and character_id=p_character_id and owner_id=auth.uid();
  if v.id is null then raise exception 'VERSION_NOT_FOUND'; end if;
  select coalesce(max(version_no),0)+1 into vno from public.character_versions where character_id=c.id;
  insert into public.character_versions(character_id,owner_id,version_no,snapshot) values(c.id,auth.uid(),vno,c.payload);
  update public.characters set name=coalesce(v.snapshot->>'name',c.name),payload=private.character_merge_narrative(c.payload,v.snapshot,coalesce(v.snapshot->>'name',c.name)),updated_at=now()
  where id=c.id returning * into c;
  return c;
end; $$;
revoke all on function public.restore_character_version(text,uuid) from public;
grant execute on function public.restore_character_version(text,uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- ADMISSÃO: uma única função de compatibilidade usada por pedido, convite e relink.
-- ---------------------------------------------------------------------------
create or replace function private.table_character_rejection(p_table_id text,p_user_id uuid,p_character_id text)
returns text language plpgsql security definer set search_path=public,private as $$
declare t public.tables; c public.characters; rec jsonb; rules jsonb; mode_name text; arr jsonb; tier text; tv integer; lo integer; hi integer; lvl integer; pat integer; emin integer; emax integer; pmin integer; pmax integer;
begin
  if p_user_id is null then return 'AUTH_REQUIRED'; end if;
  select * into t from public.tables where id=p_table_id;
  if t.id is null then return 'TABLE_NOT_FOUND'; end if;
  if t.status not in ('active','paused') then return 'TABLE_NOT_AVAILABLE'; end if;
  if exists(select 1 from public.table_members m where m.table_id=p_table_id and m.user_id=p_user_id and m.status='banned') then return 'MEMBER_BANNED'; end if;
  select * into c from public.characters where id=p_character_id and user_id=p_user_id::text;
  if c.id is null then return 'CHARACTER_NOT_OWNED'; end if;
  rec:=coalesce(t.settings->'recruitment','{}'::jsonb); rules:=coalesce(rec->'levelRules','{}'::jsonb);
  mode_name:=lower(coalesce(t.game_mode,'exodo'));
  if mode_name not in ('exodo','ocultatun','hybrid') then mode_name:='exodo'; end if;
  if mode_name<>'hybrid' and lower(coalesce(c.mode,''))<>mode_name then return 'GAME_MODE_MISMATCH'; end if;
  if mode_name='hybrid' and lower(coalesce(c.mode,'')) not in ('exodo','ocultatun') then return 'GAME_MODE_MISMATCH'; end if;
  arr:=case when jsonb_typeof(rec->'allowedExpansions')='array' then rec->'allowedExpansions' else '[]'::jsonb end;
  if jsonb_array_length(arr)>0 and not (arr ? coalesce(c.nature,'')) then return 'EXPANSION_MISMATCH'; end if;
  arr:=case when jsonb_typeof(rec->'allowedClasses')='array' then rec->'allowedClasses' else '[]'::jsonb end;
  if jsonb_array_length(arr)>0 and not (arr ? coalesce(c.class_name,'')) then return 'CLASS_MISMATCH'; end if;
  if lower(c.mode)='exodo' then
    tier:=lower(coalesce(c.payload#>>'{progression,campaignTier}',c.payload#>>'{progression,campaignScale}','iniciado'));
    tv:=case tier when 'veterano' then 3 when 'adaptado' then 2 else 1 end;
    lo:=case lower(coalesce(rules->>'exodoMin','iniciado')) when 'veterano' then 3 when 'adaptado' then 2 else 1 end;
    hi:=case lower(coalesce(rules->>'exodoMax','veterano')) when 'iniciado' then 1 when 'adaptado' then 2 else 3 end;
    if tv<lo or tv>hi then return 'CHARACTER_LEVEL_MISMATCH'; end if;
  else
    begin lvl:=coalesce((c.payload#>>'{progression,existenceLevel}')::integer,5); exception when others then lvl:=5; end;
    begin pat:=coalesce((c.payload#>>'{progression,patamar}')::integer,1); exception when others then pat:=1; end;
    begin emin:=coalesce((rules->>'existenceMin')::integer,5); exception when others then emin:=5; end;
    begin emax:=coalesce((rules->>'existenceMax')::integer,0); exception when others then emax:=0; end;
    begin pmin:=coalesce((rules->>'patamarMin')::integer,1); exception when others then pmin:=1; end;
    begin pmax:=coalesce((rules->>'patamarMax')::integer,4); exception when others then pmax:=4; end;
    if lvl>emin or lvl<emax or pat<pmin or pat>pmax then return 'CHARACTER_LEVEL_MISMATCH'; end if;
  end if;
  return null;
end; $$;
revoke all on function private.table_character_rejection(text,uuid,text) from public,anon,authenticated;

create or replace function private.table_join_rejection(p_table_id text,p_user_id uuid,p_character_id text)
returns text language plpgsql security definer set search_path=public,private as $$
declare reason text; rec jsonb; maxp integer; cnt integer;
begin
  if exists(select 1 from public.table_members m where m.table_id=p_table_id and m.user_id=p_user_id and m.status='active') then return 'ALREADY_MEMBER'; end if;
  reason:=private.table_character_rejection(p_table_id,p_user_id,p_character_id); if reason is not null then return reason; end if;
  select coalesce(settings->'recruitment','{}'::jsonb) into rec from public.tables where id=p_table_id;
  begin maxp:=greatest(1,least(20,coalesce((rec->>'maxPlayers')::integer,6))); exception when others then maxp:=6; end;
  select count(*)::integer into cnt from public.table_members where table_id=p_table_id and status='active' and member_role='jogador';
  if cnt>=maxp then return 'TABLE_FULL'; end if;
  return null;
end; $$;
revoke all on function private.table_join_rejection(text,uuid,text) from public,anon,authenticated;

create or replace function public.link_table_character(p_table_id text,p_character_id text)
returns boolean language plpgsql security definer set search_path=public,private as $$
declare reason text;
begin
  if not exists(select 1 from public.table_members m where m.table_id=p_table_id and m.user_id=auth.uid() and m.status='active') then raise exception 'MEMBER_REQUIRED'; end if;
  reason:=private.table_character_rejection(p_table_id,auth.uid(),p_character_id); if reason is not null then raise exception '%',reason; end if;
  update public.table_members set character_id=p_character_id,updated_at=now() where table_id=p_table_id and user_id=auth.uid();
  return true;
end; $$;
revoke all on function public.link_table_character(text,text) from public;
grant execute on function public.link_table_character(text,text) to authenticated;

-- ---------------------------------------------------------------------------
-- EVOLUÇÃO: custos canônicos de atributos pós-criação.
-- Êxodo: 10 × novo valor. Ocultatun: 20 × novo valor.
-- ---------------------------------------------------------------------------
create or replace function public.progression_upgrade_attribute(p_table_id text,p_character_id text,p_attribute text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare c public.characters; a public.character_progression_accounts; key text; oldv integer; newv integer; cost integer; lvl integer; maxv integer; vno integer;
begin
  key:=lower(trim(coalesce(p_attribute,''))); if key not in ('for','vig','agi','int','prn','pre') then raise exception 'INVALID_ATTRIBUTE'; end if;
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.table_members m where m.table_id=p_table_id and m.character_id=p_character_id and m.user_id=auth.uid() and m.status='active') then raise exception 'CHARACTER_MEMBERSHIP_REQUIRED'; end if;
  select * into c from public.characters where id=p_character_id and user_id=auth.uid()::text for update; if c.id is null then raise exception 'CHARACTER_NOT_OWNED'; end if;
  oldv:=coalesce((c.payload->'stats'->>key)::integer,0); newv:=oldv+1;
  if lower(c.mode)='ocultatun' then
    begin lvl:=coalesce((c.payload#>>'{progression,existenceLevel}')::integer,5); exception when others then lvl:=5; end;
    maxv:=case lvl when 5 then 4 when 4 then 5 when 3 then 6 when 2 then 7 when 1 then 8 else 10 end; cost:=20*newv;
  else
    maxv:=least(8,greatest(1,coalesce((c.payload#>>'{progression,maxAttribute}')::integer,6))); cost:=10*greatest(1,newv);
  end if;
  if newv>maxv then raise exception 'ATTRIBUTE_LEVEL_LIMIT'; end if;
  select * into a from public.character_progression_accounts where table_id=p_table_id and character_id=p_character_id for update;
  if a.character_id is null or a.balance<cost then raise exception 'INSUFFICIENT_EVOLUTION_POINTS'; end if;
  select coalesce(max(version_no),0)+1 into vno from public.character_versions where character_id=c.id;
  insert into public.character_versions(character_id,owner_id,version_no,snapshot) values(c.id,c.user_id::uuid,vno,c.payload);
  c.payload:=jsonb_set(c.payload,array['stats',key],to_jsonb(newv),true); c.payload:=jsonb_set(c.payload,'{progression,lastTableId}',to_jsonb(p_table_id),true);
  update public.characters set payload=c.payload,updated_at=now() where id=c.id;
  update public.character_progression_accounts set balance=balance-cost,lifetime_spent=lifetime_spent+cost,updated_at=now() where table_id=p_table_id and character_id=p_character_id returning * into a;
  insert into public.progression_transactions(table_id,character_id,actor_id,target_user_id,amount,balance_after,tx_type,reason,metadata)
    values(p_table_id,p_character_id,auth.uid(),c.user_id::uuid,-cost,a.balance,'ATTRIBUTE_UPGRADE','Evolução canônica de atributo',jsonb_build_object('attribute',key,'from',oldv,'to',newv,'mode',c.mode));
  return jsonb_build_object('character',to_jsonb(c),'account',to_jsonb(a),'cost',cost,'from',oldv,'to',newv);
end; $$;
revoke all on function public.progression_upgrade_attribute(text,text,text) from public;
grant execute on function public.progression_upgrade_attribute(text,text,text) to authenticated;

commit;


-- ============================================================
-- MUNDOS SOMBRIOS V2.10.0 — EVOLUÇÃO GRADUAL SEMÂNTICA
-- CUMULATIVO SOBRE A ÁRVORE V2.9.0
-- ============================================================

-- Mundos Sombrios V2.10.0 — Evolução Gradual Semântica
-- Camadas: Sucessos = elegibilidade; PEG = efetivação; Mestre = reconhecimento/autoridade.
-- Regra de treino adotada nesta versão: Básico CD13/+1; Prático CD18/+2; Difícil CD23/+3.
begin;

create schema if not exists private;

alter table public.progression_proposals add column if not exists proposal_kind text not null default 'legacy';
alter table public.progression_proposals add column if not exists focus_type text;

alter table public.progression_transactions drop constraint if exists progression_transactions_tx_type_check;
alter table public.progression_transactions add constraint progression_transactions_tx_type_check check (tx_type in (
  'SOUL_PURCHASE','ADMIN_TABLE_GRANT','ADMIN_TABLE_REMOVE','TABLE_GRANT_DEBIT','CHARACTER_GRANT',
  'CHARACTER_GRANT_REVERSAL','ATTRIBUTE_UPGRADE','PROPOSAL_SPEND','RESOURCE_ADJUST','RESOURCE_REQUEST_APPROVED','SYSTEM',
  'SEMANTIC_EVOLUTION','EVOLUTION_ACCELERATION','DEVELOPMENT_APPROVED'
));

create table if not exists public.character_evolution_tracks (
  id uuid primary key default gen_random_uuid(),
  table_id text not null references public.tables(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  capability_type text not null check (capability_type in ('attribute','skill','advantage','talent','power','ritual','class','other')),
  capability_key text not null,
  label text not null,
  current_rank integer not null default 0 check (current_rank >= 0),
  successes integer not null default 0 check (successes >= 0),
  successes_required integer not null default 10 check (successes_required >= 10),
  status text not null default 'progress' check (status in ('progress','ready')),
  requirements jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(table_id,character_id,capability_type,capability_key)
);
create index if not exists idx_evo_tracks_character on public.character_evolution_tracks(table_id,character_id,capability_type);
create index if not exists idx_evo_tracks_ready on public.character_evolution_tracks(table_id,status) where status='ready';

create table if not exists public.character_evolution_events (
  id bigint generated always as identity primary key,
  table_id text not null references public.tables(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  track_id uuid references public.character_evolution_tracks(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  successes integer not null default 0,
  session_label text not null default '',
  note text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_evo_events_character on public.character_evolution_events(table_id,character_id,created_at desc);
create index if not exists idx_evo_events_track on public.character_evolution_events(track_id,created_at desc);

create table if not exists public.evolution_evidence_requests (
  id uuid primary key default gen_random_uuid(),
  table_id text not null references public.tables(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references public.character_evolution_tracks(id) on delete cascade,
  successes integer not null check (successes between 1 and 10),
  session_label text not null default '',
  note text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  applied_successes integer not null default 0,
  decided_by uuid references auth.users(id) on delete set null,
  decision_reason text not null default '',
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_evo_evidence_queue on public.evolution_evidence_requests(table_id,status,created_at);

create table if not exists public.evolution_training_requests (
  id uuid primary key default gen_random_uuid(),
  table_id text not null references public.tables(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references public.character_evolution_tracks(id) on delete cascade,
  training_type text not null check(training_type in ('basic','practical','difficult')),
  environment_modifier integer not null default 0 check(environment_modifier in (-2,0,2)),
  session_label text not null,
  note text not null,
  status text not null default 'pending' check(status in ('pending','resolved','rejected')),
  roll integer,
  total integer,
  dc integer,
  success boolean,
  awarded_successes integer not null default 0,
  consequence text not null default '',
  decided_by uuid references auth.users(id) on delete set null,
  decision_reason text not null default '',
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_evo_training_queue on public.evolution_training_requests(table_id,status,created_at);

create table if not exists public.evolution_upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  table_id text not null references public.tables(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references public.character_evolution_tracks(id) on delete cascade,
  from_rank integer not null,
  to_rank integer not null,
  recommended_cost integer not null check(recommended_cost >= 0),
  final_cost integer,
  note text not null default '',
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  decided_by uuid references auth.users(id) on delete set null,
  decision_reason text not null default '',
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_evo_upgrade_queue on public.evolution_upgrade_requests(table_id,status,created_at);
create unique index if not exists idx_evo_upgrade_one_pending on public.evolution_upgrade_requests(track_id) where status='pending';

alter table public.character_evolution_tracks enable row level security;
alter table public.character_evolution_events enable row level security;
alter table public.evolution_evidence_requests enable row level security;
alter table public.evolution_training_requests enable row level security;
alter table public.evolution_upgrade_requests enable row level security;
revoke all on public.character_evolution_tracks,public.character_evolution_events,public.evolution_evidence_requests,public.evolution_training_requests,public.evolution_upgrade_requests from anon,authenticated;

create or replace function private.evolution_slug(p_value text)
returns text language sql immutable set search_path='' as $$
  select coalesce(nullif(trim(both '-' from regexp_replace(
    translate(lower(coalesce(p_value,'')),'áàãâäéèêëíìîïóòõôöúùûüçñ','aaaaaeeeeiiiiooooouuuucn'),
    '[^a-z0-9]+','-','g')),''),'capacidade');
$$;
revoke all on function private.evolution_slug(text) from public,anon,authenticated;

create or replace function private.evolution_kind(p_value text)
returns text language sql immutable set search_path='' as $$
  select case
    when private.evolution_slug(p_value) in ('pericia','skill') then 'skill'
    when private.evolution_slug(p_value) in ('vantagem','advantage') then 'advantage'
    when private.evolution_slug(p_value) in ('talento','talent') then 'talent'
    when private.evolution_slug(p_value) like '%ritual%' then 'ritual'
    when private.evolution_slug(p_value) like any(array['%poder%','%prodig%','%escrip%','%potenc%','power']) then 'power'
    when private.evolution_slug(p_value) like any(array['%classe%','%cargo%','class']) then 'class'
    when private.evolution_slug(p_value) in ('for','vig','agi','int','prn','pre','atributo','attribute') then 'attribute'
    else 'other' end;
$$;
revoke all on function private.evolution_kind(text) from public,anon,authenticated;

create or replace function private.evolution_success_required(p_next_rank integer)
returns integer language sql immutable set search_path='' as $$ select greatest(10,greatest(1,coalesce(p_next_rank,1))*10); $$;
revoke all on function private.evolution_success_required(integer) from public,anon,authenticated;

create or replace function private.evolution_class_requirements()
returns jsonb language sql immutable set search_path='' as $$
select jsonb_build_array(
  jsonb_build_object('key','narrative_milestone','label','Marco narrativo designado pelo Mestre','done',false),
  jsonb_build_object('key','superior_approval','label','Aprovação de figura superior / organização','done',false),
  jsonb_build_object('key','ideology','label','Conduta coerente com a ideologia da classe','done',false),
  jsonb_build_object('key','new_domain','label','Novo domínio, ritual ou habilidade especial','done',false),
  jsonb_build_object('key','acceptance_rite','label','Ritual de aceitação ou provação','done',false)
); $$;
revoke all on function private.evolution_class_requirements() from public,anon,authenticated;

create or replace function private.evolution_requirements(p_type text,p_mode text default 'exodo')
returns jsonb language sql immutable set search_path='' as $$
select case private.evolution_kind(p_type)
  when 'class' then private.evolution_class_requirements()
  when 'advantage' then jsonb_build_array(
    jsonb_build_object('key','narrative_justification','label','Justificativa narrativa / social reconhecida pelo Mestre','done',false)
  )
  when 'power' then jsonb_build_array(
    jsonb_build_object('key','power_breakthrough','label',case when lower(coalesce(p_mode,'exodo'))='ocultatun'
      then 'Ruptura, revelação ou influência sobrenatural reconhecida'
      else 'Descoberta, assimilação ou manifestação genética reconhecida' end,'done',false)
  )
  when 'ritual' then jsonb_build_array(
    jsonb_build_object('key','ritual_breakthrough','label',case when lower(coalesce(p_mode,'exodo'))='ocultatun'
      then 'Estudo, exposição ou ruptura ritual reconhecida'
      else 'Experimentação, exposição ou domínio ritual reconhecido' end,'done',false)
  )
  else '[]'::jsonb end;
$$;
revoke all on function private.evolution_requirements(text,text) from public,anon,authenticated;

create or replace function private.evolution_requirements_done(p_requirements jsonb)
returns boolean language sql immutable set search_path='' as $$
  select not exists(select 1 from jsonb_array_elements(coalesce(p_requirements,'[]'::jsonb)) x where coalesce((x->>'done')::boolean,false)=false);
$$;
revoke all on function private.evolution_requirements_done(jsonb) from public,anon,authenticated;

create or replace function private.evolution_cost(p_mode text,p_type text,p_target_rank integer)
returns integer language sql immutable set search_path='' as $$
select case private.evolution_kind(p_type)
  when 'attribute' then case when lower(coalesce(p_mode,'exodo'))='ocultatun' then 20*greatest(1,p_target_rank) else 10*greatest(1,p_target_rank) end
  when 'skill' then 10*greatest(1,p_target_rank)
  when 'advantage' then greatest(20,10*greatest(1,p_target_rank))
  when 'talent' then greatest(20,10*greatest(1,p_target_rank))
  when 'power' then 20*greatest(1,p_target_rank)
  when 'ritual' then 20*greatest(1,p_target_rank)
  when 'class' then 30*greatest(1,p_target_rank)
  else 10*greatest(1,p_target_rank) end;
$$;
revoke all on function private.evolution_cost(text,text,integer) from public,anon,authenticated;

-- Risco temático não aplica mutações/sanidade automaticamente: ele cria pressão auditável
-- para resolução do Mestre, preservando a agência narrativa do sistema de mesa.
create or replace function private.evolution_risk_profile(p_mode text,p_type text,p_training_type text,p_risk_count integer)
returns jsonb language sql immutable set search_path='' as $$
select case when private.evolution_kind(p_type) not in ('power','ritual') then '{}'::jsonb
  when lower(coalesce(p_mode,'exodo'))='ocultatun' then jsonb_build_object(
    'theme','ruptura_ocultatun',
    'label','Ruptura do Véu',
    'risk_count',greatest(1,coalesce(p_risk_count,1)),
    'severity',case when coalesce(p_risk_count,1)>=4 then 'critical' when coalesce(p_risk_count,1)>=2 then 'elevated' else 'latent' end,
    'consequence','A falha amplia a influência do oculto: o Mestre pode converter o risco em influência de entidade, manifestação/ritual involuntário, perda de sanidade ou ruptura com o normal.',
    'master_prompt','Resolver em cena conforme o pacto, a exposição e o preço psíquico/espiritual assumido pelo personagem.'
  )
  else jsonb_build_object(
    'theme','instabilidade_exodo',
    'label','Pressão do Gene Êxodo',
    'risk_count',greatest(1,coalesce(p_risk_count,1)),
    'severity',case when coalesce(p_risk_count,1)>=4 then 'critical' when coalesce(p_risk_count,1)>=2 then 'elevated' else 'latent' end,
    'consequence','A falha amplia a instabilidade genética: o Mestre pode converter o risco em novo estigma, mutação de prodígio, assimilação não planejada ou dano ao corpo/mente.',
    'master_prompt','Resolver em cena conforme a manifestação do Gene Êxodo, a pressão do treino e o estado físico/mental do personagem.'
  ) end;
$$;
revoke all on function private.evolution_risk_profile(text,text,text,integer) from public,anon,authenticated;

create or replace function private.ensure_evolution_track(
  p_table_id text,p_character_id text,p_type text,p_key text,p_label text,p_rank integer,p_metadata jsonb default '{}'::jsonb
) returns public.character_evolution_tracks language plpgsql security definer set search_path=public,private as $$
declare r public.character_evolution_tracks; k text:=private.evolution_slug(p_key); t text:=private.evolution_kind(p_type); req jsonb; m text:=lower(coalesce(p_metadata->>'mode','exodo'));
begin
  req:=private.evolution_requirements(t,m);
  insert into public.character_evolution_tracks(table_id,character_id,capability_type,capability_key,label,current_rank,successes_required,requirements,metadata)
    values(p_table_id,p_character_id,t,k,left(coalesce(nullif(trim(p_label),''),p_key,'Capacidade'),180),greatest(0,coalesce(p_rank,0)),private.evolution_success_required(greatest(0,coalesce(p_rank,0))+1),req,coalesce(p_metadata,'{}'::jsonb))
  on conflict(table_id,character_id,capability_type,capability_key) do update set
    label=excluded.label,
    current_rank=case when public.character_evolution_tracks.successes=0 then excluded.current_rank else public.character_evolution_tracks.current_rank end,
    successes_required=case when public.character_evolution_tracks.successes=0 then private.evolution_success_required(excluded.current_rank+1) else public.character_evolution_tracks.successes_required end,
    requirements=case when jsonb_array_length(coalesce(public.character_evolution_tracks.requirements,'[]'::jsonb))=0 and jsonb_array_length(coalesce(excluded.requirements,'[]'::jsonb))>0 then excluded.requirements else public.character_evolution_tracks.requirements end,
    metadata=public.character_evolution_tracks.metadata||excluded.metadata,
    updated_at=now()
  returning * into r;
  return r;
end; $$;
revoke all on function private.ensure_evolution_track(text,text,text,text,text,integer,jsonb) from public,anon,authenticated;

create or replace function private.ensure_character_evolution_tracks(p_table_id text,p_character_id text)
returns void language plpgsql security definer set search_path=public,private as $$
declare c public.characters; p jsonb; item jsonb; raw text; m text[]; k text; rank integer; class_name text; mode text;
begin
  select * into c from public.characters where id=p_character_id;
  if c.id is null then raise exception 'CHARACTER_NOT_FOUND'; end if;
  p:=coalesce(c.payload,'{}'::jsonb);
  mode:=lower(coalesce(nullif(c.mode,''),nullif(p->>'mode',''),'exodo'));
  insert into public.character_progression_accounts(table_id,character_id,user_id) values(p_table_id,p_character_id,c.user_id::uuid) on conflict(table_id,character_id) do nothing;

  foreach k in array array['for','vig','agi','int','prn','pre'] loop
    begin rank:=coalesce((p->'stats'->>k)::integer,0); exception when others then rank:=0; end;
    perform private.ensure_evolution_track(p_table_id,p_character_id,'attribute',k,upper(k),rank,jsonb_build_object('source','stats','mode',mode));
  end loop;

  if jsonb_typeof(p->'skills')='array' and jsonb_array_length(p->'skills')>0 then
    for item in select value from jsonb_array_elements(p->'skills') loop
      begin rank:=greatest(1,coalesce((item->>'grade')::integer,(item->>'rank')::integer,1)); exception when others then rank:=1; end;
      if trim(coalesce(item->>'name',item->>'label',''))<>'' then
        perform private.ensure_evolution_track(p_table_id,p_character_id,private.evolution_kind(coalesce(item->>'type',item->>'kind','Perícia')),coalesce(item->>'name',item->>'label'),coalesce(item->>'name',item->>'label'),rank,jsonb_build_object('source','skills','mode',mode));
      end if;
    end loop;
  elsif jsonb_typeof(p->'skillsHtml')='array' then
    for item in select value from jsonb_array_elements(p->'skillsHtml') loop
      raw:=regexp_replace(item#>>'{}','<[^>]+>',' ','g');
      m:=regexp_match(raw,'(Perícia|Pericia|Vantagem|Talento)\s*:\s*(.+?)\s*\(G\s*([0-9]+)\)','i');
      if m is not null then
        perform private.ensure_evolution_track(p_table_id,p_character_id,private.evolution_kind(m[1]),m[2],trim(m[2]),greatest(1,m[3]::integer),jsonb_build_object('source','skillsHtml','mode',mode));
      end if;
    end loop;
  end if;

  if jsonb_typeof(p->'powers')='array' then
    for item in select value from jsonb_array_elements(p->'powers') loop
      if trim(coalesce(item->>'name',''))<>'' then
        begin rank:=greatest(1,coalesce((item->>'progressionRank')::integer,(item->>'grade')::integer,1)); exception when others then rank:=1; end;
        perform private.ensure_evolution_track(p_table_id,p_character_id,'power',coalesce(nullif(item->>'id',''),item->>'name'),item->>'name',rank,jsonb_build_object('source','powers','powerId',item->>'id','mode',mode));
      end if;
    end loop;
  end if;

  if jsonb_typeof(p->'rituals')='array' then
    for item in select value from jsonb_array_elements(p->'rituals') loop
      if coalesce((item->>'known')::boolean,true) and trim(coalesce(item->>'name',item->>'id',''))<>'' then
        begin rank:=greatest(1,coalesce((item->>'progressionRank')::integer,1)); exception when others then rank:=1; end;
        perform private.ensure_evolution_track(p_table_id,p_character_id,'ritual',coalesce(nullif(item->>'id',''),item->>'name'),coalesce(item->>'name',item->>'id','Ritual'),rank,jsonb_build_object('source','rituals','ritualId',item->>'id','mode',mode));
      end if;
    end loop;
  end if;

  class_name:=coalesce(nullif(p->>'className',''),c.class_name,'Classe / Cargo');
  begin rank:=greatest(1,coalesce((p#>>'{progression,classRank}')::integer,1)); exception when others then rank:=1; end;
  perform private.ensure_evolution_track(p_table_id,p_character_id,'class','class',class_name,rank,jsonb_build_object('source','class','className',class_name,'mode',mode));
end; $$;
revoke all on function private.ensure_character_evolution_tracks(text,text) from public,anon,authenticated;

create or replace function private.evolution_refresh_track(p_track_id uuid)
returns public.character_evolution_tracks language plpgsql security definer set search_path=public,private as $$
declare r public.character_evolution_tracks;
begin
  update public.character_evolution_tracks set
    successes_required=private.evolution_success_required(current_rank+1),
    status=case when successes>=private.evolution_success_required(current_rank+1) and private.evolution_requirements_done(requirements) then 'ready' else 'progress' end,
    updated_at=now()
  where id=p_track_id returning * into r;
  return r;
end; $$;
revoke all on function private.evolution_refresh_track(uuid) from public,anon,authenticated;

create or replace function private.evolution_add_event(p_table_id text,p_character_id text,p_track_id uuid,p_event_type text,p_successes integer,p_session text,p_note text,p_metadata jsonb default '{}'::jsonb)
returns public.character_evolution_events language plpgsql security definer set search_path=public,private as $$
declare e public.character_evolution_events;
begin
 insert into public.character_evolution_events(table_id,character_id,track_id,actor_id,event_type,successes,session_label,note,metadata)
 values(p_table_id,p_character_id,p_track_id,auth.uid(),p_event_type,coalesce(p_successes,0),left(coalesce(p_session,''),180),left(coalesce(p_note,''),1200),coalesce(p_metadata,'{}'::jsonb)) returning * into e;
 return e;
end; $$;
revoke all on function private.evolution_add_event(text,text,uuid,text,integer,text,text,jsonb) from public,anon,authenticated;

create or replace function private.evolution_add_success(p_track_id uuid,p_successes integer,p_event_type text,p_session text,p_note text,p_metadata jsonb default '{}'::jsonb)
returns integer language plpgsql security definer set search_path=public,private as $$
declare t public.character_evolution_tracks; applied integer;
begin
 select * into t from public.character_evolution_tracks where id=p_track_id for update;
 if t.id is null then raise exception 'TRACK_NOT_FOUND'; end if;
 applied:=least(greatest(0,coalesce(p_successes,0)),greatest(0,t.successes_required-t.successes));
 update public.character_evolution_tracks set successes=successes+applied where id=t.id;
 perform private.evolution_refresh_track(t.id);
 perform private.evolution_add_event(t.table_id,t.character_id,t.id,p_event_type,applied,p_session,p_note,coalesce(p_metadata,'{}'::jsonb)||jsonb_build_object('requested',coalesce(p_successes,0)));
 return applied;
end; $$;
revoke all on function private.evolution_add_success(uuid,integer,text,text,text,jsonb) from public,anon,authenticated;

create or replace function public.progression_character_evolution_state(p_table_id text,p_character_id text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare managed boolean; own boolean; a public.character_progression_accounts;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 managed:=public.can_manage_table(p_table_id);
 own:=private.character_in_table(p_table_id,p_character_id,auth.uid());
 if not managed and not own then raise exception 'TABLE_ACCESS_REQUIRED'; end if;
 perform private.ensure_character_evolution_tracks(p_table_id,p_character_id);
 select * into a from public.character_progression_accounts where table_id=p_table_id and character_id=p_character_id;
 return jsonb_build_object(
  'table_id',p_table_id,'character_id',p_character_id,'canManage',managed,'isOwner',own,
  'account',to_jsonb(a),
  'tracks',(select coalesce(jsonb_agg(to_jsonb(t) order by t.capability_type,t.label),'[]'::jsonb) from public.character_evolution_tracks t where t.table_id=p_table_id and t.character_id=p_character_id),
  'events',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from (select * from public.character_evolution_events e where e.table_id=p_table_id and e.character_id=p_character_id order by e.created_at desc limit 80) x),
  'evidenceRequests',(select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb) from public.evolution_evidence_requests r where r.table_id=p_table_id and r.character_id=p_character_id and (managed or r.user_id=auth.uid())),
  'trainingRequests',(select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb) from public.evolution_training_requests r where r.table_id=p_table_id and r.character_id=p_character_id and (managed or r.user_id=auth.uid())),
  'upgradeRequests',(select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb) from public.evolution_upgrade_requests r where r.table_id=p_table_id and r.character_id=p_character_id and (managed or r.user_id=auth.uid())),
  'developmentRequests',(select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb) from public.progression_proposals r where r.table_id=p_table_id and r.character_id=p_character_id and r.proposal_kind='development' and (managed or r.user_id=auth.uid())),
  'trainingRules',jsonb_build_object('basic',jsonb_build_object('dc',13,'successes',1),'practical',jsonb_build_object('dc',18,'successes',2),'difficult',jsonb_build_object('dc',23,'successes',3),'maxSuccessesPerPeriod',3)
 );
end; $$;
revoke all on function public.progression_character_evolution_state(text,text) from public,anon;
grant execute on function public.progression_character_evolution_state(text,text) to authenticated;

create or replace function public.progression_submit_evidence(p_table_id text,p_character_id text,p_capability_type text,p_capability_key text,p_successes integer,p_session_label text,p_note text)
returns public.evolution_evidence_requests language plpgsql security definer set search_path=public,private as $$
declare t public.character_evolution_tracks; r public.evolution_evidence_requests;
begin
 if not private.character_in_table(p_table_id,p_character_id,auth.uid()) then raise exception 'CHARACTER_MEMBERSHIP_REQUIRED'; end if;
 if p_successes not between 1 and 10 or trim(coalesce(p_note,''))='' then raise exception 'EVIDENCE_REQUIRED'; end if;
 perform private.ensure_character_evolution_tracks(p_table_id,p_character_id);
 select * into t from public.character_evolution_tracks where table_id=p_table_id and character_id=p_character_id and capability_type=private.evolution_kind(p_capability_type) and capability_key=private.evolution_slug(p_capability_key);
 if t.id is null then raise exception 'TRACK_NOT_FOUND'; end if;
 insert into public.evolution_evidence_requests(table_id,character_id,user_id,track_id,successes,session_label,note)
 values(p_table_id,p_character_id,auth.uid(),t.id,p_successes,left(coalesce(p_session_label,''),180),left(trim(p_note),1200)) returning * into r;
 return r;
end; $$;
revoke all on function public.progression_submit_evidence(text,text,text,text,integer,text,text) from public,anon;
grant execute on function public.progression_submit_evidence(text,text,text,text,integer,text,text) to authenticated;

create or replace function public.progression_resolve_evidence(p_request_id uuid,p_approved boolean,p_reason text default '')
returns public.evolution_evidence_requests language plpgsql security definer set search_path=public,private as $$
declare r public.evolution_evidence_requests; applied integer:=0;
begin
 select * into r from public.evolution_evidence_requests where id=p_request_id for update;
 if r.id is null then raise exception 'REQUEST_NOT_FOUND'; end if;
 if not public.can_manage_table(r.table_id) then raise exception 'GM_REQUIRED'; end if;
 if r.status<>'pending' then return r; end if;
 if p_approved then applied:=private.evolution_add_success(r.track_id,r.successes,'SCENE_SUCCESS',r.session_label,r.note,jsonb_build_object('requestId',r.id)); end if;
 update public.evolution_evidence_requests set status=case when p_approved then 'approved' else 'rejected' end,applied_successes=applied,decided_by=auth.uid(),decision_reason=left(coalesce(p_reason,''),500),decided_at=now() where id=r.id returning * into r;
 return r;
end; $$;
revoke all on function public.progression_resolve_evidence(uuid,boolean,text) from public,anon;
grant execute on function public.progression_resolve_evidence(uuid,boolean,text) to authenticated;

create or replace function public.progression_record_track_success(p_table_id text,p_character_id text,p_capability_type text,p_capability_key text,p_successes integer,p_session_label text,p_note text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare t public.character_evolution_tracks; applied integer;
begin
 if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
 if p_successes not between 1 and 20 or trim(coalesce(p_note,''))='' then raise exception 'SUCCESS_AND_REASON_REQUIRED'; end if;
 perform private.ensure_character_evolution_tracks(p_table_id,p_character_id);
 select * into t from public.character_evolution_tracks where table_id=p_table_id and character_id=p_character_id and capability_type=private.evolution_kind(p_capability_type) and capability_key=private.evolution_slug(p_capability_key);
 if t.id is null then raise exception 'TRACK_NOT_FOUND'; end if;
 applied:=private.evolution_add_success(t.id,p_successes,'GM_SUCCESS',p_session_label,p_note,jsonb_build_object('direct',true));
 select * into t from public.character_evolution_tracks where id=t.id;
 return jsonb_build_object('track',to_jsonb(t),'applied_successes',applied);
end; $$;
revoke all on function public.progression_record_track_success(text,text,text,text,integer,text,text) from public,anon;
grant execute on function public.progression_record_track_success(text,text,text,text,integer,text,text) to authenticated;

create or replace function public.progression_request_training(p_table_id text,p_character_id text,p_capability_type text,p_capability_key text,p_training_type text,p_environment_modifier integer,p_session_label text,p_note text)
returns public.evolution_training_requests language plpgsql security definer set search_path=public,private as $$
declare t public.character_evolution_tracks; r public.evolution_training_requests; kind text:=lower(trim(coalesce(p_training_type,'practical')));
begin
 if not private.character_in_table(p_table_id,p_character_id,auth.uid()) then raise exception 'CHARACTER_MEMBERSHIP_REQUIRED'; end if;
 if kind not in ('basic','practical','difficult') or coalesce(p_environment_modifier,0) not in (-2,0,2) or trim(coalesce(p_session_label,''))='' or trim(coalesce(p_note,''))='' then raise exception 'INVALID_TRAINING'; end if;
 perform private.ensure_character_evolution_tracks(p_table_id,p_character_id);
 select * into t from public.character_evolution_tracks where table_id=p_table_id and character_id=p_character_id and capability_type=private.evolution_kind(p_capability_type) and capability_key=private.evolution_slug(p_capability_key);
 if t.id is null then raise exception 'TRACK_NOT_FOUND'; end if;
 insert into public.evolution_training_requests(table_id,character_id,user_id,track_id,training_type,environment_modifier,session_label,note)
 values(p_table_id,p_character_id,auth.uid(),t.id,kind,p_environment_modifier,left(p_session_label,180),left(trim(p_note),1200)) returning * into r;
 return r;
end; $$;
revoke all on function public.progression_request_training(text,text,text,text,text,integer,text,text) from public,anon;
grant execute on function public.progression_request_training(text,text,text,text,text,integer,text,text) to authenticated;

create or replace function public.progression_resolve_training(p_request_id uuid,p_approved boolean,p_reason text default '')
returns public.evolution_training_requests language plpgsql security definer set search_path=public,private as $$
declare r public.evolution_training_requests; t public.character_evolution_tracks; c public.characters; v_roll integer; v_total integer; v_dc integer; v_award integer; v_used integer; v_room integer; v_success boolean; v_consequence text:=''; v_mode text:='exodo'; v_risk_count integer:=0; v_risk jsonb:='{}'::jsonb;
begin
 select * into r from public.evolution_training_requests where id=p_request_id for update;
 if r.id is null then raise exception 'REQUEST_NOT_FOUND'; end if;
 if not public.can_manage_table(r.table_id) then raise exception 'GM_REQUIRED'; end if;
 if r.status<>'pending' then return r; end if;
 if not p_approved then update public.evolution_training_requests set status='rejected',decided_by=auth.uid(),decision_reason=left(coalesce(p_reason,''),500),decided_at=now() where id=r.id returning * into r; return r; end if;
 select * into t from public.character_evolution_tracks where id=r.track_id for update;
 select * into c from public.characters where id=r.character_id;
 v_mode:=lower(coalesce(nullif(c.mode,''),nullif(t.metadata->>'mode',''),'exodo'));
 v_dc:=case r.training_type when 'basic' then 13 when 'difficult' then 23 else 18 end;
 v_award:=case r.training_type when 'basic' then 1 when 'difficult' then 3 else 2 end;
 v_roll:=floor(random()*20)::integer+1;
 v_total:=v_roll+t.current_rank+r.environment_modifier;
 v_success:=v_total>=v_dc;
 select coalesce(sum(e.successes),0)::integer into v_used from public.character_evolution_events e where e.track_id=t.id and e.event_type='TRAINING_SUCCESS' and e.metadata->>'period'=r.session_label;
 v_room:=greatest(0,3-v_used);
 if v_success then v_award:=least(v_award,v_room); else v_award:=0; end if;
 if not v_success and r.training_type='practical' then v_consequence:='Fadiga temporária: -1 em testes da capacidade até o próximo descanso ou desvantagem na próxima tentativa.'; end if;
 if not v_success and r.training_type='difficult' then v_consequence:='Penalidade extensiva: -2 em testes relacionados por 1d4 dias ou aflição narrativa grave, a critério do Mestre.'; end if;
 if v_award>0 then
   if t.capability_type in ('power','ritual') then
     update public.character_evolution_tracks set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('discoveries',coalesce((metadata->>'discoveries')::integer,0)+1,'last_discovery_at',now()::text,'mode',v_mode),updated_at=now() where id=t.id returning * into t;
   end if;
   perform private.evolution_add_success(t.id,v_award,'TRAINING_SUCCESS',r.session_label,r.note,jsonb_build_object('requestId',r.id,'period',r.session_label,'trainingType',r.training_type,'roll',v_roll,'total',v_total,'dc',v_dc,'environmentModifier',r.environment_modifier,'mode',v_mode));
 else
   if not v_success and t.capability_type in ('power','ritual') then
     begin v_risk_count:=coalesce((t.metadata->>'risk_count')::integer,0)+1; exception when others then v_risk_count:=1; end;
     v_risk:=private.evolution_risk_profile(v_mode,t.capability_type,r.training_type,v_risk_count);
     if trim(coalesce(v_consequence,''))<>'' then v_consequence:=v_consequence||' · '||(v_risk->>'consequence'); else v_consequence:=v_risk->>'consequence'; end if;
     update public.character_evolution_tracks set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
       'mode',v_mode,'risk_count',v_risk_count,'risk_theme',v_risk->>'theme','risk_label',v_risk->>'label','risk_severity',v_risk->>'severity',
       'last_risk_consequence',v_consequence,'last_risk_at',now()::text,'risk_profile',v_risk
     ),updated_at=now() where id=t.id returning * into t;
   end if;
   perform private.evolution_add_event(r.table_id,r.character_id,t.id,'TRAINING_FAILURE',0,r.session_label,r.note,jsonb_build_object('requestId',r.id,'period',r.session_label,'trainingType',r.training_type,'roll',v_roll,'total',v_total,'dc',v_dc,'environmentModifier',r.environment_modifier,'consequence',v_consequence,'mode',v_mode,'riskCount',v_risk_count,'riskProfile',v_risk));
 end if;
 update public.evolution_training_requests set status='resolved',roll=v_roll,total=v_total,dc=v_dc,success=v_success,awarded_successes=v_award,consequence=v_consequence,decided_by=auth.uid(),decision_reason=left(coalesce(p_reason,''),500),decided_at=now() where id=r.id returning * into r;
 return r;
end; $$;
revoke all on function public.progression_resolve_training(uuid,boolean,text) from public,anon;
grant execute on function public.progression_resolve_training(uuid,boolean,text) to authenticated;

create or replace function public.progression_request_semantic_upgrade(
 p_table_id text,p_character_id text,p_capability_type text,p_capability_key text,p_note text default ''
) returns public.evolution_upgrade_requests
language plpgsql security definer set search_path=public,private as $$
declare t public.character_evolution_tracks; c public.characters; a public.character_progression_accounts;
 r public.evolution_upgrade_requests; target integer; cost integer;
begin
 if auth.uid() is null or not private.character_in_table(p_table_id,p_character_id,auth.uid()) then raise exception 'CHARACTER_MEMBERSHIP_REQUIRED'; end if;
 if not exists(select 1 from public.characters where id=p_character_id and user_id::text=auth.uid()::text) then raise exception 'CHARACTER_MEMBERSHIP_REQUIRED'; end if;
 perform private.ensure_character_evolution_tracks(p_table_id,p_character_id);
 select * into t from public.character_evolution_tracks where table_id=p_table_id and character_id=p_character_id
 and capability_type=private.evolution_kind(p_capability_type) and capability_key=private.evolution_slug(p_capability_key) for update;
 if t.id is null then raise exception 'TRACK_NOT_FOUND'; end if;
 t:=private.evolution_refresh_track(t.id);
 if t.status<>'ready' then raise exception 'EVOLUTION_NOT_READY'; end if;
 select * into c from public.characters where id=p_character_id for update;
 select * into a from public.character_progression_accounts where table_id=p_table_id and character_id=p_character_id for update;
 if a.character_id is null then raise exception 'PROGRESSION_ACCOUNT_NOT_FOUND'; end if;
 target:=t.current_rank+1;cost:=private.evolution_cost(c.mode,t.capability_type,target);
 select * into r from public.evolution_upgrade_requests where track_id=t.id and status='pending' order by created_at limit 1 for update;
 if left(coalesce(p_note,''),12)='SELF_EVOLVE:' and a.balance<cost then raise exception 'INSUFFICIENT_CHARACTER_PROGRESSION'; end if;
 if r.id is not null and left(coalesce(p_note,''),12)<>'SELF_EVOLVE:' then raise exception 'UPGRADE_ALREADY_PENDING'; end if;
 if r.id is null then
  insert into public.evolution_upgrade_requests(table_id,character_id,user_id,track_id,from_rank,to_rank,recommended_cost,note)
  values(p_table_id,p_character_id,auth.uid(),t.id,t.current_rank,target,cost,left(coalesce(p_note,''),800)) returning * into r;
 end if;
 if left(coalesce(p_note,''),12)='SELF_EVOLVE:' then
  perform private.evolution_apply_upgrade(t.id,cost,false,false,'Evolução confirmada pelo jogador',r.id::text);
  update public.evolution_upgrade_requests set status='approved',from_rank=target-1,to_rank=target,final_cost=cost,
  decided_by=auth.uid(),decided_at=now(),decision_reason='Autonomia: sucessos aprovados e PEG suficiente'
  where id=r.id returning * into r;
 end if;
 return r;
end; $$;

revoke all on function public.progression_request_semantic_upgrade(text,text,text,text,text) from public,anon;
grant execute on function public.progression_request_semantic_upgrade(text,text,text,text,text) to authenticated;

create or replace function private.evolution_apply_upgrade(p_track_id uuid,p_final_cost integer,p_acceleration boolean,p_free boolean,p_reason text,p_reference text default null)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare t public.character_evolution_tracks; c public.characters; a public.character_progression_accounts; payload jsonb; target integer; cost integer; maxv integer; vno integer; arr jsonb; item jsonb; txt text; found boolean:=false; req jsonb;
begin
 select * into t from public.character_evolution_tracks where id=p_track_id for update;
 if t.id is null then raise exception 'TRACK_NOT_FOUND'; end if;
 t:=private.evolution_refresh_track(t.id);
 if not p_acceleration and t.status<>'ready' then raise exception 'EVOLUTION_NOT_READY'; end if;
 select * into c from public.characters where id=t.character_id for update;
 select * into a from public.character_progression_accounts where table_id=t.table_id and character_id=t.character_id for update;
 if a.character_id is null then raise exception 'PROGRESSION_ACCOUNT_NOT_FOUND'; end if;
 target:=t.current_rank+1; cost:=coalesce(p_final_cost,private.evolution_cost(c.mode,t.capability_type,target));
 if cost<0 then raise exception 'INVALID_COST'; end if;
 if not p_free and a.balance<cost then raise exception 'INSUFFICIENT_CHARACTER_PROGRESSION'; end if;
 payload:=coalesce(c.payload,'{}'::jsonb);

 if t.capability_type='attribute' then
   if lower(c.mode)='ocultatun' then
     begin maxv:=case coalesce((payload#>>'{progression,existenceLevel}')::integer,5) when 5 then 4 when 4 then 5 when 3 then 6 when 2 then 7 when 1 then 8 else 10 end; exception when others then maxv:=4; end;
   else
     begin maxv:=least(8,greatest(1,coalesce((payload#>>'{progression,maxAttribute}')::integer,6))); exception when others then maxv:=6; end;
   end if;
   if target>maxv then raise exception 'ATTRIBUTE_LEVEL_LIMIT'; end if;
   payload:=jsonb_set(payload,array['stats',t.capability_key],to_jsonb(target),true);
 elsif t.capability_type in ('skill','advantage','talent') then
   arr:='[]'::jsonb; found:=false;
   if jsonb_typeof(payload->'skills')='array' then
     for item in select value from jsonb_array_elements(payload->'skills') loop
       if private.evolution_kind(coalesce(item->>'type',item->>'kind'))=t.capability_type and private.evolution_slug(coalesce(item->>'name',item->>'label'))=t.capability_key then item:=jsonb_set(item,'{grade}',to_jsonb(target),true); found:=true; end if;
       arr:=arr||jsonb_build_array(item);
     end loop;
   end if;
   if not found then arr:=arr||jsonb_build_array(jsonb_build_object('type',case t.capability_type when 'skill' then 'Perícia' when 'advantage' then 'Vantagem' else 'Talento' end,'name',t.label,'grade',target)); end if;
   payload:=jsonb_set(payload,'{skills}',arr,true);
   if jsonb_typeof(payload->'skillsHtml')='array' then
     arr:='[]'::jsonb; found:=false;
     for item in select value from jsonb_array_elements(payload->'skillsHtml') loop
       txt:=item#>>'{}';
       if position(lower(t.label) in lower(txt))>0 and txt~*'\(G\s*[0-9]+\)' then txt:=regexp_replace(txt,'\(G\s*[0-9]+\)','(G'||target::text||')','i'); found:=true; end if;
       arr:=arr||jsonb_build_array(to_jsonb(txt));
     end loop;
     if not found then arr:=arr||jsonb_build_array(to_jsonb('<div class="list-item-header"><input type="text" value="'||case t.capability_type when 'skill' then 'Perícia' when 'advantage' then 'Vantagem' else 'Talento' end||': '||replace(t.label,'"','')||' (G'||target::text||')" readonly></div>')); end if;
     payload:=jsonb_set(payload,'{skillsHtml}',arr,true);
   end if;
 elsif t.capability_type='power' and jsonb_typeof(payload->'powers')='array' then
   select coalesce(jsonb_agg(case when private.evolution_slug(coalesce(nullif(x->>'id',''),x->>'name'))=t.capability_key then jsonb_set(x,'{progressionRank}',to_jsonb(target),true) else x end),'[]'::jsonb) into arr from jsonb_array_elements(payload->'powers') x;
   payload:=jsonb_set(payload,'{powers}',arr,true);
 elsif t.capability_type='ritual' and jsonb_typeof(payload->'rituals')='array' then
   select coalesce(jsonb_agg(case when private.evolution_slug(coalesce(nullif(x->>'id',''),x->>'name'))=t.capability_key then jsonb_set(x,'{progressionRank}',to_jsonb(target),true) else x end),'[]'::jsonb) into arr from jsonb_array_elements(payload->'rituals') x;
   payload:=jsonb_set(payload,'{rituals}',arr,true);
 elsif t.capability_type='class' then
   payload:=jsonb_set(payload,'{progression,classRank}',to_jsonb(target),true);
 end if;
 payload:=jsonb_set(payload,'{progression,lastTableId}',to_jsonb(t.table_id),true);
 payload:=jsonb_set(payload,'{progression,lastEvolutionAt}',to_jsonb(now()::text),true);

 select coalesce(max(version_no),0)+1 into vno from public.character_versions where character_id=c.id;
 insert into public.character_versions(character_id,owner_id,version_no,snapshot) values(c.id,c.user_id::uuid,vno,c.payload);
 update public.characters set payload=payload,updated_at=now() where id=c.id returning * into c;
 if not p_free then update public.character_progression_accounts set balance=balance-cost,lifetime_spent=lifetime_spent+cost,updated_at=now() where table_id=t.table_id and character_id=t.character_id returning * into a; end if;
 if t.capability_type in ('class','advantage','power','ritual') then select coalesce(jsonb_agg(x||jsonb_build_object('done',false)),'[]'::jsonb) into req from jsonb_array_elements(t.requirements) x; else req:=t.requirements; end if;
 update public.character_evolution_tracks set current_rank=target,successes=0,successes_required=private.evolution_success_required(target+1),status='progress',requirements=req,updated_at=now() where id=t.id returning * into t;
 insert into public.progression_transactions(table_id,character_id,actor_id,target_user_id,amount,balance_after,tx_type,reason,reference_id,metadata)
 values(t.table_id,t.character_id,auth.uid(),a.user_id,case when p_free then 0 else -cost end,a.balance,case when p_acceleration then 'EVOLUTION_ACCELERATION' else 'SEMANTIC_EVOLUTION' end,left(coalesce(p_reason,''),500),p_reference,jsonb_build_object('track_id',t.id,'capability_type',t.capability_type,'capability_key',t.capability_key,'from',target-1,'to',target,'cost',cost,'free',p_free));
 perform private.evolution_add_event(t.table_id,t.character_id,t.id,case when p_acceleration then 'ACCELERATION' else 'EVOLUTION_APPLIED' end,0,'',p_reason,jsonb_build_object('from',target-1,'to',target,'cost',cost,'free',p_free));
 return jsonb_build_object('track',to_jsonb(t),'character',to_jsonb(c),'account',to_jsonb(a),'cost',cost);
end; $$;
revoke all on function private.evolution_apply_upgrade(uuid,integer,boolean,boolean,text,text) from public,anon,authenticated;

create or replace function public.progression_resolve_semantic_upgrade(p_request_id uuid,p_approved boolean,p_final_cost integer default null,p_reason text default '')
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare r public.evolution_upgrade_requests; result jsonb;
begin
 select * into r from public.evolution_upgrade_requests where id=p_request_id for update;
 if r.id is null then raise exception 'REQUEST_NOT_FOUND'; end if;
 if not public.can_manage_table(r.table_id) then raise exception 'GM_REQUIRED'; end if;
 if r.status<>'pending' then return jsonb_build_object('request',to_jsonb(r)); end if;
 if not p_approved then update public.evolution_upgrade_requests set status='rejected',decided_by=auth.uid(),decision_reason=left(coalesce(p_reason,''),500),decided_at=now() where id=r.id returning * into r; return jsonb_build_object('request',to_jsonb(r)); end if;
 result:=private.evolution_apply_upgrade(r.track_id,coalesce(p_final_cost,r.recommended_cost),false,false,coalesce(nullif(trim(p_reason),''),r.note),r.id::text);
 update public.evolution_upgrade_requests set status='approved',final_cost=coalesce(p_final_cost,r.recommended_cost),decided_by=auth.uid(),decision_reason=left(coalesce(p_reason,''),500),decided_at=now() where id=r.id returning * into r;
 return jsonb_build_object('request',to_jsonb(r))||result;
end; $$;
revoke all on function public.progression_resolve_semantic_upgrade(uuid,boolean,integer,text) from public,anon;
grant execute on function public.progression_resolve_semantic_upgrade(uuid,boolean,integer,text) to authenticated;

create or replace function public.progression_accelerate_track(p_table_id text,p_character_id text,p_capability_type text,p_capability_key text,p_free boolean,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare t public.character_evolution_tracks;
begin
 if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
 if trim(coalesce(p_reason,''))='' then raise exception 'REASON_REQUIRED'; end if;
 perform private.ensure_character_evolution_tracks(p_table_id,p_character_id);
 select * into t from public.character_evolution_tracks where table_id=p_table_id and character_id=p_character_id and capability_type=private.evolution_kind(p_capability_type) and capability_key=private.evolution_slug(p_capability_key);
 if t.id is null then raise exception 'TRACK_NOT_FOUND'; end if;
 return private.evolution_apply_upgrade(t.id,null,true,coalesce(p_free,false),trim(p_reason),null);
end; $$;
revoke all on function public.progression_accelerate_track(text,text,text,text,boolean,text) from public,anon;
grant execute on function public.progression_accelerate_track(text,text,text,text,boolean,text) to authenticated;

create or replace function public.progression_set_track_requirement(p_table_id text,p_character_id text,p_capability_type text,p_capability_key text,p_requirement_key text,p_done boolean,p_label text default '')
returns public.character_evolution_tracks language plpgsql security definer set search_path=public,private as $$
declare t public.character_evolution_tracks; arr jsonb:='[]'::jsonb; item jsonb; found boolean:=false; k text:=trim(coalesce(p_requirement_key,''));
begin
 if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
 if k='' then raise exception 'REQUIREMENT_REQUIRED'; end if;
 perform private.ensure_character_evolution_tracks(p_table_id,p_character_id);
 select * into t from public.character_evolution_tracks where table_id=p_table_id and character_id=p_character_id and capability_type=private.evolution_kind(p_capability_type) and capability_key=private.evolution_slug(p_capability_key) for update;
 if t.id is null then raise exception 'TRACK_NOT_FOUND'; end if;
 for item in select value from jsonb_array_elements(coalesce(t.requirements,'[]'::jsonb)) loop
   if item->>'key'=k then item:=item||jsonb_build_object('done',coalesce(p_done,false),'label',coalesce(nullif(p_label,''),item->>'label',k)); found:=true; end if;
   arr:=arr||jsonb_build_array(item);
 end loop;
 if not found then arr:=arr||jsonb_build_array(jsonb_build_object('key',k,'label',coalesce(nullif(p_label,''),k),'done',coalesce(p_done,false))); end if;
 update public.character_evolution_tracks set requirements=arr where id=t.id;
 t:=private.evolution_refresh_track(t.id);
 perform private.evolution_add_event(t.table_id,t.character_id,t.id,'REQUIREMENT_UPDATED',0,'',coalesce(nullif(p_label,''),k),jsonb_build_object('requirement',k,'done',coalesce(p_done,false)));
 return t;
end; $$;
revoke all on function public.progression_set_track_requirement(text,text,text,text,text,boolean,text) from public,anon;
grant execute on function public.progression_set_track_requirement(text,text,text,text,text,boolean,text) to authenticated;

create or replace function public.progression_submit_development(p_table_id text,p_character_id text,p_focus_type text,p_payload jsonb,p_requested_cost integer,p_note text)
returns public.progression_proposals language plpgsql security definer set search_path=public,private as $$
declare r public.progression_proposals; f text:=private.evolution_kind(p_focus_type);
begin
 if not private.character_in_table(p_table_id,p_character_id,auth.uid()) then raise exception 'CHARACTER_MEMBERSHIP_REQUIRED'; end if;
 if f not in ('power','skill','class') then raise exception 'INVALID_DEVELOPMENT_FOCUS'; end if;
 if coalesce(p_requested_cost,0)<=0 or trim(coalesce(p_note,''))='' then raise exception 'COST_AND_NOTE_REQUIRED'; end if;
 insert into public.progression_proposals(table_id,character_id,user_id,proposed_payload,requested_cost,note,proposal_kind,focus_type)
 values(p_table_id,p_character_id,auth.uid(),coalesce(p_payload,'{}'::jsonb),p_requested_cost,left(trim(p_note),1200),'development',f) returning * into r;
 return r;
end; $$;
revoke all on function public.progression_submit_development(text,text,text,jsonb,integer,text) from public,anon;
grant execute on function public.progression_submit_development(text,text,text,jsonb,integer,text) to authenticated;

create or replace function public.progression_resolve_development(p_request_id uuid,p_approved boolean,p_final_cost integer default null,p_reason text default '')
returns public.progression_proposals language plpgsql security definer set search_path=public,private as $$
declare r public.progression_proposals; c public.characters; a public.character_progression_accounts; payload jsonb; cost integer; vno integer;
begin
 select * into r from public.progression_proposals where id=p_request_id and proposal_kind='development' for update;
 if r.id is null then raise exception 'REQUEST_NOT_FOUND'; end if;
 if not public.can_manage_table(r.table_id) then raise exception 'GM_REQUIRED'; end if;
 if r.status<>'pending' then return r; end if;
 if not p_approved then update public.progression_proposals set status='rejected',decided_by=auth.uid(),decided_at=now() where id=r.id returning * into r; return r; end if;
 cost:=coalesce(p_final_cost,r.requested_cost); if cost<=0 then raise exception 'INVALID_COST'; end if;
 select * into a from public.character_progression_accounts where table_id=r.table_id and character_id=r.character_id for update;
 if a.character_id is null or a.balance<cost then raise exception 'INSUFFICIENT_CHARACTER_PROGRESSION'; end if;
 select * into c from public.characters where id=r.character_id for update; payload:=coalesce(c.payload,'{}'::jsonb);
 select coalesce(max(version_no),0)+1 into vno from public.character_versions where character_id=c.id;
 insert into public.character_versions(character_id,owner_id,version_no,snapshot) values(c.id,c.user_id::uuid,vno,c.payload);
 if r.focus_type='power' then
   if r.proposed_payload?'powers' then payload:=jsonb_set(payload,'{powers}',coalesce(r.proposed_payload->'powers','[]'::jsonb),true); end if;
   if r.proposed_payload?'powersHtml' then payload:=jsonb_set(payload,'{powersHtml}',coalesce(r.proposed_payload->'powersHtml','[]'::jsonb),true); end if;
   if r.proposed_payload?'rituals' then payload:=jsonb_set(payload,'{rituals}',coalesce(r.proposed_payload->'rituals','[]'::jsonb),true); end if;
 elsif r.focus_type='skill' then
   if r.proposed_payload?'skills' then payload:=jsonb_set(payload,'{skills}',coalesce(r.proposed_payload->'skills','[]'::jsonb),true); end if;
   if r.proposed_payload?'skillsHtml' then payload:=jsonb_set(payload,'{skillsHtml}',coalesce(r.proposed_payload->'skillsHtml','[]'::jsonb),true); end if;
 elsif r.focus_type='class' then
   if r.proposed_payload?'className' then payload:=jsonb_set(payload,'{className}',r.proposed_payload->'className',true); end if;
 end if;
 payload:=jsonb_set(payload,'{progression,lastTableId}',to_jsonb(r.table_id),true); payload:=jsonb_set(payload,'{progression,lastEvolutionAt}',to_jsonb(now()::text),true);
 update public.characters set payload=payload,class_name=coalesce(payload->>'className',class_name),updated_at=now() where id=c.id;
 update public.character_progression_accounts set balance=balance-cost,lifetime_spent=lifetime_spent+cost,updated_at=now() where table_id=r.table_id and character_id=r.character_id returning * into a;
 update public.progression_proposals set status='approved',final_cost=cost,decided_by=auth.uid(),decided_at=now() where id=r.id returning * into r;
 insert into public.progression_transactions(table_id,character_id,actor_id,target_user_id,amount,balance_after,tx_type,reason,reference_id,metadata) values(r.table_id,r.character_id,auth.uid(),r.user_id,-cost,a.balance,'DEVELOPMENT_APPROVED',coalesce(nullif(trim(p_reason),''),r.note),r.id::text,jsonb_build_object('focus_type',r.focus_type));
 perform private.evolution_add_event(r.table_id,r.character_id,null,'DEVELOPMENT_APPROVED',0,'',coalesce(nullif(trim(p_reason),''),r.note),jsonb_build_object('focus_type',r.focus_type,'cost',cost));
 perform private.ensure_character_evolution_tracks(r.table_id,r.character_id);
 return r;
end; $$;
revoke all on function public.progression_resolve_development(uuid,boolean,integer,text) from public,anon;
grant execute on function public.progression_resolve_development(uuid,boolean,integer,text) to authenticated;

-- Estado da Mesa passa a alimentar a Central Operacional com a mesma fonte de verdade.
create or replace function public.progression_table_state(p_table_id text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare w public.table_progression_wallets; managed boolean; my_char text; my_account jsonb; rec record;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if not public.can_access_table_session(p_table_id) and not public.can_manage_table(p_table_id) then raise exception 'TABLE_ACCESS_REQUIRED'; end if;
 select * into w from private.ensure_progression_wallet(p_table_id); managed:=public.can_manage_table(p_table_id);
 for rec in select tm.character_id,c.user_id from public.table_members tm join public.characters c on c.id=tm.character_id where tm.table_id=p_table_id and tm.status='active' and tm.character_id is not null loop
   insert into public.character_progression_accounts(table_id,character_id,user_id) values(p_table_id,rec.character_id,rec.user_id::uuid) on conflict(table_id,character_id) do nothing;
   perform private.ensure_character_evolution_tracks(p_table_id,rec.character_id);
 end loop;
 select tm.character_id into my_char from public.table_members tm where tm.table_id=p_table_id and tm.user_id=auth.uid() and tm.status='active' limit 1;
 if my_char is not null then select to_jsonb(a) into my_account from public.character_progression_accounts a where a.table_id=p_table_id and a.character_id=my_char; end if;
 return jsonb_build_object(
  'managed',managed,'wallet',case when managed then to_jsonb(w) else null end,'myAccount',my_account,
  'accounts',case when managed then (select coalesce(jsonb_agg(jsonb_build_object('character_id',a.character_id,'user_id',a.user_id,'balance',a.balance,'lifetime_granted',a.lifetime_granted,'lifetime_spent',a.lifetime_spent,'career_progress',a.career_progress,'name',c.name) order by c.name),'[]'::jsonb) from public.character_progression_accounts a join public.characters c on c.id=a.character_id where a.table_id=p_table_id) else '[]'::jsonb end,
  'tracks',case when managed then (select coalesce(jsonb_agg(to_jsonb(t) order by t.character_id,t.capability_type,t.label),'[]'::jsonb) from public.character_evolution_tracks t where t.table_id=p_table_id) else '[]'::jsonb end,
  'tracksByCharacter',case when managed then (select coalesce(jsonb_object_agg(character_id,rows),'{}'::jsonb) from (select character_id,jsonb_agg(to_jsonb(t) order by t.capability_type,t.label) rows from public.character_evolution_tracks t where t.table_id=p_table_id group by character_id) q) else '{}'::jsonb end,
  'evidenceRequests',case when managed then (select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('label',t.label,'capability_type',t.capability_type,'capability_key',t.capability_key) order by r.created_at),'[]'::jsonb) from public.evolution_evidence_requests r join public.character_evolution_tracks t on t.id=r.track_id where r.table_id=p_table_id and r.status='pending') else '[]'::jsonb end,
  'trainingRequests',case when managed then (select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('label',t.label,'capability_type',t.capability_type,'capability_key',t.capability_key) order by r.created_at),'[]'::jsonb) from public.evolution_training_requests r join public.character_evolution_tracks t on t.id=r.track_id where r.table_id=p_table_id and r.status='pending') else '[]'::jsonb end,
  'upgradeRequests',case when managed then (select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('label',t.label,'capability_type',t.capability_type,'capability_key',t.capability_key) order by r.created_at),'[]'::jsonb) from public.evolution_upgrade_requests r join public.character_evolution_tracks t on t.id=r.track_id where r.table_id=p_table_id and r.status='pending') else '[]'::jsonb end,
  'developmentRequests',case when managed then (select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at),'[]'::jsonb) from public.progression_proposals r where r.table_id=p_table_id and r.status='pending' and r.proposal_kind='development') else '[]'::jsonb end,
  'evolutionEvents',case when managed then (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from (select * from public.character_evolution_events e where e.table_id=p_table_id order by e.created_at desc limit 60) x) else '[]'::jsonb end,
  'pendingProposals',case when managed then (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]'::jsonb) from public.progression_proposals x where x.table_id=p_table_id and x.status='pending' and x.proposal_kind='legacy') else '[]'::jsonb end,
  'pendingResources',case when managed then (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]'::jsonb) from public.character_resource_requests x where x.table_id=p_table_id and x.status='pending') else '[]'::jsonb end,
  'recentTransactions',case when managed then (select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]'::jsonb) from (select * from public.progression_transactions x where x.table_id=p_table_id order by x.created_at desc limit 60) q) else '[]'::jsonb end,
  'config',(select to_jsonb(c) from public.progression_config c where c.singleton=true)
 );
end; $$;
revoke all on function public.progression_table_state(text) from public,anon;
grant execute on function public.progression_table_state(text) to authenticated;

-- Arconte: Ledger operacional por Mesa (economia PEG + acontecimentos de evolução).
drop function if exists public.progression_admin_table_ledger(text,integer);
create function public.progression_admin_table_ledger(p_table_id text,p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare lim integer:=least(200,greatest(10,coalesce(p_limit,100))); w public.table_progression_wallets; tb public.tables;
begin
 if public.current_profile_role()<>'admin' then raise exception 'ADMIN_REQUIRED'; end if;
 select * into tb from public.tables where id=p_table_id;
 if tb.id is null then raise exception 'TABLE_NOT_FOUND'; end if;
 select * into w from private.ensure_progression_wallet(p_table_id);
 return jsonb_build_object(
   'table',jsonb_build_object('table_id',tb.id,'table_name',tb.name,'game_mode',tb.game_mode,'status',tb.status,'balance',w.balance,'lifetime_purchased',w.lifetime_purchased,'lifetime_admin_granted',w.lifetime_admin_granted,'lifetime_distributed',w.lifetime_distributed),
   'transactions',(select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]'::jsonb) from (
      select x.*,c.name as character_name,pa.username as actor_username,pt.username as target_username
      from public.progression_transactions x
      left join public.characters c on c.id=x.character_id
      left join public.profiles pa on pa.id=x.actor_id
      left join public.profiles pt on pt.id=x.target_user_id
      where x.table_id=p_table_id order by x.created_at desc limit lim
   ) q),
   'events',(select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]'::jsonb) from (
      select e.*,t.label as capability_label,t.capability_type,p.username as actor_username,c.name as character_name
      from public.character_evolution_events e
      left join public.character_evolution_tracks t on t.id=e.track_id
      left join public.profiles p on p.id=e.actor_id
      left join public.characters c on c.id=e.character_id
      where e.table_id=p_table_id order by e.created_at desc limit lim
   ) q)
 );
end; $$;
revoke all on function public.progression_admin_table_ledger(text,integer) from public,anon;
grant execute on function public.progression_admin_table_ledger(text,integer) to authenticated;

-- Arconte: métricas de uso além da reserva PEG.
drop function if exists public.progression_admin_tables();
create function public.progression_admin_tables()
returns table(table_id text,table_name text,game_mode text,status text,owner_username text,balance integer,lifetime_purchased integer,lifetime_admin_granted integer,lifetime_distributed integer,participant_count integer,ready_count integer,pending_evolution_count integer)
language plpgsql security definer set search_path=public,private as $$
begin
 if public.current_profile_role()<>'admin' then raise exception 'ADMIN_REQUIRED'; end if;
 insert into public.table_progression_wallets(table_id) select id from public.tables on conflict(table_id) do nothing;
 return query select tb.id,tb.name,tb.game_mode,tb.status,coalesce(p.username,tb.owner_id),w.balance,w.lifetime_purchased,w.lifetime_admin_granted,w.lifetime_distributed,
   (select count(*)::integer from public.table_members tm where tm.table_id=tb.id and tm.status='active' and tm.character_id is not null),
   (select count(*)::integer from public.character_evolution_tracks et where et.table_id=tb.id and et.status='ready'),
   ((select count(*) from public.evolution_evidence_requests er where er.table_id=tb.id and er.status='pending')+(select count(*) from public.evolution_training_requests tr where tr.table_id=tb.id and tr.status='pending')+(select count(*) from public.evolution_upgrade_requests ur where ur.table_id=tb.id and ur.status='pending')+(select count(*) from public.progression_proposals pr where pr.table_id=tb.id and pr.status='pending' and pr.proposal_kind='development'))::integer
 from public.tables tb join public.table_progression_wallets w on w.table_id=tb.id left join public.profiles p on p.id=tb.owner_id order by tb.updated_at desc;
end; $$;
revoke all on function public.progression_admin_tables() from public,anon;
grant execute on function public.progression_admin_tables() to authenticated;

-- Marca a árvore de banco após a evolução semântica V2.10.0.
insert into public.ms_schema_meta(singleton,version) values(true,'2.10.0')
on conflict(singleton) do update set version=excluded.version,updated_at=now();

-- Endurecimento: caminhos antigos de edição mecânica ampla deixam de ser públicos.
revoke execute on function public.progression_upgrade_attribute(text,text,text) from authenticated;
revoke execute on function public.progression_submit_proposal(text,text,jsonb,integer,text) from authenticated;

commit;
-- Mundos Sombrios V2.10.1 — Hotfix operacional da Evolução Gradual
-- Corrige: solicitação sem PEG suficiente, aprovação com complemento automático,
-- concessão direta de evolução pelo Mestre/Co-Mestre/ADM e contratos de produção.
begin;

create schema if not exists private;

create or replace function private.evolution_fund_character_missing(
  p_table_id text,
  p_character_id text,
  p_amount integer,
  p_reason text,
  p_track_id uuid default null,
  p_reference text default null
) returns integer
language plpgsql
security definer
set search_path=public,private
as $$
declare
  w public.table_progression_wallets;
  a public.character_progression_accounts;
  u uuid;
begin
  if coalesce(p_amount,0)<=0 then return 0; end if;
  select c.user_id::uuid into u from public.characters c where c.id=p_character_id;
  if u is null then raise exception 'CHARACTER_NOT_FOUND'; end if;

  perform private.ensure_progression_wallet(p_table_id);
  update public.table_progression_wallets
     set balance=balance-p_amount,
         lifetime_distributed=lifetime_distributed+p_amount,
         updated_at=now()
   where table_id=p_table_id and balance>=p_amount
   returning * into w;
  if w.table_id is null then raise exception 'INSUFFICIENT_TABLE_PROGRESSION'; end if;

  insert into public.character_progression_accounts(table_id,character_id,user_id,balance,lifetime_granted)
  values(p_table_id,p_character_id,u,p_amount,p_amount)
  on conflict(table_id,character_id) do update
    set balance=public.character_progression_accounts.balance+p_amount,
        lifetime_granted=public.character_progression_accounts.lifetime_granted+p_amount,
        updated_at=now()
  returning * into a;

  insert into public.progression_transactions(table_id,character_id,actor_id,target_user_id,amount,balance_after,tx_type,reason,reference_id,metadata)
  values(
    p_table_id,p_character_id,auth.uid(),u,-p_amount,w.balance,'TABLE_GRANT_DEBIT',
    left(coalesce(p_reason,'Complemento automático para evolução'),500),p_reference,
    jsonb_build_object('character_id',p_character_id,'track_id',p_track_id,'auto_fund',true)
  );
  insert into public.progression_transactions(table_id,character_id,actor_id,target_user_id,amount,balance_after,tx_type,reason,reference_id,metadata)
  values(
    p_table_id,p_character_id,auth.uid(),u,p_amount,a.balance,'CHARACTER_GRANT',
    left(coalesce(p_reason,'Complemento automático para evolução'),500),p_reference,
    jsonb_build_object('track_id',p_track_id,'auto_fund',true)
  );
  return p_amount;
end;
$$;
revoke all on function private.evolution_fund_character_missing(text,text,integer,text,uuid,text) from public,anon,authenticated;

-- O Jogador pode solicitar assim que a trilha estiver pronta. PEG é verificado na aprovação.
create or replace function public.progression_request_semantic_upgrade(
 p_table_id text,p_character_id text,p_capability_type text,p_capability_key text,p_note text default ''
) returns public.evolution_upgrade_requests
language plpgsql security definer set search_path=public,private as $$
declare t public.character_evolution_tracks; c public.characters; a public.character_progression_accounts;
 r public.evolution_upgrade_requests; target integer; cost integer;
begin
 if auth.uid() is null or not private.character_in_table(p_table_id,p_character_id,auth.uid()) then raise exception 'CHARACTER_MEMBERSHIP_REQUIRED'; end if;
 if not exists(select 1 from public.characters where id=p_character_id and user_id::text=auth.uid()::text) then raise exception 'CHARACTER_MEMBERSHIP_REQUIRED'; end if;
 perform private.ensure_character_evolution_tracks(p_table_id,p_character_id);
 select * into t from public.character_evolution_tracks where table_id=p_table_id and character_id=p_character_id
 and capability_type=private.evolution_kind(p_capability_type) and capability_key=private.evolution_slug(p_capability_key) for update;
 if t.id is null then raise exception 'TRACK_NOT_FOUND'; end if;
 t:=private.evolution_refresh_track(t.id);
 if t.status<>'ready' then raise exception 'EVOLUTION_NOT_READY'; end if;
 select * into c from public.characters where id=p_character_id for update;
 select * into a from public.character_progression_accounts where table_id=p_table_id and character_id=p_character_id for update;
 if a.character_id is null then raise exception 'PROGRESSION_ACCOUNT_NOT_FOUND'; end if;
 target:=t.current_rank+1;cost:=private.evolution_cost(c.mode,t.capability_type,target);
 select * into r from public.evolution_upgrade_requests where track_id=t.id and status='pending' order by created_at limit 1 for update;
 if left(coalesce(p_note,''),12)='SELF_EVOLVE:' and a.balance<cost then raise exception 'INSUFFICIENT_CHARACTER_PROGRESSION'; end if;
 if r.id is not null and left(coalesce(p_note,''),12)<>'SELF_EVOLVE:' then raise exception 'UPGRADE_ALREADY_PENDING'; end if;
 if r.id is null then
  insert into public.evolution_upgrade_requests(table_id,character_id,user_id,track_id,from_rank,to_rank,recommended_cost,note)
  values(p_table_id,p_character_id,auth.uid(),t.id,t.current_rank,target,cost,left(coalesce(p_note,''),800)) returning * into r;
 end if;
 if left(coalesce(p_note,''),12)='SELF_EVOLVE:' then
  perform private.evolution_apply_upgrade(t.id,cost,false,false,'Evolução confirmada pelo jogador',r.id::text);
  update public.evolution_upgrade_requests set status='approved',from_rank=target-1,to_rank=target,final_cost=cost,
  decided_by=auth.uid(),decided_at=now(),decision_reason='Autonomia: sucessos aprovados e PEG suficiente'
  where id=r.id returning * into r;
 end if;
 return r;
end; $$;

revoke all on function public.progression_request_semantic_upgrade(text,text,text,text,text) from public,anon;
grant execute on function public.progression_request_semantic_upgrade(text,text,text,text,text) to authenticated;

-- Aprovação operacional: opcionalmente completa PEG da reserva e aplica tudo na mesma transação.
create or replace function public.progression_resolve_semantic_upgrade_v2(
  p_request_id uuid,
  p_approved boolean,
  p_final_cost integer default null,
  p_reason text default '',
  p_auto_fund_missing boolean default false
) returns jsonb
language plpgsql
security definer
set search_path=public,private
as $$
declare
  r public.evolution_upgrade_requests;
  a public.character_progression_accounts;
  result jsonb;
  cost integer;
  missing integer:=0;
  funded integer:=0;
  u uuid;
begin
  select * into r from public.evolution_upgrade_requests where id=p_request_id for update;
  if r.id is null then raise exception 'REQUEST_NOT_FOUND'; end if;
  if not public.can_manage_table(r.table_id) then raise exception 'GM_REQUIRED'; end if;
  if r.status<>'pending' then return jsonb_build_object('request',to_jsonb(r)); end if;

  if not p_approved then
    update public.evolution_upgrade_requests
       set status='rejected',decided_by=auth.uid(),decision_reason=left(coalesce(p_reason,''),500),decided_at=now()
     where id=r.id returning * into r;
    return jsonb_build_object('request',to_jsonb(r));
  end if;

  select c.user_id::uuid into u from public.characters c where c.id=r.character_id;
  insert into public.character_progression_accounts(table_id,character_id,user_id)
  values(r.table_id,r.character_id,u)
  on conflict(table_id,character_id) do nothing;
  select * into a from public.character_progression_accounts where table_id=r.table_id and character_id=r.character_id for update;

  cost:=greatest(0,coalesce(p_final_cost,r.recommended_cost));
  missing:=greatest(0,cost-coalesce(a.balance,0));
  if missing>0 then
    if not coalesce(p_auto_fund_missing,false) then raise exception 'INSUFFICIENT_CHARACTER_PROGRESSION'; end if;
    funded:=private.evolution_fund_character_missing(
      r.table_id,r.character_id,missing,
      'Complemento automático para evolução · '||coalesce(nullif(trim(p_reason),''),r.note,'Aprovação do Mestre'),
      r.track_id,r.id::text
    );
  end if;

  result:=private.evolution_apply_upgrade(
    r.track_id,cost,false,false,
    coalesce(nullif(trim(p_reason),''),r.note),r.id::text
  );
  update public.evolution_upgrade_requests
     set status='approved',final_cost=cost,decided_by=auth.uid(),decision_reason=left(coalesce(p_reason,''),500),decided_at=now()
   where id=r.id returning * into r;
  return jsonb_build_object('request',to_jsonb(r),'funded_missing',funded)||result;
end;
$$;
revoke all on function public.progression_resolve_semantic_upgrade_v2(uuid,boolean,integer,text,boolean) from public,anon;
grant execute on function public.progression_resolve_semantic_upgrade_v2(uuid,boolean,integer,text,boolean) to authenticated;

-- Mestre/Co-Mestre/ADM podem conceder uma evolução normal diretamente em trilha pronta.
create or replace function public.progression_grant_semantic_upgrade(
  p_table_id text,
  p_character_id text,
  p_capability_type text,
  p_capability_key text,
  p_auto_fund_missing boolean default false,
  p_reason text default ''
) returns jsonb
language plpgsql
security definer
set search_path=public,private
as $$
declare
  t public.character_evolution_tracks;
  c public.characters;
  a public.character_progression_accounts;
  target integer;
  cost integer;
  missing integer:=0;
  funded integer:=0;
  u uuid;
  result jsonb;
begin
  if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
  if trim(coalesce(p_reason,''))='' then raise exception 'REASON_REQUIRED'; end if;
  if not private.character_in_table(p_table_id,p_character_id,null) then raise exception 'CHARACTER_NOT_IN_TABLE'; end if;

  perform private.ensure_character_evolution_tracks(p_table_id,p_character_id);
  select * into t
    from public.character_evolution_tracks
   where table_id=p_table_id
     and character_id=p_character_id
     and capability_type=private.evolution_kind(p_capability_type)
     and capability_key=private.evolution_slug(p_capability_key)
   for update;
  if t.id is null then raise exception 'TRACK_NOT_FOUND'; end if;
  t:=private.evolution_refresh_track(t.id);
  if t.status<>'ready' then raise exception 'EVOLUTION_NOT_READY'; end if;

  select * into c from public.characters where id=p_character_id;
  target:=t.current_rank+1;
  cost:=private.evolution_cost(c.mode,t.capability_type,target);
  select c.user_id::uuid into u from public.characters c where c.id=p_character_id;
  insert into public.character_progression_accounts(table_id,character_id,user_id)
  values(p_table_id,p_character_id,u)
  on conflict(table_id,character_id) do nothing;
  select * into a from public.character_progression_accounts where table_id=p_table_id and character_id=p_character_id for update;
  missing:=greatest(0,cost-coalesce(a.balance,0));

  if missing>0 then
    if not coalesce(p_auto_fund_missing,false) then raise exception 'INSUFFICIENT_CHARACTER_PROGRESSION'; end if;
    funded:=private.evolution_fund_character_missing(
      p_table_id,p_character_id,missing,
      'Complemento automático para evolução · '||trim(p_reason),t.id,null
    );
  end if;

  result:=private.evolution_apply_upgrade(t.id,cost,false,false,trim(p_reason),null);
  return result||jsonb_build_object('funded_missing',funded);
end;
$$;
revoke all on function public.progression_grant_semantic_upgrade(text,text,text,text,boolean,text) from public,anon;
grant execute on function public.progression_grant_semantic_upgrade(text,text,text,text,boolean,text) to authenticated;

insert into public.ms_schema_meta(singleton,version) values(true,'2.10.1')
on conflict(singleton) do update set version=excluded.version,updated_at=now();

notify pgrst, 'reload schema';
commit;
-- Mundos Sombrios V2.10.1 — endurecimento de superfície RPC
-- Remove privilégios EXECUTE herdados por anon/PUBLIC sem retirar os grants explícitos de authenticated.
begin;
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and (
        p.proname like 'progression_%'
        or p.proname in ('fetch_character_view','save_character_secure','gm_update_character','update_table_recruitment_secure','can_access_table_session')
      )
  loop
    execute format('revoke execute on function %s from anon, public', r.sig);
  end loop;
end $$;
-- Os caminhos semânticos são a API pública autenticada da evolução.
grant execute on function public.progression_character_evolution_state(text,text) to authenticated;
grant execute on function public.progression_submit_evidence(text,text,text,text,integer,text,text) to authenticated;
grant execute on function public.progression_resolve_evidence(uuid,boolean,text) to authenticated;
grant execute on function public.progression_record_track_success(text,text,text,text,integer,text,text) to authenticated;
grant execute on function public.progression_request_training(text,text,text,text,text,integer,text,text) to authenticated;
grant execute on function public.progression_resolve_training(uuid,boolean,text) to authenticated;
grant execute on function public.progression_request_semantic_upgrade(text,text,text,text,text) to authenticated;
grant execute on function public.progression_resolve_semantic_upgrade_v2(uuid,boolean,integer,text,boolean) to authenticated;
grant execute on function public.progression_grant_semantic_upgrade(text,text,text,text,boolean,text) to authenticated;
grant execute on function public.progression_accelerate_track(text,text,text,text,boolean,text) to authenticated;
grant execute on function public.progression_set_track_requirement(text,text,text,text,text,boolean,text) to authenticated;
grant execute on function public.progression_submit_development(text,text,text,jsonb,integer,text) to authenticated;
grant execute on function public.progression_resolve_development(uuid,boolean,integer,text) to authenticated;
-- Base econômica/operacional utilizada pela UI.
grant execute on function public.progression_table_state(text) to authenticated;
grant execute on function public.progression_buy_table_points(text,integer) to authenticated;
grant execute on function public.progression_grant_character(text,text,integer,text) to authenticated;
grant execute on function public.progression_record_career_success(text,text,integer,text) to authenticated;
grant execute on function public.progression_reverse_grant(bigint,text) to authenticated;
grant execute on function public.progression_adjust_resource(text,text,text,numeric,text) to authenticated;
grant execute on function public.progression_request_resource(text,text,text,numeric,text) to authenticated;
grant execute on function public.progression_resolve_resource(uuid,boolean) to authenticated;
grant execute on function public.progression_admin_tables() to authenticated;
grant execute on function public.progression_admin_table_ledger(text,integer) to authenticated;
grant execute on function public.progression_admin_adjust_table(text,integer,text) to authenticated;
grant execute on function public.fetch_character_view(text,text) to authenticated;
grant execute on function public.save_character_secure(text,text,text,text,text,jsonb) to authenticated;
grant execute on function public.gm_update_character(text,text,text,text,text,text,jsonb) to authenticated;
grant execute on function public.update_table_recruitment_secure(text,text,text,jsonb) to authenticated;
grant execute on function public.can_access_table_session(text) to authenticated;
-- Atalhos mecânicos legados continuam desativados para authenticated e anon.
revoke execute on function public.progression_upgrade_attribute(text,text,text) from anon,authenticated,public;
revoke execute on function public.progression_submit_proposal(text,text,jsonb,integer,text) from anon,authenticated,public;
notify pgrst, 'reload schema';
commit;
