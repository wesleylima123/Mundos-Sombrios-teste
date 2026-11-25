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
