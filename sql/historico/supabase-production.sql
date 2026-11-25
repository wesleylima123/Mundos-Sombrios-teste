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
