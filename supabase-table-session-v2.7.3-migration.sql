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
