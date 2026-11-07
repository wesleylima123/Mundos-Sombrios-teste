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
