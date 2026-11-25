-- Mundos Sombrios V2.5 — Soul Economy
-- Execute APÓS supabase-production.sql e supabase-master-v2.3-migration.sql.
-- Saldo, Colheita, compras, slots e expansões são server-authoritative.
begin;

create table if not exists public.soul_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  lifetime_earned bigint not null default 0 check (lifetime_earned >= 0),
  lifetime_harvested bigint not null default 0 check (lifetime_harvested >= 0),
  lifetime_spent bigint not null default 0 check (lifetime_spent >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.soul_wallets add column if not exists lifetime_harvested bigint not null default 0 check (lifetime_harvested >= 0);

create table if not exists public.soul_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount bigint not null,
  balance_after bigint not null,
  tx_type text not null check (tx_type in ('HARVEST','ACHIEVEMENT','PURCHASE','ADMIN_GRANT','ADMIN_REMOVE','ENTITLEMENT_GRANT','ENTITLEMENT_REVOKE','REFUND','SYSTEM_REWARD')),
  source text not null default 'system',
  reference_id text,
  metadata jsonb not null default '{}'::jsonb,
  admin_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_soul_transactions_user_created on public.soul_transactions(user_id,created_at desc);
alter table public.soul_transactions drop constraint if exists soul_transactions_tx_type_check;
alter table public.soul_transactions add constraint soul_transactions_tx_type_check check (tx_type in ('HARVEST','ACHIEVEMENT','PURCHASE','ADMIN_GRANT','ADMIN_REMOVE','ENTITLEMENT_GRANT','ENTITLEMENT_REVOKE','REFUND','SYSTEM_REWARD'));

create table if not exists public.soul_catalog (
  product_key text primary key,
  product_type text not null check (product_type in ('character_slot','table_slot','expansion')),
  display_name text not null,
  price bigint not null check (price >= 0),
  entitlement_key text not null,
  description text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.soul_catalog(product_key,product_type,display_name,price,entitlement_key,description,metadata,sort_order) values
 ('character_slot','character_slot','Slot adicional de ficha',20000,'character_slot_bonus','Amplia em +1 a capacidade de fichas da conta.','{"icon":"soul-slot-character"}'::jsonb,10),
 ('exp_aprimorador','expansion','Arquiteto de Linhagem · Aprimorador',50000,'aprimorador','Desbloqueia criação de fichas da expansão Aprimorador.','{"world":"exodo"}'::jsonb,20),
 ('exp_player','expansion','Operador de Sistema · Projeto Player',55000,'projeto-player','Desbloqueia criação de fichas do Projeto Player.','{"world":"exodo"}'::jsonb,30),
 ('exp_linhagem','expansion','Classer · Linhagem Herdada',60000,'linhagem-herdada','Desbloqueia criação de fichas da Linhagem Herdada.','{"world":"exodo"}'::jsonb,40),
 ('exp_envolto','expansion','O Envolto',70000,'envolto','Desbloqueia criação de fichas do Envolto.','{"world":"ocultatun","rarity":"alta"}'::jsonb,50),
 ('exp_ordem','expansion','A Ordem dos Sete Arcanjos',70000,'ordem-dos-sete','Desbloqueia criação de fichas da Ordem dos Sete.','{"world":"ocultatun","rarity":"alta"}'::jsonb,60),
 ('master_table_slot','table_slot','Slot adicional de mesa',70000,'table_slot_bonus','Amplia em +1 a capacidade de mesas de uma conta Mestre.','{"role":"mestre"}'::jsonb,70)
on conflict(product_key) do update set product_type=excluded.product_type,display_name=excluded.display_name,price=excluded.price,entitlement_key=excluded.entitlement_key,description=excluded.description,metadata=excluded.metadata,sort_order=excluded.sort_order,active=true,updated_at=now();

create table if not exists public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_type text not null check (entitlement_type in ('expansion','character_slot_bonus','table_slot_bonus','cosmetic','title')),
  entitlement_key text not null,
  quantity integer not null default 1 check (quantity >= 0),
  source text not null default 'purchase',
  metadata jsonb not null default '{}'::jsonb,
  granted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,entitlement_type,entitlement_key)
);
create index if not exists idx_user_entitlements_user on public.user_entitlements(user_id);

