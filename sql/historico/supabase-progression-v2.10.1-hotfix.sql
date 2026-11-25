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
