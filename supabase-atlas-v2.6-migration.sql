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