create table if not exists public.soul_harvest_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_activity_at timestamptz not null default now(),
  credited_minutes integer not null default 0 check (credited_minutes between 0 and 10),
  status text not null default 'active' check (status in ('active','complete','cancelled')),
  source text not null default 'interaction',
  created_at timestamptz not null default now()
);
create index if not exists idx_soul_harvest_user_status on public.soul_harvest_sessions(user_id,status,started_at desc);
create unique index if not exists idx_soul_harvest_one_active on public.soul_harvest_sessions(user_id) where status='active';

create table if not exists public.soul_achievements (
  achievement_key text primary key,
  title text not null,
  description text not null,
  category text not null,
  threshold bigint not null default 0,
  reward bigint not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0
);
insert into public.soul_achievements(achievement_key,title,description,category,threshold,reward,metadata,sort_order) values
 ('first_harvest','Primeiro Eco','Complete sua primeira Colheita.','COLHEITA',20,50,'{"badge":"eco"}'::jsonb,10),
 ('collector_10k','Acumulador de Almas','Colha 10.000 SoulDrakmas em sessões de Colheita.','COLHEITA',10000,250,'{"badge":"acumulador"}'::jsonb,20),
 ('collector_50k','O Peso da Alma','Colha 50.000 SoulDrakmas em sessões de Colheita.','COLHEITA',50000,1000,'{"badge":"peso"}'::jsonb,30),
 ('collector_100k','Ceifador','Colha 100.000 SoulDrakmas em sessões de Colheita.','COLHEITA',100000,2500,'{"badge":"ceifador","cosmetic":"moldura-fenda"}'::jsonb,40),
 ('unlock_aprimorador','Arquiteto da Carne','Desbloqueie Aprimorador.','EXPANSÕES',1,250,'{"entitlement":"aprimorador"}'::jsonb,50),
 ('unlock_player','Código Fantasma','Desbloqueie Projeto Player.','EXPANSÕES',1,250,'{"entitlement":"projeto-player"}'::jsonb,60),
 ('unlock_linhagem','Sangue Antigo','Desbloqueie Linhagem Herdada.','EXPANSÕES',1,250,'{"entitlement":"linhagem-herdada"}'::jsonb,70),
 ('unlock_envolto','Além do Véu','Desbloqueie O Envolto.','EXPANSÕES',1,500,'{"entitlement":"envolto"}'::jsonb,80),
 ('unlock_ordem','Sete Vozes','Desbloqueie a Ordem dos Sete.','EXPANSÕES',1,500,'{"entitlement":"ordem-dos-sete"}'::jsonb,90),
 ('first_character','Primeira Alma','Forje sua primeira ficha.','PERSONAGENS',1,100,'{}'::jsonb,100)
on conflict(achievement_key) do update set title=excluded.title,description=excluded.description,category=excluded.category,threshold=excluded.threshold,reward=excluded.reward,metadata=excluded.metadata,sort_order=excluded.sort_order;

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_key text not null references public.soul_achievements(achievement_key) on delete cascade,
  unlocked_at timestamptz not null default now(),
  reward_granted bigint not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  primary key(user_id,achievement_key)
);

create or replace function public.soul_profile_role(p_user uuid default auth.uid()) returns text
language sql stable security definer set search_path=public as $$
  select coalesce((select role from public.profiles where auth_user_id=p_user and banned=false limit 1),'jogador');
$$;

create or replace function public.soul_ensure_wallet(p_user uuid default auth.uid()) returns public.soul_wallets
language plpgsql security definer set search_path=public as $$
declare w public.soul_wallets;
begin
  if p_user is null then raise exception 'AUTH_REQUIRED'; end if;
  insert into public.soul_wallets(user_id) values(p_user) on conflict(user_id) do nothing;
  select * into w from public.soul_wallets where user_id=p_user;
  return w;
end; $$;

create or replace function public.soul_slot_bonus(p_user uuid,p_type text) returns integer
language sql stable security definer set search_path=public as $$
 select coalesce(sum(quantity),0)::integer from public.user_entitlements where user_id=p_user and entitlement_type=p_type;
$$;

