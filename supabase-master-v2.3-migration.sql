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
