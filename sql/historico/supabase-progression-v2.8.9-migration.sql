-- Mundos Sombrios V2.8.9 — Governança de Fichas e Evolução Gradual
-- Requer: supabase-production.sql + supabase-soul-economy-v2.5-migration.sql + migrações de mesas V2.8.
-- Autoridade: Supabase. Nenhum saldo, evolução ou recurso protegido é confiado ao navegador.
begin;

create schema if not exists private;

create table if not exists public.progression_config (
  singleton boolean primary key default true check (singleton),
  souldrakma_per_point bigint not null default 1000 check (souldrakma_per_point >= 1),
  purchase_min integer not null default 1 check (purchase_min >= 1),
  purchase_max integer not null default 200 check (purchase_max >= purchase_min),
  updated_at timestamptz not null default now()
);
insert into public.progression_config(singleton) values(true) on conflict(singleton) do nothing;

create table if not exists public.table_progression_wallets (
  table_id text primary key references public.tables(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_purchased integer not null default 0 check (lifetime_purchased >= 0),
  lifetime_admin_granted integer not null default 0 check (lifetime_admin_granted >= 0),
  lifetime_distributed integer not null default 0 check (lifetime_distributed >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.character_progression_accounts (
  table_id text not null references public.tables(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_granted integer not null default 0 check (lifetime_granted >= 0),
  lifetime_spent integer not null default 0 check (lifetime_spent >= 0),
  career_progress integer not null default 0 check (career_progress >= 0),
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key(table_id,character_id)
);
create index if not exists idx_character_progression_user on public.character_progression_accounts(user_id,table_id);

create table if not exists public.progression_transactions (
  id bigint generated always as identity primary key,
  table_id text not null references public.tables(id) on delete cascade,
  character_id text references public.characters(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  amount integer not null,
  balance_after integer,
  tx_type text not null check (tx_type in (
    'SOUL_PURCHASE','ADMIN_TABLE_GRANT','ADMIN_TABLE_REMOVE','TABLE_GRANT_DEBIT','CHARACTER_GRANT',
    'CHARACTER_GRANT_REVERSAL','ATTRIBUTE_UPGRADE','PROPOSAL_SPEND','RESOURCE_ADJUST','RESOURCE_REQUEST_APPROVED','SYSTEM'
  )),
  reason text not null default '',
  reference_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_progression_tx_table_created on public.progression_transactions(table_id,created_at desc);
create index if not exists idx_progression_tx_char_created on public.progression_transactions(character_id,created_at desc);

create table if not exists public.progression_proposals (
  id uuid primary key default gen_random_uuid(),
  table_id text not null references public.tables(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  proposed_payload jsonb not null,
  requested_cost integer not null check (requested_cost > 0),
  final_cost integer,
  note text not null default '',
  status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_progression_proposals_table on public.progression_proposals(table_id,status,created_at desc);

create table if not exists public.character_resource_requests (
  id uuid primary key default gen_random_uuid(),
  table_id text not null references public.tables(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_key text not null,
  delta numeric not null,
  reason text not null default '',
  status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
  decision_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_resource_requests_table on public.character_resource_requests(table_id,status,created_at desc);

alter table public.progression_config enable row level security;
alter table public.table_progression_wallets enable row level security;
alter table public.character_progression_accounts enable row level security;
alter table public.progression_transactions enable row level security;
alter table public.progression_proposals enable row level security;
alter table public.character_resource_requests enable row level security;
revoke all on public.progression_config,public.table_progression_wallets,public.character_progression_accounts,public.progression_transactions,public.progression_proposals,public.character_resource_requests from anon,authenticated;

create or replace function private.character_mechanics_snapshot(p_payload jsonb)
returns jsonb language sql immutable set search_path=public,private as $$
  select coalesce(p_payload,'{}'::jsonb) - array['name','avatar','gallery','concept','updatedAt','createdAt','lastViewedAt'];
$$;
revoke all on function private.character_mechanics_snapshot(jsonb) from public,anon,authenticated;


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

create or replace function private.ensure_progression_wallet(p_table_id text)
returns public.table_progression_wallets language plpgsql security definer set search_path=public,private as $$
declare w public.table_progression_wallets;
begin
  insert into public.table_progression_wallets(table_id) values(p_table_id) on conflict(table_id) do nothing;
  select * into w from public.table_progression_wallets where table_id=p_table_id;
  return w;
end; $$;
revoke all on function private.ensure_progression_wallet(text) from public,anon,authenticated;

create or replace function private.character_in_table(p_table_id text,p_character_id text,p_user uuid default null)
returns boolean language sql stable security definer set search_path=public,private as $$
  select exists(
    select 1 from public.table_members tm
    join public.characters c on c.id=tm.character_id
    where tm.table_id=p_table_id and tm.character_id=p_character_id and tm.status='active'
      and (p_user is null or tm.user_id=p_user)
  );
$$;
revoke all on function private.character_in_table(text,text,uuid) from public,anon,authenticated;

-- Ficha criada = mecânica selada. Atualizações comuns posteriores só podem alterar campos narrativos.
create or replace function public.save_character_secure(
  p_id text, p_name text, p_mode text, p_nature text, p_class_name text, p_payload jsonb
) returns public.characters
language plpgsql security definer set search_path=public,private
as $$
declare v_character public.characters;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if trim(coalesce(p_name,''))='' then raise exception 'CHARACTER_NAME_REQUIRED'; end if;
  if trim(coalesce(p_payload->>'category',p_payload#>>'{concept,category}',''))='' then raise exception 'CHARACTER_CATEGORY_REQUIRED'; end if;
  if trim(coalesce(p_nature,''))='' then raise exception 'CHARACTER_EXPANSION_REQUIRED'; end if;
  if trim(coalesce(p_class_name,''))='' then raise exception 'CHARACTER_CLASS_REQUIRED'; end if;

  select * into v_character from public.characters where id=p_id and user_id=auth.uid()::text for update;
  if v_character.id is null then
    p_payload:=jsonb_set(coalesce(p_payload,'{}'::jsonb),'{progression}',coalesce(p_payload->'progression','{}'::jsonb)||jsonb_build_object('locked',true,'createdInCampaign',false),true);
    insert into public.characters(id,owner_id,user_id,name,mode,nature,class_name,payload)
    values(coalesce(nullif(p_id,''),'c-'||gen_random_uuid()::text),auth.uid()::text,auth.uid()::text,trim(p_name),coalesce(nullif(p_mode,''),'exodo'),p_nature,p_class_name,p_payload)
    returning * into v_character;
  else
    if coalesce(nullif(p_mode,''),v_character.mode)<>v_character.mode
       or coalesce(p_nature,'')<>coalesce(v_character.nature,'')
       or coalesce(p_class_name,'')<>coalesce(v_character.class_name,'')
    then raise exception 'CHARACTER_ARCHETYPE_LOCKED'; end if;
    insert into public.character_versions(character_id,owner_id,version_no,snapshot)
      select v_character.id,auth.uid(),coalesce(max(version_no),0)+1,v_character.payload from public.character_versions where character_id=v_character.id;
    update public.characters
      set name=trim(p_name),payload=private.character_merge_narrative(v_character.payload,coalesce(p_payload,'{}'::jsonb),p_name),updated_at=now()
      where id=v_character.id returning * into v_character;
  end if;
  return v_character;
end; $$;
revoke all on function public.save_character_secure(text,text,text,text,text,jsonb) from public;
grant execute on function public.save_character_secure(text,text,text,text,text,jsonb) to authenticated;

-- Edição antiga do Mestre passa a obedecer a mesma trava; mecânica usa RPCs de progressão/recursos.
create or replace function public.gm_update_character(
  p_table_id text,p_character_id text,p_name text,p_mode text,p_nature text,p_class_name text,p_payload jsonb
) returns public.characters
language plpgsql security definer set search_path=public,private as $$
declare v public.characters;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
  if not private.character_in_table(p_table_id,p_character_id,null) then raise exception 'CHARACTER_NOT_IN_TABLE'; end if;
  select * into v from public.characters where id=p_character_id for update;
  if v.id is null then raise exception 'CHARACTER_NOT_FOUND'; end if;
  if coalesce(nullif(p_mode,''),v.mode)<>v.mode or coalesce(p_nature,'')<>coalesce(v.nature,'') or coalesce(p_class_name,'')<>coalesce(v.class_name,'')
  then raise exception 'USE_PROGRESSION_OR_RESOURCE_CONTROL'; end if;
  insert into public.character_versions(character_id,owner_id,version_no,snapshot)
    select v.id,coalesce((select p.auth_user_id from public.profiles p where p.id=v.owner_id limit 1),v.user_id::uuid),coalesce(max(version_no),0)+1,v.payload from public.character_versions where character_id=v.id;
  update public.characters set name=trim(coalesce(p_name,name)),payload=private.character_merge_narrative(v.payload,coalesce(p_payload,'{}'::jsonb),coalesce(p_name,v.name)),updated_at=now() where id=p_character_id returning * into v;
  return v;
end; $$;
revoke all on function public.gm_update_character(text,text,text,text,text,text,jsonb) from public;
grant execute on function public.gm_update_character(text,text,text,text,text,text,jsonb) to authenticated;

create or replace function public.progression_table_state(p_table_id text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare w public.table_progression_wallets; managed boolean; my_char text; my_account jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.can_access_table_session(p_table_id) and not public.can_manage_table(p_table_id) then raise exception 'TABLE_ACCESS_REQUIRED'; end if;
  select * into w from private.ensure_progression_wallet(p_table_id);
  managed:=public.can_manage_table(p_table_id);
  select tm.character_id into my_char from public.table_members tm where tm.table_id=p_table_id and tm.user_id=auth.uid() and tm.status='active' limit 1;
  if my_char is not null then
    insert into public.character_progression_accounts(table_id,character_id,user_id)
      values(p_table_id,my_char,auth.uid()) on conflict(table_id,character_id) do nothing;
    select to_jsonb(a) into my_account from public.character_progression_accounts a where a.table_id=p_table_id and a.character_id=my_char;
  end if;
  return jsonb_build_object(
    'managed',managed,
    'wallet',case when managed then to_jsonb(w) else null end,
    'myAccount',my_account,
    'accounts',case when managed then (select coalesce(jsonb_agg(jsonb_build_object('character_id',a.character_id,'user_id',a.user_id,'balance',a.balance,'lifetime_granted',a.lifetime_granted,'lifetime_spent',a.lifetime_spent,'career_progress',a.career_progress,'name',c.name) order by c.name),'[]'::jsonb) from public.character_progression_accounts a join public.characters c on c.id=a.character_id where a.table_id=p_table_id) else '[]'::jsonb end,
    'pendingProposals',case when managed then (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]'::jsonb) from public.progression_proposals x where x.table_id=p_table_id and x.status='pending') else '[]'::jsonb end,
    'pendingResources',case when managed then (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at),'[]'::jsonb) from public.character_resource_requests x where x.table_id=p_table_id and x.status='pending') else '[]'::jsonb end,
    'recentTransactions',case when managed then (select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]'::jsonb) from (select * from public.progression_transactions x where x.table_id=p_table_id order by x.created_at desc limit 20) q) else '[]'::jsonb end,
    'config',(select to_jsonb(c) from public.progression_config c where c.singleton=true)
  );
end; $$;
revoke all on function public.progression_table_state(text) from public;
grant execute on function public.progression_table_state(text) to authenticated;

create or replace function public.progression_buy_table_points(p_table_id text,p_points integer)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare cfg public.progression_config; w public.table_progression_wallets; cost bigint; soul_balance bigint;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
  select * into cfg from public.progression_config where singleton=true;
  if p_points<cfg.purchase_min or p_points>cfg.purchase_max then raise exception 'INVALID_POINT_AMOUNT'; end if;
  cost:=p_points::bigint*cfg.souldrakma_per_point;
  soul_balance:=public.soul_add_transaction(auth.uid(),-cost,'PURCHASE','evolution-gradual',p_table_id,jsonb_build_object('table_id',p_table_id,'points',p_points,'unit_price',cfg.souldrakma_per_point),null);
  perform private.ensure_progression_wallet(p_table_id);
  update public.table_progression_wallets set balance=balance+p_points,lifetime_purchased=lifetime_purchased+p_points,updated_at=now() where table_id=p_table_id returning * into w;
  insert into public.progression_transactions(table_id,actor_id,amount,balance_after,tx_type,reason,metadata)
    values(p_table_id,auth.uid(),p_points,w.balance,'SOUL_PURCHASE','Compra de reserva com SoulDrakma',jsonb_build_object('souldrakma_cost',cost,'soul_balance_after',soul_balance));
  return jsonb_build_object('wallet',to_jsonb(w),'souldrakmaCost',cost,'soulBalance',soul_balance);
end; $$;
revoke all on function public.progression_buy_table_points(text,integer) from public;
grant execute on function public.progression_buy_table_points(text,integer) to authenticated;

create or replace function public.progression_grant_character(p_table_id text,p_character_id text,p_amount integer,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare w public.table_progression_wallets; a public.character_progression_accounts; u uuid; txid bigint;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
  if p_amount<=0 or trim(coalesce(p_reason,''))='' then raise exception 'AMOUNT_AND_REASON_REQUIRED'; end if;
  if not private.character_in_table(p_table_id,p_character_id,null) then raise exception 'CHARACTER_NOT_IN_TABLE'; end if;
  select c.user_id::uuid into u from public.characters c where c.id=p_character_id;
  perform private.ensure_progression_wallet(p_table_id);
  update public.table_progression_wallets set balance=balance-p_amount,lifetime_distributed=lifetime_distributed+p_amount,updated_at=now()
    where table_id=p_table_id and balance>=p_amount returning * into w;
  if w.table_id is null then raise exception 'INSUFFICIENT_TABLE_PROGRESSION'; end if;
  insert into public.character_progression_accounts(table_id,character_id,user_id,balance,lifetime_granted,career_progress)
    values(p_table_id,p_character_id,u,p_amount,p_amount,0)
    on conflict(table_id,character_id) do update set balance=public.character_progression_accounts.balance+p_amount,lifetime_granted=public.character_progression_accounts.lifetime_granted+p_amount,updated_at=now()
    returning * into a;
  insert into public.progression_transactions(table_id,actor_id,amount,balance_after,tx_type,reason,metadata)
    values(p_table_id,auth.uid(),-p_amount,w.balance,'TABLE_GRANT_DEBIT',trim(p_reason),jsonb_build_object('character_id',p_character_id));
  insert into public.progression_transactions(table_id,character_id,actor_id,target_user_id,amount,balance_after,tx_type,reason)
    values(p_table_id,p_character_id,auth.uid(),u,p_amount,a.balance,'CHARACTER_GRANT',trim(p_reason)) returning id into txid;
  return jsonb_build_object('wallet',to_jsonb(w),'account',to_jsonb(a),'transactionId',txid,'targetUserId',u);
end; $$;
revoke all on function public.progression_grant_character(text,text,integer,text) from public;
grant execute on function public.progression_grant_character(text,text,integer,text) to authenticated;


-- Sucessos de Carreira de Ocultatun sÃ£o histÃ³ricos de prÃ¡tica real e NÃO sÃ£o comprados com SoulDrakma.
-- O Mestre/ADM registra estes pontos separadamente da carteira PEG.
create or replace function public.progression_record_career_success(p_table_id text,p_character_id text,p_amount integer,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare a public.character_progression_accounts; u uuid; mode_name text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
  if p_amount<=0 or p_amount>20 or trim(coalesce(p_reason,''))='' then raise exception 'INVALID_CAREER_PROGRESS'; end if;
  if not private.character_in_table(p_table_id,p_character_id,null) then raise exception 'CHARACTER_NOT_IN_TABLE'; end if;
  select c.user_id::uuid,c.mode into u,mode_name from public.characters c where c.id=p_character_id;
  if lower(coalesce(mode_name,''))<>'ocultatun' then raise exception 'OCULTATUN_ONLY'; end if;
  insert into public.character_progression_accounts(table_id,character_id,user_id,career_progress)
    values(p_table_id,p_character_id,u,p_amount)
    on conflict(table_id,character_id) do update set career_progress=public.character_progression_accounts.career_progress+p_amount,updated_at=now()
    returning * into a;
  insert into public.progression_transactions(table_id,character_id,actor_id,target_user_id,amount,balance_after,tx_type,reason,metadata)
    values(p_table_id,p_character_id,auth.uid(),u,p_amount,a.balance,'CAREER_SUCCESS',trim(p_reason),jsonb_build_object('career_progress',a.career_progress));
  return to_jsonb(a);
end; $$;
revoke all on function public.progression_record_career_success(text,text,integer,text) from public;
grant execute on function public.progression_record_career_success(text,text,integer,text) to authenticated;

create or replace function public.progression_reverse_grant(p_transaction_id bigint,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare t public.progression_transactions; a public.character_progression_accounts; w public.table_progression_wallets;
begin
  select * into t from public.progression_transactions where id=p_transaction_id and tx_type='CHARACTER_GRANT' for update;
  if t.id is null then raise exception 'GRANT_NOT_FOUND'; end if;
  if not public.can_manage_table(t.table_id) then raise exception 'GM_REQUIRED'; end if;
  if exists(select 1 from public.progression_transactions x where x.reference_id=t.id::text and x.tx_type='CHARACTER_GRANT_REVERSAL') then raise exception 'ALREADY_REVERSED'; end if;
  update public.character_progression_accounts set balance=balance-t.amount,updated_at=now() where table_id=t.table_id and character_id=t.character_id and balance>=t.amount returning * into a;
  if a.character_id is null then raise exception 'POINTS_ALREADY_SPENT'; end if;
  update public.table_progression_wallets set balance=balance+t.amount,lifetime_distributed=greatest(0,lifetime_distributed-t.amount),updated_at=now() where table_id=t.table_id returning * into w;
  insert into public.progression_transactions(table_id,character_id,actor_id,target_user_id,amount,balance_after,tx_type,reason,reference_id)
    values(t.table_id,t.character_id,auth.uid(),t.target_user_id,-t.amount,a.balance,'CHARACTER_GRANT_REVERSAL',trim(coalesce(p_reason,'Reversão de concessão')),t.id::text);
  return jsonb_build_object('wallet',to_jsonb(w),'account',to_jsonb(a));
end; $$;
revoke all on function public.progression_reverse_grant(bigint,text) from public;
grant execute on function public.progression_reverse_grant(bigint,text) to authenticated;

create or replace function public.progression_upgrade_attribute(p_table_id text,p_character_id text,p_attribute text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare c public.characters; a public.character_progression_accounts; key text; oldv integer; newv integer; cost integer; lvl integer; maxv integer; vno integer;
begin
  key:=lower(trim(coalesce(p_attribute,'')));
  if key not in ('for','vig','agi','int','prn','pre') then raise exception 'INVALID_ATTRIBUTE'; end if;
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.character_in_table(p_table_id,p_character_id,auth.uid()) and not public.can_manage_table(p_table_id) then raise exception 'CHARACTER_MEMBERSHIP_REQUIRED'; end if;
  select * into c from public.characters where id=p_character_id for update;
  if c.id is null then raise exception 'CHARACTER_NOT_FOUND'; end if;
  if not public.can_manage_table(p_table_id) and c.user_id<>auth.uid()::text then raise exception 'CHARACTER_NOT_OWNED'; end if;
  oldv:=coalesce((c.payload->'stats'->>key)::integer,0); newv:=oldv+1;
  if c.mode='ocultatun' then
    begin lvl:=coalesce((c.payload#>>'{progression,existenceLevel}')::integer,5); exception when others then lvl:=5; end;
    maxv:=case lvl when 5 then 4 when 4 then 5 when 3 then 6 when 2 then 7 when 1 then 8 else 10 end;
    cost:=20*newv;
  else
    maxv:=coalesce((c.payload#>>'{progression,maxAttribute}')::integer,6);
    maxv:=least(8,greatest(1,maxv)); cost:=10*greatest(1,newv);
  end if;
  if newv>maxv then raise exception 'ATTRIBUTE_LEVEL_LIMIT'; end if;
  select * into a from public.character_progression_accounts where table_id=p_table_id and character_id=p_character_id for update;
  if a.character_id is null or a.balance<cost then raise exception 'INSUFFICIENT_EVOLUTION_POINTS'; end if;
  select coalesce(max(version_no),0)+1 into vno from public.character_versions where character_id=c.id;
  insert into public.character_versions(character_id,owner_id,version_no,snapshot) values(c.id,c.user_id::uuid,vno,c.payload);
  c.payload:=jsonb_set(c.payload,array['stats',key],to_jsonb(newv),true);
  c.payload:=jsonb_set(c.payload,'{progression,lastTableId}',to_jsonb(p_table_id),true);
  update public.characters set payload=c.payload,updated_at=now() where id=c.id;
  update public.character_progression_accounts set balance=balance-cost,lifetime_spent=lifetime_spent+cost,updated_at=now() where table_id=p_table_id and character_id=p_character_id returning * into a;
  insert into public.progression_transactions(table_id,character_id,actor_id,target_user_id,amount,balance_after,tx_type,reason,metadata)
    values(p_table_id,p_character_id,auth.uid(),c.user_id::uuid,-cost,a.balance,'ATTRIBUTE_UPGRADE','Evolução automática de atributo',jsonb_build_object('attribute',key,'from',oldv,'to',newv,'mode',c.mode));
  return jsonb_build_object('character',to_jsonb(c),'account',to_jsonb(a),'cost',cost,'from',oldv,'to',newv);
end; $$;
revoke all on function public.progression_upgrade_attribute(text,text,text) from public;
grant execute on function public.progression_upgrade_attribute(text,text,text) to authenticated;

create or replace function public.progression_submit_proposal(p_table_id text,p_character_id text,p_payload jsonb,p_requested_cost integer,p_note text)
returns public.progression_proposals language plpgsql security definer set search_path=public,private as $$
declare a public.character_progression_accounts; r public.progression_proposals; c public.characters;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not private.character_in_table(p_table_id,p_character_id,auth.uid()) then raise exception 'CHARACTER_MEMBERSHIP_REQUIRED'; end if;
  select * into c from public.characters where id=p_character_id and user_id=auth.uid()::text;
  if c.id is null then raise exception 'CHARACTER_NOT_OWNED'; end if;
  select * into a from public.character_progression_accounts where table_id=p_table_id and character_id=p_character_id;
  if p_requested_cost<=0 or a.character_id is null or a.balance<p_requested_cost then raise exception 'INSUFFICIENT_EVOLUTION_POINTS'; end if;
  if private.character_mechanics_snapshot(coalesce(p_payload,'{}'::jsonb))=private.character_mechanics_snapshot(c.payload) then raise exception 'NO_MECHANICAL_CHANGE'; end if;
  insert into public.progression_proposals(table_id,character_id,user_id,proposed_payload,requested_cost,note)
    values(p_table_id,p_character_id,auth.uid(),p_payload,p_requested_cost,left(coalesce(p_note,''),500)) returning * into r;
  return r;
end; $$;
revoke all on function public.progression_submit_proposal(text,text,jsonb,integer,text) from public;
grant execute on function public.progression_submit_proposal(text,text,jsonb,integer,text) to authenticated;

create or replace function public.progression_resolve_proposal(p_proposal_id uuid,p_approved boolean,p_final_cost integer default null,p_reason text default '')
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare r public.progression_proposals; a public.character_progression_accounts; c public.characters; cost integer; vno integer;
begin
  select * into r from public.progression_proposals where id=p_proposal_id for update;
  if r.id is null then raise exception 'PROPOSAL_NOT_FOUND'; end if;
  if not public.can_manage_table(r.table_id) then raise exception 'GM_REQUIRED'; end if;
  if r.status<>'pending' then return jsonb_build_object('proposal',to_jsonb(r)); end if;
  if not p_approved then update public.progression_proposals set status='rejected',decided_by=auth.uid(),decided_at=now() where id=r.id returning * into r; return jsonb_build_object('proposal',to_jsonb(r)); end if;
  cost:=coalesce(p_final_cost,r.requested_cost); if cost<=0 then raise exception 'INVALID_COST'; end if;
  select * into a from public.character_progression_accounts where table_id=r.table_id and character_id=r.character_id for update;
  if a.character_id is null or a.balance<cost then raise exception 'INSUFFICIENT_EVOLUTION_POINTS'; end if;
  select * into c from public.characters where id=r.character_id for update;
  select coalesce(max(version_no),0)+1 into vno from public.character_versions where character_id=c.id;
  insert into public.character_versions(character_id,owner_id,version_no,snapshot) values(c.id,c.user_id::uuid,vno,c.payload);
  update public.characters set payload=jsonb_set(coalesce(r.proposed_payload,'{}'::jsonb),'{progression,lastTableId}',to_jsonb(r.table_id),true),updated_at=now() where id=c.id returning * into c;
  update public.character_progression_accounts set balance=balance-cost,lifetime_spent=lifetime_spent+cost,updated_at=now() where table_id=r.table_id and character_id=r.character_id returning * into a;
  update public.progression_proposals set status='approved',final_cost=cost,decided_by=auth.uid(),decided_at=now() where id=r.id returning * into r;
  insert into public.progression_transactions(table_id,character_id,actor_id,target_user_id,amount,balance_after,tx_type,reason,reference_id,metadata)
    values(r.table_id,r.character_id,auth.uid(),r.user_id,-cost,a.balance,'PROPOSAL_SPEND',coalesce(nullif(trim(p_reason),''),r.note),r.id::text,jsonb_build_object('requested_cost',r.requested_cost,'final_cost',cost));
  return jsonb_build_object('proposal',to_jsonb(r),'character',to_jsonb(c),'account',to_jsonb(a));
end; $$;
revoke all on function public.progression_resolve_proposal(uuid,boolean,integer,text) from public;
grant execute on function public.progression_resolve_proposal(uuid,boolean,integer,text) to authenticated;

create or replace function public.progression_adjust_resource(p_table_id text,p_character_id text,p_resource_key text,p_delta numeric,p_reason text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare c public.characters; oldv numeric; newv numeric; vno integer; key text;
begin
  if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
  if not private.character_in_table(p_table_id,p_character_id,null) then raise exception 'CHARACTER_NOT_IN_TABLE'; end if;
  key:=trim(coalesce(p_resource_key,'')); if key='' or p_delta=0 or trim(coalesce(p_reason,''))='' then raise exception 'RESOURCE_DELTA_REASON_REQUIRED'; end if;
  select * into c from public.characters where id=p_character_id for update;
  begin oldv:=coalesce((c.payload->'resources'->>key)::numeric,0); exception when others then oldv:=0; end;
  newv:=greatest(0,oldv+p_delta);
  select coalesce(max(version_no),0)+1 into vno from public.character_versions where character_id=c.id;
  insert into public.character_versions(character_id,owner_id,version_no,snapshot) values(c.id,c.user_id::uuid,vno,c.payload);
  c.payload:=jsonb_set(c.payload,array['resources',key],to_jsonb(newv),true);
  update public.characters set payload=c.payload,updated_at=now() where id=c.id;
  insert into public.progression_transactions(table_id,character_id,actor_id,target_user_id,amount,balance_after,tx_type,reason,metadata)
    values(p_table_id,p_character_id,auth.uid(),c.user_id::uuid,0,null,'RESOURCE_ADJUST',trim(p_reason),jsonb_build_object('resource',key,'delta',p_delta,'from',oldv,'to',newv));
  return jsonb_build_object('resource',key,'from',oldv,'to',newv,'character',to_jsonb(c));
end; $$;
revoke all on function public.progression_adjust_resource(text,text,text,numeric,text) from public;
grant execute on function public.progression_adjust_resource(text,text,text,numeric,text) to authenticated;

create or replace function public.progression_request_resource(p_table_id text,p_character_id text,p_resource_key text,p_delta numeric,p_reason text)
returns public.character_resource_requests language plpgsql security definer set search_path=public,private as $$
declare r public.character_resource_requests;
begin
  if not private.character_in_table(p_table_id,p_character_id,auth.uid()) then raise exception 'CHARACTER_MEMBERSHIP_REQUIRED'; end if;
  if p_delta=0 or trim(coalesce(p_resource_key,''))='' or trim(coalesce(p_reason,''))='' then raise exception 'RESOURCE_DELTA_REASON_REQUIRED'; end if;
  insert into public.character_resource_requests(table_id,character_id,user_id,resource_key,delta,reason)
    values(p_table_id,p_character_id,auth.uid(),trim(p_resource_key),p_delta,left(trim(p_reason),500)) returning * into r;
  return r;
end; $$;
revoke all on function public.progression_request_resource(text,text,text,numeric,text) from public;
grant execute on function public.progression_request_resource(text,text,text,numeric,text) to authenticated;

create or replace function public.progression_resolve_resource(p_request_id uuid,p_approved boolean)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare r public.character_resource_requests; result jsonb;
begin
  select * into r from public.character_resource_requests where id=p_request_id for update;
  if r.id is null then raise exception 'REQUEST_NOT_FOUND'; end if;
  if not public.can_manage_table(r.table_id) then raise exception 'GM_REQUIRED'; end if;
  if r.status<>'pending' then return jsonb_build_object('request',to_jsonb(r)); end if;
  if p_approved then result:=public.progression_adjust_resource(r.table_id,r.character_id,r.resource_key,r.delta,r.reason); end if;
  update public.character_resource_requests set status=case when p_approved then 'approved' else 'rejected' end,decision_by=auth.uid(),decided_at=now() where id=r.id returning * into r;
  return jsonb_build_object('request',to_jsonb(r),'result',result);
end; $$;
revoke all on function public.progression_resolve_resource(uuid,boolean) from public;
grant execute on function public.progression_resolve_resource(uuid,boolean) to authenticated;

create or replace function public.progression_admin_tables()
returns table(table_id text,table_name text,game_mode text,status text,owner_username text,balance integer,lifetime_purchased integer,lifetime_admin_granted integer,lifetime_distributed integer)
language plpgsql security definer set search_path=public,private as $$
begin
  if public.current_profile_role()<>'admin' then raise exception 'ADMIN_REQUIRED'; end if;
  insert into public.table_progression_wallets(table_id) select id from public.tables on conflict(table_id) do nothing;
  return query select tb.id,tb.name,tb.game_mode,tb.status,coalesce(p.username,tb.owner_id),w.balance,w.lifetime_purchased,w.lifetime_admin_granted,w.lifetime_distributed
    from public.tables tb join public.table_progression_wallets w on w.table_id=tb.id left join public.profiles p on p.id=tb.owner_id order by tb.updated_at desc;
end; $$;
revoke all on function public.progression_admin_tables() from public;
grant execute on function public.progression_admin_tables() to authenticated;

create or replace function public.progression_admin_adjust_table(p_table_id text,p_amount integer,p_reason text)
returns public.table_progression_wallets language plpgsql security definer set search_path=public,private as $$
declare w public.table_progression_wallets;
begin
  if public.current_profile_role()<>'admin' then raise exception 'ADMIN_REQUIRED'; end if;
  if p_amount=0 or trim(coalesce(p_reason,''))='' then raise exception 'AMOUNT_AND_REASON_REQUIRED'; end if;
  perform private.ensure_progression_wallet(p_table_id);
  update public.table_progression_wallets set balance=balance+p_amount,lifetime_admin_granted=lifetime_admin_granted+case when p_amount>0 then p_amount else 0 end,updated_at=now()
    where table_id=p_table_id and balance+p_amount>=0 returning * into w;
  if w.table_id is null then raise exception 'INSUFFICIENT_TABLE_PROGRESSION'; end if;
  insert into public.progression_transactions(table_id,actor_id,amount,balance_after,tx_type,reason)
    values(p_table_id,auth.uid(),p_amount,w.balance,case when p_amount>0 then 'ADMIN_TABLE_GRANT' else 'ADMIN_TABLE_REMOVE' end,trim(p_reason));
  return w;
end; $$;
revoke all on function public.progression_admin_adjust_table(text,integer,text) from public;
grant execute on function public.progression_admin_adjust_table(text,integer,text) to authenticated;

-- Viewer universal com privacidade definida pela mesa.
create or replace function public.fetch_character_view(p_character_id text,p_table_id text default null)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare c public.characters; visibility text:='summary'; manager boolean:=false; member boolean:=false; own boolean:=false; out_payload jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into c from public.characters where id=p_character_id; if c.id is null then raise exception 'CHARACTER_NOT_FOUND'; end if;
  own:=c.user_id=auth.uid()::text;
  if p_table_id is not null then
    manager:=public.can_manage_table(p_table_id);
    member:=public.can_access_table_session(p_table_id);
    select coalesce(tb.settings#>>'{recruitment,sheetVisibility}','summary') into visibility from public.tables tb where tb.id=p_table_id;
    if not own and not manager and not member then raise exception 'TABLE_ACCESS_REQUIRED'; end if;
  elsif not own and public.current_profile_role()<>'admin' then raise exception 'CHARACTER_VIEW_FORBIDDEN'; end if;
  if own or manager or public.current_profile_role()='admin' or visibility='full' then out_payload:=c.payload;
  elsif visibility='private' then out_payload:=jsonb_build_object('name',c.name,'mode',c.mode,'nature',c.nature,'className',c.class_name,'avatar',c.payload->'avatar','category',coalesce(c.payload->'category',c.payload#>'{concept,category}'));
  else out_payload:=jsonb_build_object('name',c.name,'mode',c.mode,'nature',c.nature,'className',c.class_name,'avatar',c.payload->'avatar','category',coalesce(c.payload->'category',c.payload#>'{concept,category}'),'stats',c.payload->'stats','resources',c.payload->'resources','derived',c.payload->'derived','progression',c.payload->'progression');
  end if;
  return jsonb_build_object('id',c.id,'owner_id',c.owner_id,'user_id',c.user_id,'name',c.name,'mode',c.mode,'nature',c.nature,'class_name',c.class_name,'payload',out_payload,'visibility',case when own or manager or public.current_profile_role()='admin' then 'full' else visibility end,'updated_at',c.updated_at);
end; $$;
revoke all on function public.fetch_character_view(text,text) from public;
grant execute on function public.fetch_character_view(text,text) to authenticated;

-- Validação de nível/patamar na entrada em mesa.
create or replace function private.table_join_rejection(p_table_id text,p_user_id uuid,p_character_id text)
returns text language plpgsql security definer set search_path=public,private as $$
declare v_table public.tables; v_char public.characters; v_rec jsonb; v_mode text; v_allowed_exp jsonb; v_allowed_classes jsonb; v_max integer; v_count integer; rules jsonb; tier text; tier_n integer; min_tier integer; max_tier integer; lvl integer; pmin integer; pmax integer; pat integer; emin integer; emax integer;
begin
  if p_user_id is null then return 'AUTH_REQUIRED'; end if;
  select * into v_table from public.tables where id=p_table_id; if v_table.id is null then return 'TABLE_NOT_FOUND'; end if;
  if v_table.status not in ('active','paused') then return 'TABLE_NOT_AVAILABLE'; end if;
  if exists(select 1 from public.table_members where table_id=p_table_id and user_id=p_user_id and status='banned') then return 'MEMBER_BANNED'; end if;
  if exists(select 1 from public.table_members where table_id=p_table_id and user_id=p_user_id and status='active') then return 'ALREADY_MEMBER'; end if;
  select * into v_char from public.characters where id=p_character_id and user_id=p_user_id::text; if v_char.id is null then return 'CHARACTER_NOT_OWNED'; end if;
  v_rec:=coalesce(v_table.settings->'recruitment','{}'::jsonb); v_mode:=lower(coalesce(v_table.game_mode,'exodo')); if v_mode not in ('exodo','ocultatun','hybrid') then v_mode:='exodo'; end if;
  if v_mode<>'hybrid' and lower(coalesce(v_char.mode,''))<>v_mode then return 'GAME_MODE_MISMATCH'; end if;
  if v_mode='hybrid' and lower(coalesce(v_char.mode,'')) not in ('exodo','ocultatun') then return 'GAME_MODE_MISMATCH'; end if;
  v_allowed_exp:=case when jsonb_typeof(v_rec->'allowedExpansions')='array' then v_rec->'allowedExpansions' else '[]'::jsonb end; if jsonb_array_length(v_allowed_exp)>0 and not (v_allowed_exp ? coalesce(v_char.nature,'')) then return 'EXPANSION_MISMATCH'; end if;
  v_allowed_classes:=case when jsonb_typeof(v_rec->'allowedClasses')='array' then v_rec->'allowedClasses' else '[]'::jsonb end; if jsonb_array_length(v_allowed_classes)>0 and not (v_allowed_classes ? coalesce(v_char.class_name,'')) then return 'CLASS_MISMATCH'; end if;
  rules:=coalesce(v_rec->'levelRules','{}'::jsonb);
  if lower(v_char.mode)='exodo' then
    tier:=lower(coalesce(v_char.payload#>>'{progression,campaignTier}','iniciado')); tier_n:=case tier when 'veterano' then 3 when 'adaptado' then 2 else 1 end;
    min_tier:=case lower(coalesce(rules->>'exodoMin','iniciado')) when 'veterano' then 3 when 'adaptado' then 2 else 1 end;
    max_tier:=case lower(coalesce(rules->>'exodoMax','veterano')) when 'iniciado' then 1 when 'adaptado' then 2 else 3 end;
    if tier_n<min_tier or tier_n>max_tier then return 'CHARACTER_LEVEL_MISMATCH'; end if;
  else
    begin lvl:=coalesce((v_char.payload#>>'{progression,existenceLevel}')::integer,5); exception when others then lvl:=5; end;
    begin pat:=coalesce((v_char.payload#>>'{progression,patamar}')::integer,1); exception when others then pat:=1; end;
    begin emin:=coalesce((rules->>'existenceMin')::integer,5); exception when others then emin:=5; end;
    begin emax:=coalesce((rules->>'existenceMax')::integer,0); exception when others then emax:=0; end;
    begin pmin:=coalesce((rules->>'patamarMin')::integer,1); exception when others then pmin:=1; end;
    begin pmax:=coalesce((rules->>'patamarMax')::integer,4); exception when others then pmax:=4; end;
    if lvl>emin or lvl<emax or pat<pmin or pat>pmax then return 'CHARACTER_LEVEL_MISMATCH'; end if;
  end if;
  begin v_max:=greatest(1,least(20,coalesce((v_rec->>'maxPlayers')::integer,6))); exception when others then v_max:=6; end;
  select count(*)::integer into v_count from public.table_members where table_id=p_table_id and status='active' and member_role='jogador'; if v_count>=v_max then return 'TABLE_FULL'; end if;
  return null;
end; $$;
revoke all on function private.table_join_rejection(text,uuid,text) from public,anon,authenticated;


-- Recrutamento V2.8.9 preserva visibilidade e requisitos de ficha em vez de descartá-los.
create or replace function public.update_table_recruitment_secure(p_table_id text,p_game_mode text,p_description text,p_recruitment jsonb)
returns public.tables language plpgsql security definer set search_path=public as $$
declare v public.tables; v_mode text:=lower(trim(coalesce(p_game_mode,''))); v_rec jsonb:=coalesce(p_recruitment,'{}'::jsonb); v_max integer; v_visibility text; v_rules jsonb;
begin
  if not public.can_manage_table(p_table_id) then raise exception 'GM_REQUIRED'; end if;
  if v_mode not in ('exodo','ocultatun','hybrid') then raise exception 'INVALID_GAME_MODE'; end if;
  begin v_max:=greatest(1,least(20,coalesce((v_rec->>'maxPlayers')::integer,6))); exception when others then v_max:=6; end;
  v_visibility:=lower(coalesce(v_rec->>'sheetVisibility','summary'));
  if v_visibility not in ('full','summary','private') then v_visibility:='summary'; end if;
  v_rules:=case when jsonb_typeof(v_rec->'levelRules')='object' then v_rec->'levelRules' else '{}'::jsonb end;
  v_rec:=jsonb_build_object(
    'published',case lower(coalesce(v_rec->>'published','true')) when 'false' then false else true end,
    'acceptingRequests',case lower(coalesce(v_rec->>'acceptingRequests','true')) when 'false' then false else true end,
    'maxPlayers',v_max,
    'allowedExpansions',case when jsonb_typeof(v_rec->'allowedExpansions')='array' then v_rec->'allowedExpansions' else '[]'::jsonb end,
    'allowedClasses',case when jsonb_typeof(v_rec->'allowedClasses')='array' then v_rec->'allowedClasses' else '[]'::jsonb end,
    'sheetVisibility',v_visibility,
    'levelRules',v_rules
  );
  update public.tables set game_mode=v_mode,settings=jsonb_set(jsonb_set(jsonb_set(coalesce(settings,'{}'::jsonb),'{description}',to_jsonb(left(coalesce(p_description,''),2000)),true),'{recruitment}',v_rec,true),'{expansions}',v_rec->'allowedExpansions',true),updated_at=now()
  where id=p_table_id returning * into v;
  if v.id is null then raise exception 'TABLE_NOT_FOUND'; end if;
  return v;
end; $$;
revoke all on function public.update_table_recruitment_secure(text,text,text,jsonb) from public;
grant execute on function public.update_table_recruitment_secure(text,text,text,jsonb) to authenticated;

commit;