create or replace function public.soul_character_capacity(p_user uuid default auth.uid()) returns integer
language plpgsql stable security definer set search_path=public as $$
declare r text; base integer;
begin
 r:=public.soul_profile_role(p_user);
 if r='admin' then return 2147483647; end if;
 base:=case when r='mestre' then 5 else 3 end;
 return base + public.soul_slot_bonus(p_user,'character_slot_bonus');
end; $$;

create or replace function public.soul_table_capacity(p_user uuid default auth.uid()) returns integer
language plpgsql stable security definer set search_path=public as $$
declare r text; base integer;
begin
 r:=public.soul_profile_role(p_user);
 if r='admin' then return 2147483647; end if;
 if r<>'mestre' then return 0; end if;
 base:=3;
 return base + public.soul_slot_bonus(p_user,'table_slot_bonus');
end; $$;

create or replace function public.soul_expansion_key_for_nature(p_nature text) returns text
language plpgsql immutable as $$
declare n text:=lower(coalesce(p_nature,'')); begin
 if n like '%aprimorador%' or n like '%arquiteto de linhagem%' then return 'aprimorador'; end if;
 if n like '%proj. player%' or n like '%projeto player%' or n like '%operador de sistema%' then return 'projeto-player'; end if;
 if n like '%classer%' or n like '%linhagem herdada%' then return 'linhagem-herdada'; end if;
 if n like '%envolto%' then return 'envolto'; end if;
 if n like '%ordem dos sete%' then return 'ordem-dos-sete'; end if;
 return null;
end; $$;

create or replace function public.soul_has_expansion(p_user uuid,p_key text) returns boolean
language plpgsql stable security definer set search_path=public as $$
declare r text; begin
 if p_key is null or trim(p_key)='' then return true; end if;
 r:=public.soul_profile_role(p_user);
 if r in ('mestre','admin') then return true; end if;
 return exists(select 1 from public.user_entitlements where user_id=p_user and entitlement_type='expansion' and entitlement_key=p_key and quantity>0);
end; $$;

create or replace function public.soul_add_transaction(p_user uuid,p_amount bigint,p_type text,p_source text,p_reference text default null,p_metadata jsonb default '{}'::jsonb,p_admin uuid default null)
returns bigint language plpgsql security definer set search_path=public as $$
declare new_balance bigint; begin
 perform public.soul_ensure_wallet(p_user);
 update public.soul_wallets set
   balance=balance+p_amount,
   lifetime_earned=lifetime_earned+case when p_amount>0 then p_amount else 0 end,
   lifetime_harvested=lifetime_harvested+case when p_type='HARVEST' and p_amount>0 then p_amount else 0 end,
   lifetime_spent=lifetime_spent+case when p_amount<0 then -p_amount else 0 end,
   updated_at=now()
 where user_id=p_user and balance+p_amount>=0 returning balance into new_balance;
 if new_balance is null then raise exception 'INSUFFICIENT_SOULDRAKMA'; end if;
 insert into public.soul_transactions(user_id,amount,balance_after,tx_type,source,reference_id,metadata,admin_id)
 values(p_user,p_amount,new_balance,p_type,coalesce(nullif(p_source,''),'system'),p_reference,coalesce(p_metadata,'{}'::jsonb),p_admin);
 return new_balance;
end; $$;
revoke all on function public.soul_add_transaction(uuid,bigint,text,text,text,jsonb,uuid) from public,anon,authenticated;

create or replace function public.soul_unlock_achievement(p_user uuid,p_key text) returns boolean
language plpgsql security definer set search_path=public as $$
declare a public.soul_achievements; affected integer:=0; begin
 select * into a from public.soul_achievements where achievement_key=p_key;
 if a.achievement_key is null then return false; end if;
 insert into public.user_achievements(user_id,achievement_key,reward_granted,metadata)
 values(p_user,p_key,a.reward,a.metadata) on conflict do nothing;
 get diagnostics affected = row_count;
 if affected>0 then
   if a.reward>0 then perform public.soul_add_transaction(p_user,a.reward,'ACHIEVEMENT','achievement',p_key,jsonb_build_object('title',a.title),null); end if;
   if nullif(a.metadata->>'cosmetic','') is not null then
     insert into public.user_entitlements(user_id,entitlement_type,entitlement_key,quantity,source,metadata)
     values(p_user,'cosmetic',a.metadata->>'cosmetic',1,'achievement',jsonb_build_object('achievement',p_key))
     on conflict(user_id,entitlement_type,entitlement_key) do update set quantity=greatest(public.user_entitlements.quantity,1),source='achievement',updated_at=now();
   end if;
   if nullif(a.metadata->>'title','') is not null then
     insert into public.user_entitlements(user_id,entitlement_type,entitlement_key,quantity,source,metadata)
     values(p_user,'title',a.metadata->>'title',1,'achievement',jsonb_build_object('achievement',p_key))
     on conflict(user_id,entitlement_type,entitlement_key) do update set quantity=greatest(public.user_entitlements.quantity,1),source='achievement',updated_at=now();
   end if;
 end if;
 return affected>0;
