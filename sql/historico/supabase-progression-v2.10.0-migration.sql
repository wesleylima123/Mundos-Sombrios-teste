-- Mundos Sombrios V2.10.0 — Evolução Gradual Semântica
-- Camadas: Sucessos = elegibilidade; PEG = efetivação; Mestre = reconhecimento/autoridade.
-- Regra de treino adotada nesta versão: Básico CD13/+1; Prático CD18/+2; Difícil CD23/+3.
begin;

create schema if not exists private;

alter table public.progression_proposals add column if not exists proposal_kind text not null default 'legacy';
alter table public.progression_proposals add column if not exists focus_type text;

alter table public.progression_transactions drop constraint if exists progression_transactions_tx_type_check;
alter table public.progression_transactions add constraint progression_transactions_tx_type_check check (tx_type in (
  'SOUL_PURCHASE','ADMIN_TABLE_GRANT','ADMIN_TABLE_REMOVE','TABLE_GRANT_DEBIT','CHARACTER_GRANT',
  'CHARACTER_GRANT_REVERSAL','ATTRIBUTE_UPGRADE','PROPOSAL_SPEND','RESOURCE_ADJUST','RESOURCE_REQUEST_APPROVED','SYSTEM',
  'SEMANTIC_EVOLUTION','EVOLUTION_ACCELERATION','DEVELOPMENT_APPROVED'
));

