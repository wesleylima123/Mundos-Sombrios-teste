-- Compatibilidade para clientes que entram na Mesa usando codigo publico.
create or replace function public.progression_table_state(p_table_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_table_id text;
  has_access boolean;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select t.id into resolved_table_id
  from public.tables t
  where t.id = p_table_id or upper(t.code) = upper(p_table_id)
  limit 1;

  if resolved_table_id is null then
    raise exception 'TABLE_NOT_FOUND';
  end if;

  select exists (
    select 1 from public.table_members tm
    where tm.table_id = resolved_table_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
  ) or exists (
    select 1
    from public.tables t
    join public.profiles p on p.id = t.owner_id
    where t.id = resolved_table_id and p.auth_user_id = auth.uid()
  ) or exists (
    select 1 from public.profiles p
    where p.auth_user_id = auth.uid() and p.role = 'admin'
  ) into has_access;

  if not has_access then
    raise exception 'TABLE_ACCESS_REQUIRED';
  end if;

  return jsonb_build_object(
    'managed', false,
    'wallet', null,
    'myAccount', null,
    'accounts', '[]'::jsonb,
    'tracks', '[]'::jsonb,
    'tracksByCharacter', '{}'::jsonb,
    'evidenceRequests', '[]'::jsonb,
    'trainingRequests', '[]'::jsonb,
    'upgradeRequests', '[]'::jsonb,
    'developmentRequests', '[]'::jsonb,
    'evolutionEvents', '[]'::jsonb,
    'pendingProposals', '[]'::jsonb,
    'pendingResources', '[]'::jsonb,
    'recentTransactions', '[]'::jsonb,
    'config', null,
    'progressionAvailable', false
  );
end;
$$;

revoke all on function public.progression_table_state(text) from public, anon;
grant execute on function public.progression_table_state(text) to authenticated;