end; $$;
revoke all on function public.soul_unlock_achievement(uuid,text) from public,anon,authenticated;

create or replace function public.soul_check_achievements(p_user uuid default auth.uid()) returns void
language plpgsql security definer set search_path=public as $$
declare harvested bigint; rec record; begin
 perform public.soul_ensure_wallet(p_user);
 select lifetime_harvested into harvested from public.soul_wallets where user_id=p_user;
 if harvested>=20 then perform public.soul_unlock_achievement(p_user,'first_harvest'); end if;
 if harvested>=10000 then perform public.soul_unlock_achievement(p_user,'collector_10k'); end if;
 if harvested>=50000 then perform public.soul_unlock_achievement(p_user,'collector_50k'); end if;
 if harvested>=100000 then perform public.soul_unlock_achievement(p_user,'collector_100k'); end if;
 if exists(select 1 from public.characters where user_id=p_user::text) then perform public.soul_unlock_achievement(p_user,'first_character'); end if;
 for rec in select entitlement_key from public.user_entitlements where user_id=p_user and entitlement_type='expansion' and quantity>0 loop
   perform public.soul_unlock_achievement(p_user,case rec.entitlement_key when 'aprimorador' then 'unlock_aprimorador' when 'projeto-player' then 'unlock_player' when 'linhagem-herdada' then 'unlock_linhagem' when 'envolto' then 'unlock_envolto' when 'ordem-dos-sete' then 'unlock_ordem' else '__none__' end);
 end loop;
end; $$;
revoke all on function public.soul_check_achievements(uuid) from public,anon,authenticated;

create or replace function public.soul_settle_harvest(p_user uuid default auth.uid()) returns jsonb
language plpgsql security definer set search_path=public as $$
declare h public.soul_harvest_sessions; target integer; delta integer; award bigint; w public.soul_wallets; effective_until timestamptz; begin
 if p_user is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into h from public.soul_harvest_sessions where user_id=p_user and status='active' order by started_at desc limit 1 for update;
 if h.id is not null then
   effective_until:=least(now(),h.expires_at,h.last_activity_at+interval '75 seconds');
   target:=greatest(0,least(10,floor(extract(epoch from (effective_until-h.started_at))/60)::integer));
   delta:=greatest(0,target-h.credited_minutes); award:=delta*2;
   if award>0 then perform public.soul_add_transaction(p_user,award,'HARVEST','colheita',h.id::text,jsonb_build_object('minutes',delta),null); end if;
   update public.soul_harvest_sessions set credited_minutes=target,status=case when now()>=expires_at or target>=10 then 'complete' else status end where id=h.id returning * into h;
 end if;
 select * into w from public.soul_ensure_wallet(p_user);
 perform public.soul_check_achievements(p_user);
 select * into w from public.soul_wallets where user_id=p_user;
 return jsonb_build_object('wallet',to_jsonb(w),'harvest',case when h.id is null then null else to_jsonb(h) end);
end; $$;

create or replace function public.soul_touch_activity(p_source text default 'interaction') returns jsonb
language plpgsql security definer set search_path=public as $$
declare old jsonb; h public.soul_harvest_sessions; begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 old:=public.soul_settle_harvest(auth.uid());
 select * into h from public.soul_harvest_sessions where user_id=auth.uid() and status='active' order by started_at desc limit 1;
 if h.id is null then
   insert into public.soul_harvest_sessions(user_id,started_at,expires_at,last_activity_at,status,source)
   values(auth.uid(),now(),now()+interval '10 minutes',now(),'active',left(coalesce(p_source,'interaction'),80)) returning * into h;
 else
   update public.soul_harvest_sessions set last_activity_at=now() where id=h.id returning * into h;
 end if;
 return jsonb_build_object('wallet',(select to_jsonb(w) from public.soul_wallets w where user_id=auth.uid()),'harvest',to_jsonb(h));