create table if not exists public.character_evolution_tracks (
  id uuid primary key default gen_random_uuid(),
  table_id text not null references public.tables(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  capability_type text not null check (capability_type in ('attribute','skill','advantage','talent','power','ritual','class','other')),
  capability_key text not null,
  label text not null,
  current_rank integer not null default 0 check (current_rank >= 0),
  successes integer not null default 0 check (successes >= 0),
  successes_required integer not null default 10 check (successes_required >= 10),
  status text not null default 'progress' check (status in ('progress','ready')),
  requirements jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(table_id,character_id,capability_type,capability_key)
);
create index if not exists idx_evo_tracks_character on public.character_evolution_tracks(table_id,character_id,capability_type);
create index if not exists idx_evo_tracks_ready on public.character_evolution_tracks(table_id,status) where status='ready';

create table if not exists public.character_evolution_events (
  id bigint generated always as identity primary key,
  table_id text not null references public.tables(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  track_id uuid references public.character_evolution_tracks(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  successes integer not null default 0,
  session_label text not null default '',
  note text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_evo_events_character on public.character_evolution_events(table_id,character_id,created_at desc);
create index if not exists idx_evo_events_track on public.character_evolution_events(track_id,created_at desc);

create table if not exists public.evolution_evidence_requests (
  id uuid primary key default gen_random_uuid(),
  table_id text not null references public.tables(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references public.character_evolution_tracks(id) on delete cascade,
  successes integer not null check (successes between 1 and 10),
  session_label text not null default '',
  note text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  applied_successes integer not null default 0,
  decided_by uuid references auth.users(id) on delete set null,
  decision_reason text not null default '',
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_evo_evidence_queue on public.evolution_evidence_requests(table_id,status,created_at);

create table if not exists public.evolution_training_requests (
  id uuid primary key default gen_random_uuid(),
  table_id text not null references public.tables(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references public.character_evolution_tracks(id) on delete cascade,
  training_type text not null check(training_type in ('basic','practical','difficult')),
  environment_modifier integer not null default 0 check(environment_modifier in (-2,0,2)),
  session_label text not null,
  note text not null,
  status text not null default 'pending' check(status in ('pending','resolved','rejected')),
  roll integer,
  total integer,
  dc integer,
  success boolean,
  awarded_successes integer not null default 0,
  consequence text not null default '',
  decided_by uuid references auth.users(id) on delete set null,
  decision_reason text not null default '',
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_evo_training_queue on public.evolution_training_requests(table_id,status,created_at);

create table if not exists public.evolution_upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  table_id text not null references public.tables(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references public.character_evolution_tracks(id) on delete cascade,
  from_rank integer not null,
  to_rank integer not null,
  recommended_cost integer not null check(recommended_cost >= 0),
  final_cost integer,
  note text not null default '',
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  decided_by uuid references auth.users(id) on delete set null,
  decision_reason text not null default '',
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_evo_upgrade_queue on public.evolution_upgrade_requests(table_id,status,created_at);
create unique index if not exists idx_evo_upgrade_one_pending on public.evolution_upgrade_requests(track_id) where status='pending';

alter table public.character_evolution_tracks enable row level security;
alter table public.character_evolution_events enable row level security;
alter table public.evolution_evidence_requests enable row level security;
alter table public.evolution_training_requests enable row level security;
alter table public.evolution_upgrade_requests enable row level security;
revoke all on public.character_evolution_tracks,public.character_evolution_events,public.evolution_evidence_requests,public.evolution_training_requests,public.evolution_upgrade_requests from anon,authenticated;

create or replace function private.evolution_slug(p_value text)
returns text language sql immutable set search_path='' as $$
  select coalesce(nullif(trim(both '-' from regexp_replace(
    translate(lower(coalesce(p_value,'')),'áàãâäéèêëíìîïóòõôöúùûüçñ','aaaaaeeeeiiiiooooouuuucn'),
    '[^a-z0-9]+','-','g')),''),'capacidade');
$$;
revoke all on function private.evolution_slug(text) from public,anon,authenticated;

create or replace function private.evolution_kind(p_value text)
returns text language sql immutable set search_path='' as $$
  select case
    when private.evolution_slug(p_value) in ('pericia','skill') then 'skill'
    when private.evolution_slug(p_value) in ('vantagem','advantage') then 'advantage'
    when private.evolution_slug(p_value) in ('talento','talent') then 'talent'
    when private.evolution_slug(p_value) like '%ritual%' then 'ritual'
    when private.evolution_slug(p_value) like any(array['%poder%','%prodig%','%escrip%','%potenc%','power']) then 'power'
    when private.evolution_slug(p_value) like any(array['%classe%','%cargo%','class']) then 'class'
    when private.evolution_slug(p_value) in ('for','vig','agi','int','prn','pre','atributo','attribute') then 'attribute'
    else 'other' end;
$$;
revoke all on function private.evolution_kind(text) from public,anon,authenticated;

create or replace function private.evolution_success_required(p_next_rank integer)
returns integer language sql immutable set search_path='' as $$ select greatest(10,greatest(1,coalesce(p_next_rank,1))*10); $$;
revoke all on function private.evolution_success_required(integer) from public,anon,authenticated;

create or replace function private.evolution_class_requirements()
returns jsonb language sql immutable set search_path='' as $$
select jsonb_build_array(
  jsonb_build_object('key','narrative_milestone','label','Marco narrativo designado pelo Mestre','done',false),
  jsonb_build_object('key','superior_approval','label','Aprovação de figura superior / organização','done',false),
  jsonb_build_object('key','ideology','label','Conduta coerente com a ideologia da classe','done',false),
  jsonb_build_object('key','new_domain','label','Novo domínio, ritual ou habilidade especial','done',false),
  jsonb_build_object('key','acceptance_rite','label','Ritual de aceitação ou provação','done',false)
); $$;
revoke all on function private.evolution_class_requirements() from public,anon,authenticated;

create or replace function private.evolution_requirements(p_type text,p_mode text default 'exodo')
returns jsonb language sql immutable set search_path='' as $$
select case private.evolution_kind(p_type)
  when 'class' then private.evolution_class_requirements()
  when 'advantage' then jsonb_build_array(
    jsonb_build_object('key','narrative_justification','label','Justificativa narrativa / social reconhecida pelo Mestre','done',false)
  )
  when 'power' then jsonb_build_array(
    jsonb_build_object('key','power_breakthrough','label',case when lower(coalesce(p_mode,'exodo'))='ocultatun'
      then 'Ruptura, revelação ou influência sobrenatural reconhecida'
      else 'Descoberta, assimilação ou manifestação genética reconhecida' end,'done',false)
  )
  when 'ritual' then jsonb_build_array(
    jsonb_build_object('key','ritual_breakthrough','label',case when lower(coalesce(p_mode,'exodo'))='ocultatun'
      then 'Estudo, exposição ou ruptura ritual reconhecida'
      else 'Experimentação, exposição ou domínio ritual reconhecido' end,'done',false)
  )
  else '[]'::jsonb end;
$$;
revoke all on function private.evolution_requirements(text,text) from public,anon,authenticated;

create or replace function private.evolution_requirements_done(p_requirements jsonb)
returns boolean language sql immutable set search_path='' as $$
  select not exists(select 1 from jsonb_array_elements(coalesce(p_requirements,'[]'::jsonb)) x where coalesce((x->>'done')::boolean,false)=false);
$$;
revoke all on function private.evolution_requirements_done(jsonb) from public,anon,authenticated;

create or replace function private.evolution_cost(p_mode text,p_type text,p_target_rank integer)
returns integer language sql immutable set search_path='' as $$
select case private.evolution_kind(p_type)
  when 'attribute' then case when lower(coalesce(p_mode,'exodo'))='ocultatun' then 20*greatest(1,p_target_rank) else 10*greatest(1,p_target_rank) end
  when 'skill' then 10*greatest(1,p_target_rank)
  when 'advantage' then greatest(20,10*greatest(1,p_target_rank))
  when 'talent' then greatest(20,10*greatest(1,p_target_rank))
  when 'power' then 20*greatest(1,p_target_rank)
  when 'ritual' then 20*greatest(1,p_target_rank)
  when 'class' then 30*greatest(1,p_target_rank)
  else 10*greatest(1,p_target_rank) end;
$$;
revoke all on function private.evolution_cost(text,text,integer) from public,anon,authenticated;

-- Risco temático não aplica mutações/sanidade automaticamente: ele cria pressão auditável
-- para resolução do Mestre, preservando a agência narrativa do sistema de mesa.
create or replace function private.evolution_risk_profile(p_mode text,p_type text,p_training_type text,p_risk_count integer)
returns jsonb language sql immutable set search_path='' as $$
select case when private.evolution_kind(p_type) not in ('power','ritual') then '{}'::jsonb
  when lower(coalesce(p_mode,'exodo'))='ocultatun' then jsonb_build_object(
    'theme','ruptura_ocultatun',
    'label','Ruptura do Véu',
    'risk_count',greatest(1,coalesce(p_risk_count,1)),
    'severity',case when coalesce(p_risk_count,1)>=4 then 'critical' when coalesce(p_risk_count,1)>=2 then 'elevated' else 'latent' end,
    'consequence','A falha amplia a influência do oculto: o Mestre pode converter o risco em influência de entidade, manifestação/ritual involuntário, perda de sanidade ou ruptura com o normal.',
    'master_prompt','Resolver em cena conforme o pacto, a exposição e o preço psíquico/espiritual assumido pelo personagem.'
  )
  else jsonb_build_object(
    'theme','instabilidade_exodo',
    'label','Pressão do Gene Êxodo',
    'risk_count',greatest(1,coalesce(p_risk_count,1)),
    'severity',case when coalesce(p_risk_count,1)>=4 then 'critical' when coalesce(p_risk_count,1)>=2 then 'elevated' else 'latent' end,
    'consequence','A falha amplia a instabilidade genética: o Mestre pode converter o risco em novo estigma, mutação de prodígio, assimilação não planejada ou dano ao corpo/mente.',
    'master_prompt','Resolver em cena conforme a manifestação do Gene Êxodo, a pressão do treino e o estado físico/mental do personagem.'
  ) end;
$$;
revoke all on function private.evolution_risk_profile(text,text,text,integer) from public,anon,authenticated;

create or replace function private.ensure_evolution_track(
  p_table_id text,p_character_id text,p_type text,p_key text,p_label text,p_rank integer,p_metadata jsonb default '{}'::jsonb
) returns public.character_evolution_tracks language plpgsql security definer set search_path=public,private as $$
declare r public.character_evolution_tracks; k text:=private.evolution_slug(p_key); t text:=private.evolution_kind(p_type); req jsonb; m text:=lower(coalesce(p_metadata->>'mode','exodo'));
begin
  req:=private.evolution_requirements(t,m);
  insert into public.character_evolution_tracks(table_id,character_id,capability_type,capability_key,label,current_rank,successes_required,requirements,metadata)
    values(p_table_id,p_character_id,t,k,left(coalesce(nullif(trim(p_label),''),p_key,'Capacidade'),180),greatest(0,coalesce(p_rank,0)),private.evolution_success_required(greatest(0,coalesce(p_rank,0))+1),req,coalesce(p_metadata,'{}'::jsonb))
  on conflict(table_id,character_id,capability_type,capability_key) do update set
    label=excluded.label,
    current_rank=case when public.character_evolution_tracks.successes=0 then excluded.current_rank else public.character_evolution_tracks.current_rank end,
    successes_required=case when public.character_evolution_tracks.successes=0 then private.evolution_success_required(excluded.current_rank+1) else public.character_evolution_tracks.successes_required end,
    requirements=case when jsonb_array_length(coalesce(public.character_evolution_tracks.requirements,'[]'::jsonb))=0 and jsonb_array_length(coalesce(excluded.requirements,'[]'::jsonb))>0 then excluded.requirements else public.character_evolution_tracks.requirements end,
    metadata=public.character_evolution_tracks.metadata||excluded.metadata,
    updated_at=now()
  returning * into r;
  return r;
end; $$;
revoke all on function private.ensure_evolution_track(text,text,text,text,text,integer,jsonb) from public,anon,authenticated;

create or replace function private.ensure_character_evolution_tracks(p_table_id text,p_character_id text)
returns void language plpgsql security definer set search_path=public,private as $$
declare c public.characters; p jsonb; item jsonb; raw text; m text[]; k text; rank integer; class_name text; mode text;
begin
  select * into c from public.characters where id=p_character_id;
  if c.id is null then raise exception 'CHARACTER_NOT_FOUND'; end if;
  p:=coalesce(c.payload,'{}'::jsonb);
  mode:=lower(coalesce(nullif(c.mode,''),nullif(p->>'mode',''),'exodo'));
  insert into public.character_progression_accounts(table_id,character_id,user_id) values(p_table_id,p_character_id,c.user_id::uuid) on conflict(table_id,character_id) do nothing;

  foreach k in array array['for','vig','agi','int','prn','pre'] loop
    begin rank:=coalesce((p->'stats'->>k)::integer,0); exception when others then rank:=0; end;
    perform private.ensure_evolution_track(p_table_id,p_character_id,'attribute',k,upper(k),rank,jsonb_build_object('source','stats','mode',mode));
  end loop;

  if jsonb_typeof(p->'skills')='array' and jsonb_array_length(p->'skills')>0 then
    for item in select value from jsonb_array_elements(p->'skills') loop
      begin rank:=greatest(1,coalesce((item->>'grade')::integer,(item->>'rank')::integer,1)); exception when others then rank:=1; end;
      if trim(coalesce(item->>'name',item->>'label',''))<>'' then
        perform private.ensure_evolution_track(p_table_id,p_character_id,private.evolution_kind(coalesce(item->>'type',item->>'kind','Perícia')),coalesce(item->>'name',item->>'label'),coalesce(item->>'name',item->>'label'),rank,jsonb_build_object('source','skills','mode',mode));
      end if;
    end loop;
  elsif jsonb_typeof(p->'skillsHtml')='array' then
    for item in select value from jsonb_array_elements(p->'skillsHtml') loop
      raw:=regexp_replace(item#>>'{}','<[^>]+>',' ','g');
      m:=regexp_match(raw,'(Perícia|Pericia|Vantagem|Talento)\s*:\s*(.+?)\s*\(G\s*([0-9]+)\)','i');
      if m is not null then
        perform private.ensure_evolution_track(p_table_id,p_character_id,private.evolution_kind(m[1]),m[2],trim(m[2]),greatest(1,m[3]::integer),jsonb_build_object('source','skillsHtml','mode',mode));
      end if;
    end loop;
  end if;

  if jsonb_typeof(p->'powers')='array' then
    for item in select value from jsonb_array_elements(p->'powers') loop
      if trim(coalesce(item->>'name',''))<>'' then
        begin rank:=greatest(1,coalesce((item->>'progressionRank')::integer,(item->>'grade')::integer,1)); exception when others then rank:=1; end;
        perform private.ensure_evolution_track(p_table_id,p_character_id,'power',coalesce(nullif(item->>'id',''),item->>'name'),item->>'name',rank,jsonb_build_object('source','powers','powerId',item->>'id','mode',mode));
      end if;
    end loop;
  end if;

  if jsonb_typeof(p->'rituals')='array' then
    for item in select value from jsonb_array_elements(p->'rituals') loop
      if coalesce((item->>'known')::boolean,true) and trim(coalesce(item->>'name',item->>'id',''))<>'' then
        begin rank:=greatest(1,coalesce((item->>'progressionRank')::integer,1)); exception when others then rank:=1; end;
        perform private.ensure_evolution_track(p_table_id,p_character_id,'ritual',coalesce(nullif(item->>'id',''),item->>'name'),coalesce(item->>'name',item->>'id','Ritual'),rank,jsonb_build_object('source','rituals','ritualId',item->>'id','mode',mode));
      end if;
    end loop;
  end if;

  class_name:=coalesce(nullif(p->>'className',''),c.class_name,'Classe / Cargo');
  begin rank:=greatest(1,coalesce((p#>>'{progression,classRank}')::integer,1)); exception when others then rank:=1; end;
  perform private.ensure_evolution_track(p_table_id,p_character_id,'class','class',class_name,rank,jsonb_build_object('source','class','className',class_name,'mode',mode));
end; $$;
revoke all on function private.ensure_character_evolution_tracks(text,text) from public,anon,authenticated;

create or replace function private.evolution_refresh_track(p_track_id uuid)
returns public.character_evolution_tracks language plpgsql security definer set search_path=public,private as $$
declare r public.character_evolution_tracks;
begin
  update public.character_evolution_tracks set
    successes_required=private.evolution_success_required(current_rank+1),
    status=case when successes>=private.evolution_success_required(current_rank+1) and private.evolution_requirements_done(requirements) then 'ready' else 'progress' end,
    updated_at=now()
  where id=p_track_id returning * into r;
  return r;
end; $$;
revoke all on function private.evolution_refresh_track(uuid) from public,anon,authenticated;

create or replace function private.evolution_add_event(p_table_id text,p_character_id text,p_track_id uuid,p_event_type text,p_successes integer,p_session text,p_note text,p_metadata jsonb default '{}'::jsonb)
returns public.character_evolution_events language plpgsql security definer set search_path=public,private as $$
declare e public.character_evolution_events;
begin
 insert into public.character_evolution_events(table_id,character_id,track_id,actor_id,event_type,successes,session_label,note,metadata)
 values(p_table_id,p_character_id,p_track_id,auth.uid(),p_event_type,coalesce(p_successes,0),left(coalesce(p_session,''),180),left(coalesce(p_note,''),1200),coalesce(p_metadata,'{}'::jsonb)) returning * into e;
 return e;
end; $$;
revoke all on function private.evolution_add_event(text,text,uuid,text,integer,text,text,jsonb) from public,anon,authenticated;

create or replace function private.evolution_add_success(p_track_id uuid,p_successes integer,p_event_type text,p_session text,p_note text,p_metadata jsonb default '{}'::jsonb)
returns integer language plpgsql security definer set search_path=public,private as $$
declare t public.character_evolution_tracks; applied integer;
begin
 select * into t from public.character_evolution_tracks where id=p_track_id for update;
 if t.id is null then raise exception 'TRACK_NOT_FOUND'; end if;
 applied:=least(greatest(0,coalesce(p_successes,0)),greatest(0,t.successes_required-t.successes));
 update public.character_evolution_tracks set successes=successes+applied where id=t.id;
 perform private.evolution_refresh_track(t.id);
 perform private.evolution_add_event(t.table_id,t.character_id,t.id,p_event_type,applied,p_session,p_note,coalesce(p_metadata,'{}'::jsonb)||jsonb_build_object('requested',coalesce(p_successes,0)));
 return applied;
end; $$;
revoke all on function private.evolution_add_success(uuid,integer,text,text,text,jsonb) from public,anon,authenticated;

create or replace function public.progression_character_evolution_state(p_table_id text,p_character_id text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare managed boolean; own boolean; a public.character_progression_accounts;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 managed:=public.can_manage_table(p_table_id);
 own:=private.character_in_table(p_table_id,p_character_id,auth.uid());
 if not managed and not own then raise exception 'TABLE_ACCESS_REQUIRED'; end if;
 perform private.ensure_character_evolution_tracks(p_table_id,p_character_id);
 select * into a from public.character_progression_accounts where table_id=p_table_id and character_id=p_character_id;
 return jsonb_build_object(
  'table_id',p_table_id,'character_id',p_character_id,'canManage',managed,'isOwner',own,
  'account',to_jsonb(a),
  'tracks',(select coalesce(jsonb_agg(to_jsonb(t) order by t.capability_type,t.label),'[]'::jsonb) from public.character_evolution_tracks t where t.table_id=p_table_id and t.character_id=p_character_id),
  'events',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) from (select * from public.character_evolution_events e where e.table_id=p_table_id and e.character_id=p_character_id order by e.created_at desc limit 80) x),
  'evidenceRequests',(select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb) from public.evolution_evidence_requests r where r.table_id=p_table_id and r.character_id=p_character_id and (managed or r.user_id=auth.uid())),
  'trainingRequests',(select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb) from public.evolution_training_requests r where r.table_id=p_table_id and r.character_id=p_character_id and (managed or r.user_id=auth.uid())),
  'upgradeRequests',(select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb) from public.evolution_upgrade_requests r where r.table_id=p_table_id and r.character_id=p_character_id and (managed or r.user_id=auth.uid())),
  'developmentRequests',(select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb) from public.progression_proposals r where r.table_id=p_table_id and r.character_id=p_character_id and r.proposal_kind='development' and (managed or r.user_id=auth.uid())),
  'trainingRules',jsonb_build_object('basic',jsonb_build_object('dc',13,'successes',1),'practical',jsonb_build_object('dc',18,'successes',2),'difficult',jsonb_build_object('dc',23,'successes',3),'maxSuccessesPerPeriod',3)
 );
end; $$;
revoke all on function public.progression_character_evolution_state(text,text) from public,anon;
grant execute on function public.progression_character_evolution_state(text,text) to authenticated;

create or replace function public.progression_submit_evidence(p_table_id text,p_character_id text,p_capability_type text,p_capability_key text,p_successes integer,p_session_label text,p_note text)
returns public.evolution_evidence_requests language plpgsql security definer set search_path=public,private as $$
declare t public.character_evolution_tracks; r public.evolution_evidence_requests;
begin
 if not private.character_in_table(p_table_id,p_character_id,auth.uid()) then raise exception 'CHARACTER_MEMBERSHIP_REQUIRED'; end if;
 if p_successes not between 1 and 10 or trim(coalesce(p_note,''))='' then raise exception 'EVIDENCE_REQUIRED'; end if;
 perform private.ensure_character_evolution_tracks(p_table_id,p_character_id);
 select * into t from public.character_evolution_tracks where table_id=p_table_id and character_id=p_character_id and capability_type=private.evolution_kind(p_capability_type) and capability_key=private.evolution_slug(p_capability_key);
 if t.id is null then raise exception 'TRACK_NOT_FOUND'; end if;
 insert into public.evolution_evidence_requests(table_id,character_id,user_id,track_id,successes,session_label,note)
 values(p_table_id,p_character_id,auth.uid(),t.id,p_successes,left(coalesce(p_session_label,''),180),left(trim(p_note),1200)) returning * into r;
 return r;
end; $$;
revoke all on function public.progression_submit_evidence(text,text,text,text,integer,text,text) from public,anon;
grant execute on function public.progression_submit_evidence(text,text,text,text,integer,text,text) to authenticated;

create or replace function public.progression_resolve_evidence(p_request_id uuid,p_approved boolean,p_reason text default '')
returns public.evolution_evidence_requests language plpgsql security definer set search_path=public,private as $$
declare r public.evolution_evidence_requests; applied integer:=0;
begin
 select * into r from public.evolution_evidence_requests where id=p_request_id for update;
 if r.id is null then raise exception 'REQUEST_NOT_FOUND'; end if;
 if not public.can_manage_table(r.table_id) then raise exception 'GM_REQUIRED'; end if;
 if r.status<>'pending' then return r; end if;
 if p_approved then applied:=private.evolution_add_success(r.track_id,r.successes,'SCENE_SUCCESS',r.session_label,r.note,jsonb_build_object('requestId',r.id)); end if;
 update public.evolution_evidence_requests set status=case when p_approved then 'approved' else 'rejected' end,applied_successes=applied,decided_by=auth.uid(),decision_reason=left(coalesce(p_reason,''),500),decided_at=now() where id=r.id returning * into r;
 return r;
end; $$;
revoke all on function public.progression_resolve_evidence(uuid,boolean,text) from public,anon;
grant execute on function public.progression_resolve_evidence(uuid,boolean,text) to authenticated;

create or replace function public.progression_record_track_success(p_table_id text,p_character_id text,p_capability_type text,p_capability_key text,p_successes integer,p_session_label text,p_note text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare t public.character_evolution_tracks; applied integer;
begin
 if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
 if p_successes not between 1 and 20 or trim(coalesce(p_note,''))='' then raise exception 'SUCCESS_AND_REASON_REQUIRED'; end if;
 perform private.ensure_character_evolution_tracks(p_table_id,p_character_id);
 select * into t from public.character_evolution_tracks where table_id=p_table_id and character_id=p_character_id and capability_type=private.evolution_kind(p_capability_type) and capability_key=private.evolution_slug(p_capability_key);
 if t.id is null then raise exception 'TRACK_NOT_FOUND'; end if;
 applied:=private.evolution_add_success(t.id,p_successes,'GM_SUCCESS',p_session_label,p_note,jsonb_build_object('direct',true));
 select * into t from public.character_evolution_tracks where id=t.id;
 return jsonb_build_object('track',to_jsonb(t),'applied_successes',applied);
end; $$;
revoke all on function public.progression_record_track_success(text,text,text,text,integer,text,text) from public,anon;
grant execute on function public.progression_record_track_success(text,text,text,text,integer,text,text) to authenticated;

create or replace function public.progression_request_training(p_table_id text,p_character_id text,p_capability_type text,p_capability_key text,p_training_type text,p_environment_modifier integer,p_session_label text,p_note text)
returns public.evolution_training_requests language plpgsql security definer set search_path=public,private as $$
declare t public.character_evolution_tracks; r public.evolution_training_requests; kind text:=lower(trim(coalesce(p_training_type,'practical')));
begin
 if not private.character_in_table(p_table_id,p_character_id,auth.uid()) then raise exception 'CHARACTER_MEMBERSHIP_REQUIRED'; end if;
 if kind not in ('basic','practical','difficult') or coalesce(p_environment_modifier,0) not in (-2,0,2) or trim(coalesce(p_session_label,''))='' or trim(coalesce(p_note,''))='' then raise exception 'INVALID_TRAINING'; end if;
 perform private.ensure_character_evolution_tracks(p_table_id,p_character_id);
 select * into t from public.character_evolution_tracks where table_id=p_table_id and character_id=p_character_id and capability_type=private.evolution_kind(p_capability_type) and capability_key=private.evolution_slug(p_capability_key);
 if t.id is null then raise exception 'TRACK_NOT_FOUND'; end if;
 insert into public.evolution_training_requests(table_id,character_id,user_id,track_id,training_type,environment_modifier,session_label,note)
 values(p_table_id,p_character_id,auth.uid(),t.id,kind,p_environment_modifier,left(p_session_label,180),left(trim(p_note),1200)) returning * into r;
 return r;
end; $$;
revoke all on function public.progression_request_training(text,text,text,text,text,integer,text,text) from public,anon;
grant execute on function public.progression_request_training(text,text,text,text,text,integer,text,text) to authenticated;

create or replace function public.progression_resolve_training(p_request_id uuid,p_approved boolean,p_reason text default '')
returns public.evolution_training_requests language plpgsql security definer set search_path=public,private as $$
declare r public.evolution_training_requests; t public.character_evolution_tracks; c public.characters; v_roll integer; v_total integer; v_dc integer; v_award integer; v_used integer; v_room integer; v_success boolean; v_consequence text:=''; v_mode text:='exodo'; v_risk_count integer:=0; v_risk jsonb:='{}'::jsonb;
begin
 select * into r from public.evolution_training_requests where id=p_request_id for update;
 if r.id is null then raise exception 'REQUEST_NOT_FOUND'; end if;
 if not public.can_manage_table(r.table_id) then raise exception 'GM_REQUIRED'; end if;
 if r.status<>'pending' then return r; end if;
 if not p_approved then update public.evolution_training_requests set status='rejected',decided_by=auth.uid(),decision_reason=left(coalesce(p_reason,''),500),decided_at=now() where id=r.id returning * into r; return r; end if;
 select * into t from public.character_evolution_tracks where id=r.track_id for update;
 select * into c from public.characters where id=r.character_id;
 v_mode:=lower(coalesce(nullif(c.mode,''),nullif(t.metadata->>'mode',''),'exodo'));
 v_dc:=case r.training_type when 'basic' then 13 when 'difficult' then 23 else 18 end;
 v_award:=case r.training_type when 'basic' then 1 when 'difficult' then 3 else 2 end;
 v_roll:=floor(random()*20)::integer+1;
 v_total:=v_roll+t.current_rank+r.environment_modifier;
 v_success:=v_total>=v_dc;
 select coalesce(sum(e.successes),0)::integer into v_used from public.character_evolution_events e where e.track_id=t.id and e.event_type='TRAINING_SUCCESS' and e.metadata->>'period'=r.session_label;
 v_room:=greatest(0,3-v_used);
 if v_success then v_award:=least(v_award,v_room); else v_award:=0; end if;
 if not v_success and r.training_type='practical' then v_consequence:='Fadiga temporária: -1 em testes da capacidade até o próximo descanso ou desvantagem na próxima tentativa.'; end if;
 if not v_success and r.training_type='difficult' then v_consequence:='Penalidade extensiva: -2 em testes relacionados por 1d4 dias ou aflição narrativa grave, a critério do Mestre.'; end if;
 if v_award>0 then
   if t.capability_type in ('power','ritual') then
     update public.character_evolution_tracks set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('discoveries',coalesce((metadata->>'discoveries')::integer,0)+1,'last_discovery_at',now()::text,'mode',v_mode),updated_at=now() where id=t.id returning * into t;
   end if;
   perform private.evolution_add_success(t.id,v_award,'TRAINING_SUCCESS',r.session_label,r.note,jsonb_build_object('requestId',r.id,'period',r.session_label,'trainingType',r.training_type,'roll',v_roll,'total',v_total,'dc',v_dc,'environmentModifier',r.environment_modifier,'mode',v_mode));
 else
   if not v_success and t.capability_type in ('power','ritual') then
     begin v_risk_count:=coalesce((t.metadata->>'risk_count')::integer,0)+1; exception when others then v_risk_count:=1; end;
     v_risk:=private.evolution_risk_profile(v_mode,t.capability_type,r.training_type,v_risk_count);
     if trim(coalesce(v_consequence,''))<>'' then v_consequence:=v_consequence||' · '||(v_risk->>'consequence'); else v_consequence:=v_risk->>'consequence'; end if;
     update public.character_evolution_tracks set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
       'mode',v_mode,'risk_count',v_risk_count,'risk_theme',v_risk->>'theme','risk_label',v_risk->>'label','risk_severity',v_risk->>'severity',
       'last_risk_consequence',v_consequence,'last_risk_at',now()::text,'risk_profile',v_risk
     ),updated_at=now() where id=t.id returning * into t;
   end if;
   perform private.evolution_add_event(r.table_id,r.character_id,t.id,'TRAINING_FAILURE',0,r.session_label,r.note,jsonb_build_object('requestId',r.id,'period',r.session_label,'trainingType',r.training_type,'roll',v_roll,'total',v_total,'dc',v_dc,'environmentModifier',r.environment_modifier,'consequence',v_consequence,'mode',v_mode,'riskCount',v_risk_count,'riskProfile',v_risk));
 end if;
 update public.evolution_training_requests set status='resolved',roll=v_roll,total=v_total,dc=v_dc,success=v_success,awarded_successes=v_award,consequence=v_consequence,decided_by=auth.uid(),decision_reason=left(coalesce(p_reason,''),500),decided_at=now() where id=r.id returning * into r;
 return r;
end; $$;
revoke all on function public.progression_resolve_training(uuid,boolean,text) from public,anon;
grant execute on function public.progression_resolve_training(uuid,boolean,text) to authenticated;

create or replace function public.progression_request_semantic_upgrade(p_table_id text,p_character_id text,p_capability_type text,p_capability_key text,p_note text default '')
returns public.evolution_upgrade_requests language plpgsql security definer set search_path=public,private as $$
declare t public.character_evolution_tracks; c public.characters; a public.character_progression_accounts; r public.evolution_upgrade_requests; target integer; cost integer;
begin
 if not private.character_in_table(p_table_id,p_character_id,auth.uid()) then raise exception 'CHARACTER_MEMBERSHIP_REQUIRED'; end if;
 perform private.ensure_character_evolution_tracks(p_table_id,p_character_id);
 select * into t from public.character_evolution_tracks where table_id=p_table_id and character_id=p_character_id and capability_type=private.evolution_kind(p_capability_type) and capability_key=private.evolution_slug(p_capability_key) for update;
 if t.id is null then raise exception 'TRACK_NOT_FOUND'; end if;
 t:=private.evolution_refresh_track(t.id);
 if t.status<>'ready' then raise exception 'EVOLUTION_NOT_READY'; end if;
 select * into c from public.characters where id=p_character_id;
 select * into a from public.character_progression_accounts where table_id=p_table_id and character_id=p_character_id;
 target:=t.current_rank+1; cost:=private.evolution_cost(c.mode,t.capability_type,target);
 if a.balance<cost then raise exception 'INSUFFICIENT_CHARACTER_PROGRESSION'; end if;
 if exists(select 1 from public.evolution_upgrade_requests x where x.track_id=t.id and x.status='pending') then raise exception 'UPGRADE_ALREADY_PENDING'; end if;
 insert into public.evolution_upgrade_requests(table_id,character_id,user_id,track_id,from_rank,to_rank,recommended_cost,note)
 values(p_table_id,p_character_id,auth.uid(),t.id,t.current_rank,target,cost,left(coalesce(p_note,''),800)) returning * into r;
 return r;
end; $$;
revoke all on function public.progression_request_semantic_upgrade(text,text,text,text,text) from public,anon;
grant execute on function public.progression_request_semantic_upgrade(text,text,text,text,text) to authenticated;

create or replace function private.evolution_apply_upgrade(p_track_id uuid,p_final_cost integer,p_acceleration boolean,p_free boolean,p_reason text,p_reference text default null)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare t public.character_evolution_tracks; c public.characters; a public.character_progression_accounts; payload jsonb; target integer; cost integer; maxv integer; vno integer; arr jsonb; item jsonb; txt text; found boolean:=false; req jsonb;
begin
 select * into t from public.character_evolution_tracks where id=p_track_id for update;
 if t.id is null then raise exception 'TRACK_NOT_FOUND'; end if;
 t:=private.evolution_refresh_track(t.id);
 if not p_acceleration and t.status<>'ready' then raise exception 'EVOLUTION_NOT_READY'; end if;
 select * into c from public.characters where id=t.character_id for update;
 select * into a from public.character_progression_accounts where table_id=t.table_id and character_id=t.character_id for update;
 if a.character_id is null then raise exception 'PROGRESSION_ACCOUNT_NOT_FOUND'; end if;
 target:=t.current_rank+1; cost:=coalesce(p_final_cost,private.evolution_cost(c.mode,t.capability_type,target));
 if cost<0 then raise exception 'INVALID_COST'; end if;
 if not p_free and a.balance<cost then raise exception 'INSUFFICIENT_CHARACTER_PROGRESSION'; end if;
 payload:=coalesce(c.payload,'{}'::jsonb);

 if t.capability_type='attribute' then
   if lower(c.mode)='ocultatun' then
     begin maxv:=case coalesce((payload#>>'{progression,existenceLevel}')::integer,5) when 5 then 4 when 4 then 5 when 3 then 6 when 2 then 7 when 1 then 8 else 10 end; exception when others then maxv:=4; end;
   else
     begin maxv:=least(8,greatest(1,coalesce((payload#>>'{progression,maxAttribute}')::integer,6))); exception when others then maxv:=6; end;
   end if;
   if target>maxv then raise exception 'ATTRIBUTE_LEVEL_LIMIT'; end if;
   payload:=jsonb_set(payload,array['stats',t.capability_key],to_jsonb(target),true);
 elsif t.capability_type in ('skill','advantage','talent') then
   arr:='[]'::jsonb; found:=false;
   if jsonb_typeof(payload->'skills')='array' then
     for item in select value from jsonb_array_elements(payload->'skills') loop
       if private.evolution_kind(coalesce(item->>'type',item->>'kind'))=t.capability_type and private.evolution_slug(coalesce(item->>'name',item->>'label'))=t.capability_key then item:=jsonb_set(item,'{grade}',to_jsonb(target),true); found:=true; end if;
       arr:=arr||jsonb_build_array(item);
     end loop;
   end if;
   if not found then arr:=arr||jsonb_build_array(jsonb_build_object('type',case t.capability_type when 'skill' then 'Perícia' when 'advantage' then 'Vantagem' else 'Talento' end,'name',t.label,'grade',target)); end if;
   payload:=jsonb_set(payload,'{skills}',arr,true);
   if jsonb_typeof(payload->'skillsHtml')='array' then
     arr:='[]'::jsonb; found:=false;
     for item in select value from jsonb_array_elements(payload->'skillsHtml') loop
       txt:=item#>>'{}';
       if position(lower(t.label) in lower(txt))>0 and txt~*'\(G\s*[0-9]+\)' then txt:=regexp_replace(txt,'\(G\s*[0-9]+\)','(G'||target::text||')','i'); found:=true; end if;
       arr:=arr||jsonb_build_array(to_jsonb(txt));
     end loop;
     if not found then arr:=arr||jsonb_build_array(to_jsonb('<div class="list-item-header"><input type="text" value="'||case t.capability_type when 'skill' then 'Perícia' when 'advantage' then 'Vantagem' else 'Talento' end||': '||replace(t.label,'"','')||' (G'||target::text||')" readonly></div>')); end if;
     payload:=jsonb_set(payload,'{skillsHtml}',arr,true);
   end if;
 elsif t.capability_type='power' and jsonb_typeof(payload->'powers')='array' then
   select coalesce(jsonb_agg(case when private.evolution_slug(coalesce(nullif(x->>'id',''),x->>'name'))=t.capability_key then jsonb_set(x,'{progressionRank}',to_jsonb(target),true) else x end),'[]'::jsonb) into arr from jsonb_array_elements(payload->'powers') x;
   payload:=jsonb_set(payload,'{powers}',arr,true);
 elsif t.capability_type='ritual' and jsonb_typeof(payload->'rituals')='array' then
   select coalesce(jsonb_agg(case when private.evolution_slug(coalesce(nullif(x->>'id',''),x->>'name'))=t.capability_key then jsonb_set(x,'{progressionRank}',to_jsonb(target),true) else x end),'[]'::jsonb) into arr from jsonb_array_elements(payload->'rituals') x;
   payload:=jsonb_set(payload,'{rituals}',arr,true);
 elsif t.capability_type='class' then
   payload:=jsonb_set(payload,'{progression,classRank}',to_jsonb(target),true);
 end if;
 payload:=jsonb_set(payload,'{progression,lastTableId}',to_jsonb(t.table_id),true);
 payload:=jsonb_set(payload,'{progression,lastEvolutionAt}',to_jsonb(now()::text),true);

 select coalesce(max(version_no),0)+1 into vno from public.character_versions where character_id=c.id;
 insert into public.character_versions(character_id,owner_id,version_no,snapshot) values(c.id,c.user_id::uuid,vno,c.payload);
 update public.characters set payload=payload,updated_at=now() where id=c.id returning * into c;
 if not p_free then update public.character_progression_accounts set balance=balance-cost,lifetime_spent=lifetime_spent+cost,updated_at=now() where table_id=t.table_id and character_id=t.character_id returning * into a; end if;
 if t.capability_type in ('class','advantage','power','ritual') then select coalesce(jsonb_agg(x||jsonb_build_object('done',false)),'[]'::jsonb) into req from jsonb_array_elements(t.requirements) x; else req:=t.requirements; end if;
 update public.character_evolution_tracks set current_rank=target,successes=0,successes_required=private.evolution_success_required(target+1),status='progress',requirements=req,updated_at=now() where id=t.id returning * into t;
 insert into public.progression_transactions(table_id,character_id,actor_id,target_user_id,amount,balance_after,tx_type,reason,reference_id,metadata)
 values(t.table_id,t.character_id,auth.uid(),a.user_id,case when p_free then 0 else -cost end,a.balance,case when p_acceleration then 'EVOLUTION_ACCELERATION' else 'SEMANTIC_EVOLUTION' end,left(coalesce(p_reason,''),500),p_reference,jsonb_build_object('track_id',t.id,'capability_type',t.capability_type,'capability_key',t.capability_key,'from',target-1,'to',target,'cost',cost,'free',p_free));
 perform private.evolution_add_event(t.table_id,t.character_id,t.id,case when p_acceleration then 'ACCELERATION' else 'EVOLUTION_APPLIED' end,0,'',p_reason,jsonb_build_object('from',target-1,'to',target,'cost',cost,'free',p_free));
 return jsonb_build_object('track',to_jsonb(t),'character',to_jsonb(c),'account',to_jsonb(a),'cost',cost);
end; $$;
revoke all on function private.evolution_apply_upgrade(uuid,integer,boolean,boolean,text,text) from public,anon,authenticated;

create or replace function public.progression_resolve_semantic_upgrade(p_request_id uuid,p_approved boolean,p_final_cost integer default null,p_reason text default '')
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare r public.evolution_upgrade_requests; result jsonb;
begin
 select * into r from public.evolution_upgrade_requests where id=p_request_id for update;
 if r.id is null then raise exception 'REQUEST_NOT_FOUND'; end if;
 if not public.can_manage_table(r.table_id) then raise exception 'GM_REQUIRED'; end if;
 if r.status<>'pending' then return jsonb_build_object('request',to_jsonb(r)); end if;
 if not p_approved then update public.evolution_upgrade_requests set status='rejected',decided_by=auth.uid(),decision_reason=left(coalesce(p_reason,''),500),decided_at=now() where id=r.id returning * into r; return jsonb_build_object('request',to_jsonb(r)); end if;
 result:=private.evolution_apply_upgrade(r.track_id,coalesce(p_final_cost,r.recommended_cost),false,false,coalesce(nullif(trim(p_reason),''),r.note),r.id::text);
 update public.evolution_upgrade_requests set status='approved',final_cost=coalesce(p_final_cost,r.recommended_cost),decided_by=auth.uid(),decision_reason=left(coalesce(p_reason,''),500),decided_at=now() where id=r.id returning * into r;
 return jsonb_build_object('request',to_jsonb(r))||result;
end; $$;
revoke all on function public.progression_resolve_semantic_upgrade(uuid,boolean,integer,text) from public,anon;
grant execute on function public.progression_resolve_semantic_upgrade(uuid,boolean,integer,text) to authenticated;

create or replace function public.progression_accelerate_track(p_table_id text,p_character_id text,p_capability_type text,p_capability_key text,p_free boolean,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare t public.character_evolution_tracks;
begin
 if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
 if trim(coalesce(p_reason,''))='' then raise exception 'REASON_REQUIRED'; end if;
 perform private.ensure_character_evolution_tracks(p_table_id,p_character_id);
 select * into t from public.character_evolution_tracks where table_id=p_table_id and character_id=p_character_id and capability_type=private.evolution_kind(p_capability_type) and capability_key=private.evolution_slug(p_capability_key);
 if t.id is null then raise exception 'TRACK_NOT_FOUND'; end if;
 return private.evolution_apply_upgrade(t.id,null,true,coalesce(p_free,false),trim(p_reason),null);
end; $$;
revoke all on function public.progression_accelerate_track(text,text,text,text,boolean,text) from public,anon;
grant execute on function public.progression_accelerate_track(text,text,text,text,boolean,text) to authenticated;

create or replace function public.progression_set_track_requirement(p_table_id text,p_character_id text,p_capability_type text,p_capability_key text,p_requirement_key text,p_done boolean,p_label text default '')
returns public.character_evolution_tracks language plpgsql security definer set search_path=public,private as $$
declare t public.character_evolution_tracks; arr jsonb:='[]'::jsonb; item jsonb; found boolean:=false; k text:=trim(coalesce(p_requirement_key,''));
begin
 if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
 if k='' then raise exception 'REQUIREMENT_REQUIRED'; end if;
 perform private.ensure_character_evolution_tracks(p_table_id,p_character_id);
 select * into t from public.character_evolution_tracks where table_id=p_table_id and character_id=p_character_id and capability_type=private.evolution_kind(p_capability_type) and capability_key=private.evolution_slug(p_capability_key) for update;
 if t.id is null then raise exception 'TRACK_NOT_FOUND'; end if;
 for item in select value from jsonb_array_elements(coalesce(t.requirements,'[]'::jsonb)) loop
   if item->>'key'=k then item:=item||jsonb_build_object('done',coalesce(p_done,false),'label',coalesce(nullif(p_label,''),item->>'label',k)); found:=true; end if;
   arr:=arr||jsonb_build_array(item);
 end loop;
 if not found then arr:=arr||jsonb_build_array(jsonb_build_object('key',k,'label',coalesce(nullif(p_label,''),k),'done',coalesce(p_done,false))); end if;
 update public.character_evolution_tracks set requirements=arr where id=t.id;
 t:=private.evolution_refresh_track(t.id);
 perform private.evolution_add_event(t.table_id,t.character_id,t.id,'REQUIREMENT_UPDATED',0,'',coalesce(nullif(p_label,''),k),jsonb_build_object('requirement',k,'done',coalesce(p_done,false)));
 return t;
end; $$;
revoke all on function public.progression_set_track_requirement(text,text,text,text,text,boolean,text) from public,anon;
grant execute on function public.progression_set_track_requirement(text,text,text,text,text,boolean,text) to authenticated;

create or replace function public.progression_submit_development(p_table_id text,p_character_id text,p_focus_type text,p_payload jsonb,p_requested_cost integer,p_note text)
returns public.progression_proposals language plpgsql security definer set search_path=public,private as $$
declare r public.progression_proposals; f text:=private.evolution_kind(p_focus_type);
begin
 if not private.character_in_table(p_table_id,p_character_id,auth.uid()) then raise exception 'CHARACTER_MEMBERSHIP_REQUIRED'; end if;
 if f not in ('power','skill','class') then raise exception 'INVALID_DEVELOPMENT_FOCUS'; end if;
 if coalesce(p_requested_cost,0)<=0 or trim(coalesce(p_note,''))='' then raise exception 'COST_AND_NOTE_REQUIRED'; end if;
 insert into public.progression_proposals(table_id,character_id,user_id,proposed_payload,requested_cost,note,proposal_kind,focus_type)
 values(p_table_id,p_character_id,auth.uid(),coalesce(p_payload,'{}'::jsonb),p_requested_cost,left(trim(p_note),1200),'development',f) returning * into r;
 return r;
end; $$;
revoke all on function public.progression_submit_development(text,text,text,jsonb,integer,text) from public,anon;
grant execute on function public.progression_submit_development(text,text,text,jsonb,integer,text) to authenticated;

create or replace function public.progression_resolve_development(p_request_id uuid,p_approved boolean,p_final_cost integer default null,p_reason text default '')
returns public.progression_proposals language plpgsql security definer set search_path=public,private as $$
declare r public.progression_proposals; c public.characters; a public.character_progression_accounts; payload jsonb; cost integer; vno integer;
begin
 select * into r from public.progression_proposals where id=p_request_id and proposal_kind='development' for update;
 if r.id is null then raise exception 'REQUEST_NOT_FOUND'; end if;
 if not public.can_manage_table(r.table_id) then raise exception 'GM_REQUIRED'; end if;
 if r.status<>'pending' then return r; end if;
 if not p_approved then update public.progression_proposals set status='rejected',decided_by=auth.uid(),decided_at=now() where id=r.id returning * into r; return r; end if;
 cost:=coalesce(p_final_cost,r.requested_cost); if cost<=0 then raise exception 'INVALID_COST'; end if;
 select * into a from public.character_progression_accounts where table_id=r.table_id and character_id=r.character_id for update;
 if a.character_id is null or a.balance<cost then raise exception 'INSUFFICIENT_CHARACTER_PROGRESSION'; end if;
 select * into c from public.characters where id=r.character_id for update; payload:=coalesce(c.payload,'{}'::jsonb);
 select coalesce(max(version_no),0)+1 into vno from public.character_versions where character_id=c.id;
 insert into public.character_versions(character_id,owner_id,version_no,snapshot) values(c.id,c.user_id::uuid,vno,c.payload);
 if r.focus_type='power' then
   if r.proposed_payload?'powers' then payload:=jsonb_set(payload,'{powers}',coalesce(r.proposed_payload->'powers','[]'::jsonb),true); end if;
   if r.proposed_payload?'powersHtml' then payload:=jsonb_set(payload,'{powersHtml}',coalesce(r.proposed_payload->'powersHtml','[]'::jsonb),true); end if;
   if r.proposed_payload?'rituals' then payload:=jsonb_set(payload,'{rituals}',coalesce(r.proposed_payload->'rituals','[]'::jsonb),true); end if;
 elsif r.focus_type='skill' then
   if r.proposed_payload?'skills' then payload:=jsonb_set(payload,'{skills}',coalesce(r.proposed_payload->'skills','[]'::jsonb),true); end if;
   if r.proposed_payload?'skillsHtml' then payload:=jsonb_set(payload,'{skillsHtml}',coalesce(r.proposed_payload->'skillsHtml','[]'::jsonb),true); end if;
 elsif r.focus_type='class' then
   if r.proposed_payload?'className' then payload:=jsonb_set(payload,'{className}',r.proposed_payload->'className',true); end if;
 end if;
 payload:=jsonb_set(payload,'{progression,lastTableId}',to_jsonb(r.table_id),true); payload:=jsonb_set(payload,'{progression,lastEvolutionAt}',to_jsonb(now()::text),true);
 update public.characters set payload=payload,class_name=coalesce(payload->>'className',class_name),updated_at=now() where id=c.id;
 update public.character_progression_accounts set balance=balance-cost,lifetime_spent=lifetime_spent+cost,updated_at=now() where table_id=r.table_id and character_id=r.character_id returning * into a;
 update public.progression_proposals set status='approved',final_cost=cost,decided_by=auth.uid(),decided_at=now() where id=r.id returning * into r;
 insert into public.progression_transactions(table_id,character_id,actor_id,target_user_id,amount,balance_after,tx_type,reason,reference_id,metadata) values(r.table_id,r.character_id,auth.uid(),r.user_id,-cost,a.balance,'DEVELOPMENT_APPROVED',coalesce(nullif(trim(p_reason),''),r.note),r.id::text,jsonb_build_object('focus_type',r.focus_type));
 perform private.evolution_add_event(r.table_id,r.character_id,null,'DEVELOPMENT_APPROVED',0,'',coalesce(nullif(trim(p_reason),''),r.note),jsonb_build_object('focus_type',r.focus_type,'cost',cost));
 perform private.ensure_character_evolution_tracks(r.table_id,r.character_id);
 return r;
end; $$;
revoke all on function public.progression_resolve_development(uuid,boolean,integer,text) from public,anon;
grant execute on function public.progression_resolve_development(uuid,boolean,integer,text) to authenticated;

-- Estado da Mesa passa a alimentar a Central Operacional com a mesma fonte de verdade.
create or replace function public.progression_table_state(p_table_id text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare w public.table_progression_wallets; managed boolean; my_char text; my_account jsonb; rec record;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
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

-- Arconte: Ledger operacional por Mesa (economia PEG + acontecimentos de evolução).
drop function if exists public.progression_admin_table_ledger(text,integer);
create function public.progression_admin_table_ledger(p_table_id text,p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare lim integer:=least(200,greatest(10,coalesce(p_limit,100))); w public.table_progression_wallets; tb public.tables;
begin
 if public.current_profile_role()<>'admin' then raise exception 'ADMIN_REQUIRED'; end if;
 select * into tb from public.tables where id=p_table_id;
 if tb.id is null then raise exception 'TABLE_NOT_FOUND'; end if;
 select * into w from private.ensure_progression_wallet(p_table_id);
 return jsonb_build_object(
   'table',jsonb_build_object('table_id',tb.id,'table_name',tb.name,'game_mode',tb.game_mode,'status',tb.status,'balance',w.balance,'lifetime_purchased',w.lifetime_purchased,'lifetime_admin_granted',w.lifetime_admin_granted,'lifetime_distributed',w.lifetime_distributed),
   'transactions',(select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]'::jsonb) from (
      select x.*,c.name as character_name,pa.username as actor_username,pt.username as target_username
      from public.progression_transactions x
      left join public.characters c on c.id=x.character_id
      left join public.profiles pa on pa.id=x.actor_id
      left join public.profiles pt on pt.id=x.target_user_id
      where x.table_id=p_table_id order by x.created_at desc limit lim
   ) q),
   'events',(select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]'::jsonb) from (
      select e.*,t.label as capability_label,t.capability_type,p.username as actor_username,c.name as character_name
      from public.character_evolution_events e
      left join public.character_evolution_tracks t on t.id=e.track_id
      left join public.profiles p on p.id=e.actor_id
      left join public.characters c on c.id=e.character_id
      where e.table_id=p_table_id order by e.created_at desc limit lim
   ) q)
 );
end; $$;
revoke all on function public.progression_admin_table_ledger(text,integer) from public,anon;
grant execute on function public.progression_admin_table_ledger(text,integer) to authenticated;

-- Arconte: métricas de uso além da reserva PEG.
drop function if exists public.progression_admin_tables();
create function public.progression_admin_tables()
returns table(table_id text,table_name text,game_mode text,status text,owner_username text,balance integer,lifetime_purchased integer,lifetime_admin_granted integer,lifetime_distributed integer,participant_count integer,ready_count integer,pending_evolution_count integer)
language plpgsql security definer set search_path=public,private as $$
begin
 if public.current_profile_role()<>'admin' then raise exception 'ADMIN_REQUIRED'; end if;
 insert into public.table_progression_wallets(table_id) select id from public.tables on conflict(table_id) do nothing;
 return query select tb.id,tb.name,tb.game_mode,tb.status,coalesce(p.username,tb.owner_id),w.balance,w.lifetime_purchased,w.lifetime_admin_granted,w.lifetime_distributed,
   (select count(*)::integer from public.table_members tm where tm.table_id=tb.id and tm.status='active' and tm.character_id is not null),
   (select count(*)::integer from public.character_evolution_tracks et where et.table_id=tb.id and et.status='ready'),
   ((select count(*) from public.evolution_evidence_requests er where er.table_id=tb.id and er.status='pending')+(select count(*) from public.evolution_training_requests tr where tr.table_id=tb.id and tr.status='pending')+(select count(*) from public.evolution_upgrade_requests ur where ur.table_id=tb.id and ur.status='pending')+(select count(*) from public.progression_proposals pr where pr.table_id=tb.id and pr.status='pending' and pr.proposal_kind='development'))::integer
 from public.tables tb join public.table_progression_wallets w on w.table_id=tb.id left join public.profiles p on p.id=tb.owner_id order by tb.updated_at desc;
end; $$;
revoke all on function public.progression_admin_tables() from public,anon;
grant execute on function public.progression_admin_tables() to authenticated;

-- Marca a árvore de banco após a evolução semântica V2.10.0.
insert into public.ms_schema_meta(singleton,version) values(true,'2.10.0')
on conflict(singleton) do update set version=excluded.version,updated_at=now();

-- Endurecimento: caminhos antigos de edição mecânica ampla deixam de ser públicos.
revoke execute on function public.progression_upgrade_attribute(text,text,text) from authenticated;
revoke execute on function public.progression_submit_proposal(text,text,jsonb,integer,text) from authenticated;

commit;
