-- Corrige recursão infinita na política de leitura de public.profiles.
-- A política antiga consultava a própria tabela profiles para saber se o usuário
-- é admin. Agora essa checagem é feita por uma função security definer, que lê
-- profiles sem passar pela RLS.
create or replace function public.current_profile_is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where auth_user_id = auth.uid() and role = 'admin' and banned = false
  );
$$;
revoke all on function public.current_profile_is_active_admin() from public;
grant execute on function public.current_profile_is_active_admin() to anon, authenticated;

drop policy if exists ms_profiles_select on public.profiles;
create policy ms_profiles_select on public.profiles for select using (
  auth_user_id = auth.uid() or public.current_profile_is_active_admin()
);

-- Corrige recursão infinita entre as políticas de public.tables e public.table_members.
-- A leitura de table_members consultava tables, e a de tables consultava table_members.
create or replace function public.current_user_owns_table(p_table_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.tables tb where tb.id=p_table_id and tb.owner_id=auth.uid()::text);
$$;
revoke all on function public.current_user_owns_table(text) from public;
grant execute on function public.current_user_owns_table(text) to anon, authenticated;

drop policy if exists ms_table_members_select on public.table_members;
create policy ms_table_members_select on public.table_members for select using (
  user_id=auth.uid() or public.current_user_owns_table(table_members.table_id) or public.current_profile_role()='admin'
);