end; $$;

create or replace function public.soul_harvest_tick() returns jsonb
language plpgsql security definer set search_path=public as $$
declare result jsonb; h public.soul_harvest_sessions; begin
 result:=public.soul_settle_harvest(auth.uid());
 update public.soul_harvest_sessions set last_activity_at=now() where user_id=auth.uid() and status='active' returning * into h;
 if h.id is not null then result:=jsonb_set(result,'{harvest}',to_jsonb(h),true); end if;
 return result;
end; $$;

create or replace function public.soul_purchase(p_product_key text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare p public.soul_catalog; r text; w public.soul_wallets; etype text; newq integer; begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into p from public.soul_catalog where product_key=p_product_key and active=true for update;
 if p.product_key is null then raise exception 'PRODUCT_NOT_FOUND'; end if;
 r:=public.soul_profile_role(auth.uid());
 if r='admin' then raise exception 'ADMIN_UNLIMITED_ACCESS'; end if;
 if p.product_type='table_slot' and r<>'mestre' then raise exception 'MASTER_ONLY_PRODUCT'; end if;
 if p.product_type='expansion' and r<>'jogador' then raise exception 'EXPANSIONS_ALREADY_UNLOCKED'; end if;
 if p.product_type='expansion' and public.soul_has_expansion(auth.uid(),p.entitlement_key) then raise exception 'ALREADY_UNLOCKED'; end if;
 perform public.soul_add_transaction(auth.uid(),-p.price,'PURCHASE','soul-vault',p.product_key,jsonb_build_object('product',p.display_name),null);
 etype:=case p.product_type when 'character_slot' then 'character_slot_bonus' when 'table_slot' then 'table_slot_bonus' else 'expansion' end;
 insert into public.user_entitlements(user_id,entitlement_type,entitlement_key,quantity,source,metadata)
 values(auth.uid(),etype,p.entitlement_key,1,'purchase',jsonb_build_object('product_key',p.product_key))
 on conflict(user_id,entitlement_type,entitlement_key) do update set quantity=public.user_entitlements.quantity+1,updated_at=now(),source='purchase';
 perform public.soul_check_achievements(auth.uid());
 select * into w from public.soul_wallets where user_id=auth.uid();
 select quantity into newq from public.user_entitlements where user_id=auth.uid() and entitlement_type=etype and entitlement_key=p.entitlement_key;
 return jsonb_build_object('ok',true,'product',to_jsonb(p),'wallet',to_jsonb(w),'quantity',newq);
end; $$;

create or replace function public.soul_get_account_state() returns jsonb
language plpgsql security definer set search_path=public as $$
declare r text; w public.soul_wallets; h public.soul_harvest_sessions; cc integer; tc integer; begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 perform public.soul_settle_harvest(auth.uid());
 perform public.soul_check_achievements(auth.uid());
 r:=public.soul_profile_role(auth.uid()); select * into w from public.soul_wallets where user_id=auth.uid();
 select * into h from public.soul_harvest_sessions where user_id=auth.uid() and status='active' order by started_at desc limit 1;
 cc:=public.soul_character_capacity(auth.uid()); tc:=public.soul_table_capacity(auth.uid());
 return jsonb_build_object(
   'role',r,'wallet',to_jsonb(w),'characterCapacity',cc,'tableCapacity',tc,
   'unlimitedCharacters',r='admin','unlimitedTables',r='admin','allExpansions',r in ('mestre','admin'),
   'entitlements',(select coalesce(jsonb_agg(to_jsonb(e) order by e.entitlement_type,e.entitlement_key),'[]'::jsonb) from public.user_entitlements e where e.user_id=auth.uid() and e.quantity>0),
   'catalog',(select coalesce(jsonb_agg(to_jsonb(c) order by c.sort_order),'[]'::jsonb) from public.soul_catalog c where c.active=true),
   'harvest',case when h.id is null then null else to_jsonb(h) end,
   'achievements',(select coalesce(jsonb_agg(jsonb_build_object('key',a.achievement_key,'title',a.title,'description',a.description,'category',a.category,'threshold',a.threshold,'reward',a.reward,'metadata',a.metadata,'unlocked',ua.user_id is not null,'unlocked_at',ua.unlocked_at) order by a.sort_order),'[]'::jsonb) from public.soul_achievements a left join public.user_achievements ua on ua.achievement_key=a.achievement_key and ua.user_id=auth.uid()),
   'transactions',(select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]'::jsonb) from (select * from public.soul_transactions where user_id=auth.uid() order by created_at desc limit 30) t)
 );
end; $$;

create or replace function public.soul_admin_resolve_user(p_profile_id text) returns uuid
language plpgsql stable security definer set search_path=public as $$
declare u uuid; begin
 if public.soul_profile_role(auth.uid())<>'admin' then raise exception 'ADMIN_REQUIRED'; end if;
 select auth_user_id into u from public.profiles where id=p_profile_id or auth_user_id::text=p_profile_id limit 1;
 if u is null then raise exception 'USER_NOT_FOUND'; end if; return u;
end; $$;

create or replace function public.soul_admin_adjust_balance(p_profile_id text,p_amount bigint,p_reason text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid; nb bigint; begin
 u:=public.soul_admin_resolve_user(p_profile_id);
 if p_amount=0 then raise exception 'ZERO_ADJUSTMENT'; end if;
 if trim(coalesce(p_reason,''))='' then raise exception 'REASON_REQUIRED'; end if;
 nb:=public.soul_add_transaction(u,p_amount,case when p_amount>0 then 'ADMIN_GRANT' else 'ADMIN_REMOVE' end,'admin-console',null,jsonb_build_object('reason',trim(p_reason)),auth.uid());
 return jsonb_build_object('ok',true,'balance',nb);
end; $$;

create or replace function public.soul_admin_set_entitlement(p_profile_id text,p_type text,p_key text,p_quantity integer,p_reason text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid; target_role text; begin
 u:=public.soul_admin_resolve_user(p_profile_id); target_role:=public.soul_profile_role(u);
 if p_type not in ('expansion','character_slot_bonus','table_slot_bonus','cosmetic','title') then raise exception 'INVALID_ENTITLEMENT_TYPE'; end if;
 if trim(coalesce(p_key,''))='' or trim(coalesce(p_reason,''))='' then raise exception 'KEY_AND_REASON_REQUIRED'; end if;
 if p_type='expansion' and p_key not in ('aprimorador','projeto-player','linhagem-herdada','envolto','ordem-dos-sete') then raise exception 'INVALID_EXPANSION_KEY'; end if;
 if p_type='expansion' and target_role in ('mestre','admin') then raise exception 'ROLE_HAS_INHERENT_EXPANSIONS'; end if;
 if p_type='character_slot_bonus' and p_key<>'character_slot_bonus' then raise exception 'INVALID_CHARACTER_SLOT_KEY'; end if;
 if p_type='table_slot_bonus' and p_key<>'table_slot_bonus' then raise exception 'INVALID_TABLE_SLOT_KEY'; end if;
 if p_quantity<=0 then
   delete from public.user_entitlements where user_id=u and entitlement_type=p_type and entitlement_key=p_key;
   perform public.soul_add_transaction(u,0,'ENTITLEMENT_REVOKE','admin-console',p_key,jsonb_build_object('reason',trim(p_reason),'type',p_type,'quantity',0),auth.uid());
 else
   insert into public.user_entitlements(user_id,entitlement_type,entitlement_key,quantity,source,metadata) values(u,p_type,p_key,p_quantity,'admin',jsonb_build_object('reason',trim(p_reason),'admin',auth.uid())) on conflict(user_id,entitlement_type,entitlement_key) do update set quantity=excluded.quantity,source='admin',metadata=excluded.metadata,updated_at=now();
   perform public.soul_add_transaction(u,0,'ENTITLEMENT_GRANT','admin-console',p_key,jsonb_build_object('reason',trim(p_reason),'type',p_type,'quantity',p_quantity),auth.uid());
 end if;
 return jsonb_build_object('ok',true,'quantity',greatest(p_quantity,0));
end; $$;

create or replace function public.soul_admin_get_account(p_profile_id text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare u uuid; r text; begin
 u:=public.soul_admin_resolve_user(p_profile_id); r:=public.soul_profile_role(u); perform public.soul_ensure_wallet(u);
 return jsonb_build_object('role',r,'wallet',(select to_jsonb(w) from public.soul_wallets w where w.user_id=u),'characterCapacity',public.soul_character_capacity(u),'tableCapacity',public.soul_table_capacity(u),'entitlements',(select coalesce(jsonb_agg(to_jsonb(e)),'[]'::jsonb) from public.user_entitlements e where e.user_id=u),'transactions',(select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]'::jsonb) from (select * from public.soul_transactions where user_id=u order by created_at desc limit 50) t));
end; $$;

-- Guardas server-side de criação de personagens e uso de expansões.
create or replace function public.save_character_secure(p_id text,p_name text,p_mode text,p_nature text,p_class_name text,p_payload jsonb)
returns public.characters language plpgsql security definer set search_path=public as $$
declare v_character public.characters; v_existing public.characters; v_key text; v_count integer; begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if trim(coalesce(p_name,''))='' then raise exception 'CHARACTER_NAME_REQUIRED'; end if;
  if trim(coalesce(p_nature,''))='' then raise exception 'CHARACTER_EXPANSION_REQUIRED'; end if;
  if trim(coalesce(p_class_name,''))='' then raise exception 'CHARACTER_CLASS_REQUIRED'; end if;
 select * into v_existing from public.characters where id=p_id and user_id=auth.uid()::text;
 v_key:=public.soul_expansion_key_for_nature(p_nature);
 if v_existing.id is null then
   select count(*) into v_count from public.characters where user_id=auth.uid()::text;
   if v_count>=public.soul_character_capacity(auth.uid()) then raise exception 'CHARACTER_SLOT_LIMIT'; end if;
   if not public.soul_has_expansion(auth.uid(),v_key) then raise exception 'EXPANSION_LOCKED:%',coalesce(v_key,'unknown'); end if;
   insert into public.characters(id,owner_id,user_id,name,mode,nature,class_name,payload) values(coalesce(nullif(p_id,''),'c-'||gen_random_uuid()::text),auth.uid()::text,auth.uid()::text,trim(p_name),coalesce(nullif(p_mode,''),'exodo'),p_nature,p_class_name,coalesce(p_payload,'{}'::jsonb)) returning * into v_character;
 else
   -- Personagens legados permanecem editáveis mesmo se o entitlement for removido. Trocar para outra expansão bloqueada não é permitido.
   if v_key is not null and v_key is distinct from public.soul_expansion_key_for_nature(v_existing.nature) and not public.soul_has_expansion(auth.uid(),v_key) then raise exception 'EXPANSION_LOCKED:%',v_key; end if;
   insert into public.character_versions(character_id,owner_id,version_no,snapshot) select v_existing.id,auth.uid(),coalesce(max(version_no),0)+1,v_existing.payload from public.character_versions where character_id=v_existing.id;
   update public.characters set name=trim(p_name),mode=coalesce(nullif(p_mode,''),mode),nature=p_nature,class_name=p_class_name,payload=coalesce(p_payload,'{}'::jsonb),updated_at=now() where id=v_existing.id returning * into v_character;
 end if;
 perform public.soul_check_achievements(auth.uid());
 return v_character;
end; $$;

-- Guardas server-side de criação de mesa.
create or replace function public.create_table_secure(p_id text,p_code text,p_name text,p_theme text,p_game_mode text,p_settings jsonb default '{}'::jsonb)
returns public.tables language plpgsql security definer set search_path=public as $$
declare v_table public.tables; v_user text; v_count integer; v_role text; begin
 v_role:=public.soul_profile_role(auth.uid());
 if v_role not in ('mestre','admin') then raise exception 'GM_REQUIRED'; end if;
 v_user:=(select id from public.profiles where auth_user_id=auth.uid() and banned=false limit 1);
 select count(*) into v_count from public.tables where owner_id=v_user;
 if v_count>=public.soul_table_capacity(auth.uid()) then raise exception 'TABLE_SLOT_LIMIT'; end if;
 insert into public.tables(id,code,name,theme,game_mode,owner_id,participants,banned,settings) values(coalesce(nullif(p_id,''),gen_random_uuid()::text),upper(trim(p_code)),trim(p_name),coalesce(p_theme,'default'),coalesce(p_game_mode,'exodo'),v_user,'[]'::jsonb,'[]'::jsonb,coalesce(p_settings,'{}'::jsonb)) returning * into v_table;
 insert into public.table_members(table_id,user_id,member_role) values(v_table.id,auth.uid(),'mestre') on conflict do nothing;
 update public.tables set participants=jsonb_build_array(jsonb_build_object('userId',auth.uid()::text,'charId',null,'charName',(select username from public.profiles where auth_user_id=auth.uid()),'ownerId',v_user,'isOwner',true,'linkedAt',extract(epoch from now())*1000)) where id=v_table.id returning * into v_table;
 insert into public.table_state(table_id,state) values(v_table.id,'{}'::jsonb) on conflict do nothing;
 return v_table;
end; $$;

-- Funções auxiliares são internas; usuários interagem somente pelas RPCs públicas abaixo.
revoke all on function public.soul_profile_role(uuid) from public,anon,authenticated;
revoke all on function public.soul_ensure_wallet(uuid) from public,anon,authenticated;
revoke all on function public.soul_slot_bonus(uuid,text) from public,anon,authenticated;
revoke all on function public.soul_expansion_key_for_nature(text) from public,anon,authenticated;
revoke all on function public.soul_settle_harvest(uuid) from public,anon,authenticated;
revoke all on function public.soul_admin_resolve_user(text) from public,anon,authenticated;

-- RLS: usuários só leem a própria economia; catálogo/achievements são leitura pública autenticada.
alter table public.soul_wallets enable row level security; alter table public.soul_transactions enable row level security; alter table public.soul_catalog enable row level security; alter table public.user_entitlements enable row level security; alter table public.soul_harvest_sessions enable row level security; alter table public.soul_achievements enable row level security; alter table public.user_achievements enable row level security;
drop policy if exists soul_wallet_self on public.soul_wallets; create policy soul_wallet_self on public.soul_wallets for select using(user_id=auth.uid());
drop policy if exists soul_tx_self on public.soul_transactions; create policy soul_tx_self on public.soul_transactions for select using(user_id=auth.uid());
drop policy if exists soul_catalog_read on public.soul_catalog; create policy soul_catalog_read on public.soul_catalog for select to authenticated using(active=true);
drop policy if exists soul_ent_self on public.user_entitlements; create policy soul_ent_self on public.user_entitlements for select using(user_id=auth.uid());
drop policy if exists soul_harvest_self on public.soul_harvest_sessions; create policy soul_harvest_self on public.soul_harvest_sessions for select using(user_id=auth.uid());
drop policy if exists soul_ach_read on public.soul_achievements; create policy soul_ach_read on public.soul_achievements for select to authenticated using(true);
drop policy if exists soul_user_ach_self on public.user_achievements; create policy soul_user_ach_self on public.user_achievements for select using(user_id=auth.uid());

revoke all on function public.soul_get_account_state() from public; grant execute on function public.soul_get_account_state() to authenticated;
revoke all on function public.soul_touch_activity(text) from public; grant execute on function public.soul_touch_activity(text) to authenticated;
revoke all on function public.soul_harvest_tick() from public; grant execute on function public.soul_harvest_tick() to authenticated;
revoke all on function public.soul_purchase(text) from public; grant execute on function public.soul_purchase(text) to authenticated;
revoke all on function public.soul_admin_adjust_balance(text,bigint,text) from public; grant execute on function public.soul_admin_adjust_balance(text,bigint,text) to authenticated;
revoke all on function public.soul_admin_set_entitlement(text,text,text,integer,text) from public; grant execute on function public.soul_admin_set_entitlement(text,text,text,integer,text) to authenticated;
revoke all on function public.soul_admin_get_account(text) from public; grant execute on function public.soul_admin_get_account(text) to authenticated;
revoke all on function public.soul_character_capacity(uuid) from public,anon,authenticated;
revoke all on function public.soul_table_capacity(uuid) from public,anon,authenticated;
revoke all on function public.soul_has_expansion(uuid,text) from public,anon,authenticated;

commit;
