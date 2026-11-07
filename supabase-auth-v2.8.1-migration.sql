-- Mundos Sombrios V2.8.1 — Correção de autenticação e vínculo de perfis
-- Aplicar APÓS as migrações V2.8.0. Idempotente.
begin;

alter table public.profiles add column if not exists auth_user_id uuid unique;

-- Vincula perfis legados a contas Auth pelo e-mail sem alterar role/status/id.
update public.profiles p
set auth_user_id = u.id,
    updated_at = now()
from auth.users u
where p.auth_user_id is null
  and p.email is not null
  and u.email is not null
  and lower(trim(p.email)) = lower(trim(u.email))
  and not exists (
    select 1 from public.profiles other
    where other.auth_user_id = u.id and other.id <> p.id
  );

-- Garante perfil mínimo para contas Auth que nunca receberam uma linha em profiles.
insert into public.profiles(id, auth_user_id, username, email, role, banned, status, data)
select u.id::text,
       u.id,
       coalesce(nullif(trim(u.raw_user_meta_data->>'username'),''), split_part(u.email,'@',1), 'jogador'),
       u.email,
       'jogador', false, 'active', jsonb_build_object('auth_source','supabase','repaired_by','v2.8.1')
from auth.users u
where not exists (select 1 from public.profiles p where p.auth_user_id=u.id)
on conflict do nothing;

-- Resolve login legado por username. Mantido por compatibilidade; o frontend também aceita e-mail direto.
create or replace function public.resolve_login_email(p_identifier text)
returns text
language sql
security definer
set search_path = public
as $$
  select email
  from public.profiles
  where email is not null
    and (lower(username)=lower(trim(p_identifier)) or lower(email)=lower(trim(p_identifier)))
    and coalesce(banned,false)=false
    and coalesce(status,'active') <> 'banned'
  limit 1;
$$;
revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;

-- Recupera/vincula o perfil do usuário autenticado preservando papéis administrativos existentes.
create or replace function public.ensure_current_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(trim(coalesce(auth.jwt()->>'email','')));
  v_username text := nullif(trim(coalesce(auth.jwt()->'user_metadata'->>'username','')), '');
  v_profile public.profiles;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_profile from public.profiles where auth_user_id=v_uid limit 1;
  if v_profile.id is not null then return v_profile; end if;

  if v_email <> '' then
    if exists(select 1 from public.profiles where lower(trim(coalesce(email,'')))=v_email and auth_user_id is not null and auth_user_id<>v_uid) then
      raise exception 'PROFILE_EMAIL_CONFLICT';
    end if;

    select * into v_profile
    from public.profiles
    where auth_user_id is null and lower(trim(coalesce(email,'')))=v_email
    order by created_at asc
    limit 1
    for update;

    if v_profile.id is not null then
      update public.profiles
      set auth_user_id=v_uid, updated_at=now()
      where id=v_profile.id
      returning * into v_profile;
      return v_profile;
    end if;
  end if;

  insert into public.profiles(id,auth_user_id,username,email,role,banned,status,data)
  values(v_uid::text,v_uid,coalesce(v_username,nullif(split_part(v_email,'@',1),''),'jogador'),nullif(v_email,''),'jogador',false,'active',jsonb_build_object('auth_source','supabase','created_by','ensure_current_profile'))
  on conflict (auth_user_id) do update set updated_at=now()
  returning * into v_profile;
  return v_profile;
end;
$$;
revoke all on function public.ensure_current_profile() from public;
grant execute on function public.ensure_current_profile() to authenticated;

commit;
