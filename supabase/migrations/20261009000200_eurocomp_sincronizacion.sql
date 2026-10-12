-- A scheduled Node job shares the hourly lease with manual updates.
create function public.iniciar_eurocomp_programado(nuevo_token uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' is distinct from 'service_role' then raise exception 'SIN_PERMISO'; end if;
 perform pg_advisory_xact_lock(903109);
 if exists(select 1 from public.eurocomp_privado where id=1 and intento > now()-interval '1 hour') then raise exception 'ESPERA'; end if;
 insert into public.eurocomp_privado(id,intento,token) values(1,now(),nuevo_token)
 on conflict(id) do update set intento=excluded.intento,token=excluded.token;
 return true;
end $$;

create function public.publicar_eurocomp(token_esperado uuid,nuevo_catalogo jsonb,privado jsonb,visible jsonb,revision_esperada integer) returns integer
language plpgsql security definer set search_path='' as $$
declare actual integer;
begin
 if not public.es_administrador_activo() and coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' is distinct from 'service_role' then raise exception 'SIN_PERMISO'; end if;
 perform pg_advisory_xact_lock(903109);
 perform pg_advisory_xact_lock(903107);
 if not exists(select 1 from public.eurocomp_privado where id=1 and token=token_esperado) then raise exception 'CONFLICTO'; end if;
 if jsonb_typeof(nuevo_catalogo->'articulos') is distinct from 'array' or jsonb_typeof(privado->'productos') is distinct from 'array' or jsonb_typeof(visible->'productos') is distinct from 'array' then raise exception 'VALIDACION'; end if;
 -- Public data must never contain supplier costs or commercial settings.
 if visible ? 'ajustes' or exists(select 1 from jsonb_array_elements(visible->'productos') p where p ?| array['eurocomp','costoUsd','costoCrc','proveedor']) then raise exception 'VALIDACION'; end if;
 select revision into actual from public.catalogo_privado where id=1;
 if coalesce(actual,0) <> revision_esperada then raise exception 'CONFLICTO'; end if;
 insert into public.catalogo_privado values(1,privado,coalesce(actual,0)+1) on conflict(id) do update set contenido=excluded.contenido,revision=excluded.revision;
 insert into public.catalogo_publico values(1,visible) on conflict(id) do update set contenido=excluded.contenido;
 update public.eurocomp_privado set catalogo=nuevo_catalogo where id=1 and token=token_esperado;
 return coalesce(actual,0)+1;
end $$;
revoke all on function public.iniciar_eurocomp_programado(uuid),public.publicar_eurocomp(uuid,jsonb,jsonb,jsonb,integer) from public;
grant execute on function public.iniciar_eurocomp_programado(uuid) to service_role;
grant execute on function public.publicar_eurocomp(uuid,jsonb,jsonb,jsonb,integer) to authenticated,service_role;
grant select on public.catalogo_privado to service_role;
