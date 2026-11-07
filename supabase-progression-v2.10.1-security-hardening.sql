-- Mundos Sombrios V2.10.1 — endurecimento de superfície RPC
-- Remove privilégios EXECUTE herdados por anon/PUBLIC sem retirar os grants explícitos de authenticated.
begin;
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and (
        p.proname like 'progression_%'
        or p.proname in ('fetch_character_view','save_character_secure','gm_update_character','update_table_recruitment_secure','can_access_table_session')
      )
  loop
    execute format('revoke execute on function %s from anon, public', r.sig);
  end loop;
end $$;
-- Os caminhos semânticos são a API pública autenticada da evolução.
grant execute on function public.progression_character_evolution_state(text,text) to authenticated;
grant execute on function public.progression_submit_evidence(text,text,text,text,integer,text,text) to authenticated;
grant execute on function public.progression_resolve_evidence(uuid,boolean,text) to authenticated;
grant execute on function public.progression_record_track_success(text,text,text,text,integer,text,text) to authenticated;
grant execute on function public.progression_request_training(text,text,text,text,text,integer,text,text) to authenticated;
grant execute on function public.progression_resolve_training(uuid,boolean,text) to authenticated;
grant execute on function public.progression_request_semantic_upgrade(text,text,text,text,text) to authenticated;
grant execute on function public.progression_resolve_semantic_upgrade_v2(uuid,boolean,integer,text,boolean) to authenticated;
grant execute on function public.progression_grant_semantic_upgrade(text,text,text,text,boolean,text) to authenticated;
grant execute on function public.progression_accelerate_track(text,text,text,text,boolean,text) to authenticated;
grant execute on function public.progression_set_track_requirement(text,text,text,text,text,boolean,text) to authenticated;
grant execute on function public.progression_submit_development(text,text,text,jsonb,integer,text) to authenticated;
grant execute on function public.progression_resolve_development(uuid,boolean,integer,text) to authenticated;
-- Base econômica/operacional utilizada pela UI.
grant execute on function public.progression_table_state(text) to authenticated;
grant execute on function public.progression_buy_table_points(text,integer) to authenticated;
grant execute on function public.progression_grant_character(text,text,integer,text) to authenticated;
grant execute on function public.progression_record_career_success(text,text,integer,text) to authenticated;
grant execute on function public.progression_reverse_grant(bigint,text) to authenticated;
grant execute on function public.progression_adjust_resource(text,text,text,numeric,text) to authenticated;
grant execute on function public.progression_request_resource(text,text,text,numeric,text) to authenticated;
grant execute on function public.progression_resolve_resource(uuid,boolean) to authenticated;
grant execute on function public.progression_admin_tables() to authenticated;
grant execute on function public.progression_admin_table_ledger(text,integer) to authenticated;
grant execute on function public.progression_admin_adjust_table(text,integer,text) to authenticated;
grant execute on function public.fetch_character_view(text,text) to authenticated;
grant execute on function public.save_character_secure(text,text,text,text,text,jsonb) to authenticated;
grant execute on function public.gm_update_character(text,text,text,text,text,text,jsonb) to authenticated;
grant execute on function public.update_table_recruitment_secure(text,text,text,jsonb) to authenticated;
grant execute on function public.can_access_table_session(text) to authenticated;
-- Atalhos mecânicos legados continuam desativados para authenticated e anon.
revoke execute on function public.progression_upgrade_attribute(text,text,text) from anon,authenticated,public;
revoke execute on function public.progression_submit_proposal(text,text,jsonb,integer,text) from anon,authenticated,public;
notify pgrst, 'reload schema';
commit;
