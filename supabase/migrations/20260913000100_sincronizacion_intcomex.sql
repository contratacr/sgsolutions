-- El proceso automático usa service_role, nunca una clave pública.
-- Comparte el candado y la revisión con guardar_catalogo: no pierde ediciones admin.
create or replace function public.sincronizar_catalogo(privado jsonb, visible jsonb, revision_esperada integer)
returns integer language plpgsql security definer set search_path='' as $$
declare actual integer;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'SIN_PERMISO'; end if;
 if jsonb_typeof(privado->'productos') is distinct from 'array' or jsonb_typeof(visible->'productos') is distinct from 'array' then raise exception 'CATALOGO_INVALIDO'; end if;
 perform pg_advisory_xact_lock(903107);
 select revision into actual from public.catalogo_privado where id=1;
 if coalesce(actual,0) <> revision_esperada then raise exception 'CONFLICTO'; end if;
 insert into public.catalogo_privado values(1,privado,coalesce(actual,0)+1)
 on conflict(id) do update set contenido=excluded.contenido,revision=excluded.revision;
 insert into public.catalogo_publico values(1,visible)
 on conflict(id) do update set contenido=excluded.contenido;
 return coalesce(actual,0)+1;
end $$;
revoke all on function public.sincronizar_catalogo(jsonb,jsonb,integer) from public,anon,authenticated;
grant execute on function public.sincronizar_catalogo(jsonb,jsonb,integer) to service_role;
