-- Mundos Sombrios V2.5.3
-- Imortalização mínima universal para Êxodo e Ocultatun.
-- Pré-requisitos de conteúdo: Nome + Expansão/Origem + Classe.
-- Requer a Soul Economy V2.5 já instalada para manter slots e entitlements server-side.

begin;

create or replace function public.save_character_secure(
  p_id text,
  p_name text,
  p_mode text,
  p_nature text,
  p_class_name text,
  p_payload jsonb
) returns public.characters
language plpgsql
security definer
set search_path=public
as $$
declare
  v_character public.characters;
  v_existing public.characters;
  v_key text;
  v_count integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  -- Únicos três pré-requisitos editoriais para imortalizar uma ficha.
  if trim(coalesce(p_name,''))='' then raise exception 'CHARACTER_NAME_REQUIRED'; end if;
  if trim(coalesce(p_nature,''))='' then raise exception 'CHARACTER_EXPANSION_REQUIRED'; end if;
  if trim(coalesce(p_class_name,''))='' then raise exception 'CHARACTER_CLASS_REQUIRED'; end if;

  select * into v_existing
  from public.characters
  where id=p_id and user_id=auth.uid()::text;

  v_key:=public.soul_expansion_key_for_nature(p_nature);

  if v_existing.id is null then
    select count(*) into v_count
    from public.characters
    where user_id=auth.uid()::text;

    if v_count>=public.soul_character_capacity(auth.uid()) then
      raise exception 'CHARACTER_SLOT_LIMIT';
    end if;

    if not public.soul_has_expansion(auth.uid(),v_key) then
      raise exception 'EXPANSION_LOCKED:%',coalesce(v_key,'unknown');
    end if;

    insert into public.characters(id,owner_id,user_id,name,mode,nature,class_name,payload)
    values(
      coalesce(nullif(p_id,''),'c-'||gen_random_uuid()::text),
      auth.uid()::text,
      auth.uid()::text,
      trim(p_name),
      coalesce(nullif(p_mode,''),'exodo'),
      p_nature,
      p_class_name,
      coalesce(p_payload,'{}'::jsonb)
    ) returning * into v_character;
  else
    -- Personagens existentes continuam editáveis. Só uma troca para uma expansão
    -- bloqueada é recusada, preservando a política da Soul Economy.
    if v_key is not null
       and v_key is distinct from public.soul_expansion_key_for_nature(v_existing.nature)
       and not public.soul_has_expansion(auth.uid(),v_key) then
      raise exception 'EXPANSION_LOCKED:%',v_key;
    end if;

    insert into public.character_versions(character_id,owner_id,version_no,snapshot)
    select v_existing.id,auth.uid(),coalesce(max(version_no),0)+1,v_existing.payload
    from public.character_versions
    where character_id=v_existing.id;

    update public.characters
    set name=trim(p_name),
        mode=coalesce(nullif(p_mode,''),mode),
        nature=p_nature,
        class_name=p_class_name,
        payload=coalesce(p_payload,'{}'::jsonb),
        updated_at=now()
    where id=v_existing.id
    returning * into v_character;
  end if;

  perform public.soul_check_achievements(auth.uid());
  return v_character;
end;
$$;

revoke all on function public.save_character_secure(text,text,text,text,text,jsonb) from public;
grant execute on function public.save_character_secure(text,text,text,text,text,jsonb) to authenticated;

commit;
