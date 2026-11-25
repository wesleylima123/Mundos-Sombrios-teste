-- Restaura a função completa de progressão (PEG/Evolução), que a parte 2 havia
-- trocado por uma versão simplificada. Mantém a busca da mesa por id OU por código.
create or replace function public.progression_table_state(p_table_id text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare v_resolved text; w public.table_progression_wallets; managed boolean; my_char text; my_account jsonb; rec record;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select t.id into v_resolved from public.tables t where t.id=p_table_id or upper(t.code)=upper(trim(p_table_id)) order by (t.id=p_table_id) desc limit 1;
 if v_resolved is null then raise exception 'TABLE_NOT_FOUND'; end if;
 p_table_id:=v_resolved;
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
