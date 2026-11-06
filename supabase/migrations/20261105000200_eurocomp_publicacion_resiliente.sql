-- Keep publication atomic, but do not spend the request budget waiting for an
-- editor/order. The caller retries with a fresh catalog revision and same token.
alter table public.eurocomp_privado add column copia_token uuid;
alter table public.eurocomp_privado add column publicado_token uuid;
alter table public.eurocomp_privado add column publicado_revision integer;
alter table public.eurocomp_privado add column publicado_en timestamptz;
-- Stage the large private supplier snapshot in its own bounded request. This
-- does not touch either shop catalog or mark publication as successful.
create function public.preparar_publicacion_eurocomp(token_esperado uuid,nuevo_catalogo jsonb) returns boolean
language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
begin
 if not public.es_administrador_activo() and coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' is distinct from 'service_role' then raise exception 'SIN_PERMISO'; end if;
 if not pg_try_advisory_xact_lock(903109) then raise exception 'PUBLICACION_OCUPADA' using errcode='55P03'; end if;
 if not exists(select 1 from public.eurocomp_privado where id=1 and token=token_esperado) then raise exception 'TOKEN_OBSOLETO'; end if;
 if exists(select 1 from public.eurocomp_privado where id=1 and copia_token=token_esperado) then return true; end if;
 if jsonb_typeof(nuevo_catalogo->'articulos') is distinct from 'array' or jsonb_array_length(nuevo_catalogo->'articulos')=0 or not(nuevo_catalogo ? 'fecha') then raise exception 'VALIDACION'; end if;
 update public.eurocomp_privado set catalogo=nuevo_catalogo,copia_token=token_esperado where id=1;
 return true;
end $$;
revoke all on function public.preparar_publicacion_eurocomp(uuid,jsonb) from public,anon;
grant execute on function public.preparar_publicacion_eurocomp(uuid,jsonb) to authenticated,service_role;

create or replace function public.publicar_eurocomp(token_esperado uuid,nuevo_catalogo jsonb,privado jsonb,visible jsonb,revision_esperada integer) returns integer
language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare actual integer; confirmada integer;
begin
 if not public.es_administrador_activo() and coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' is distinct from 'service_role' then raise exception 'SIN_PERMISO'; end if;
 if not pg_try_advisory_xact_lock(903109) or not pg_try_advisory_xact_lock(903107) then raise exception 'PUBLICACION_OCUPADA' using errcode='55P03'; end if;
 if not exists(select 1 from public.eurocomp_privado where id=1 and token=token_esperado) then raise exception 'TOKEN_OBSOLETO'; end if;
 select publicado_revision into confirmada from public.eurocomp_privado where id=1 and publicado_token=token_esperado;
 -- A response may be lost after COMMIT. Replaying that token must not overwrite
 -- subsequent manual edits or replenish units reserved by a new order.
 if confirmada is not null then return confirmada; end if;
 if nuevo_catalogo is null then
  if not exists(select 1 from public.eurocomp_privado where id=1 and copia_token=token_esperado) then raise exception 'COPIA_NO_PREPARADA'; end if;
 elsif jsonb_typeof(nuevo_catalogo->'articulos') is distinct from 'array' or jsonb_array_length(nuevo_catalogo->'articulos')=0 then raise exception 'VALIDACION'; end if;
 if jsonb_typeof(privado->'productos') is distinct from 'array' or jsonb_typeof(visible->'productos') is distinct from 'array' then raise exception 'VALIDACION'; end if;
 if visible ? 'ajustes' or exists(select 1 from jsonb_array_elements(visible->'productos') p where p ?| array['eurocomp','costoUsd','costoCrc','proveedor']) then raise exception 'VALIDACION'; end if;
 select revision into actual from public.catalogo_privado where id=1;
 if coalesce(actual,0)<>revision_esperada then raise exception 'CONFLICTO'; end if;
 insert into public.catalogo_privado values(1,privado,coalesce(actual,0)+1) on conflict(id) do update set contenido=excluded.contenido,revision=excluded.revision;
 insert into public.catalogo_publico values(1,visible) on conflict(id) do update set contenido=excluded.contenido;
 if nuevo_catalogo is not null then update public.eurocomp_privado set catalogo=nuevo_catalogo,copia_token=token_esperado where id=1; end if;
 update public.eurocomp_privado set publicado_token=token_esperado,publicado_revision=coalesce(actual,0)+1,publicado_en=now() where id=1 and token=token_esperado;
 return coalesce(actual,0)+1;
end $$;
revoke all on function public.publicar_eurocomp(uuid,jsonb,jsonb,jsonb,integer) from public,anon;
grant execute on function public.publicar_eurocomp(uuid,jsonb,jsonb,jsonb,integer) to authenticated,service_role;
