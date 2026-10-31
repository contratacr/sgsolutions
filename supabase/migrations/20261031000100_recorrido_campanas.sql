-- Aggregate navigation only; preserve history, RLS and service-only writes.
begin;
do $$begin
 if not exists(select 1 from pg_proc where oid='public.registrar_hito_negocio(jsonb)'::regprocedure and md5(prosrc) in ('75b54e0b645bbc364f249f2e9a9d5f12','f45bcb89a6d9523202c1bd965450d451')) then raise exception 'MEDICION_FUNCION_MODIFICADA';end if;
end;$$;
create or replace function public.registrar_hito_negocio(entrada jsonb) returns boolean language plpgsql security definer set search_path='' as $$
declare c jsonb:=entrada->'contexto';ultimo jsonb:=c->'reciente';primero jsonb:=c->'primero';begin
 if exists(select 1 from public.perfiles where id=auth.uid() and rol='administrador') then return false;end if;
 if entrada->>'tipo' not in ('solicitud_recibida','pedido_creado','pago_confirmado','cotizacion_preparada','campana_visita','tienda_vista','tienda_vista_clic_meta','campana_carrito','campana_checkout','campana_whatsapp') then raise exception 'invalid_event';end if;
 if not (entrada->>'clave' ~ '^[A-Za-z0-9_-]{43}$') then raise exception 'invalid_key';end if;
 if coalesce((entrada->>'excluir')::boolean,true) then return false;end if;
 if c is not null and c<>'null'::jsonb and (exists(select 1 from public.publicidad_revocaciones where id=(c->>'id')::uuid) or (c->>'vence')::bigint<extract(epoch from now())*1000) then c:=null;ultimo:=null;primero:=null;end if;
 insert into public.medicion_hitos(clave) values(entrada->>'clave') on conflict do nothing;if not found then return false;end if;
 insert into public.estadisticas_embudo(fecha,tipo,canal,medio,campana,primer_canal,primera_campana,idioma)
 values((now() at time zone 'America/Costa_Rica')::date,entrada->>'tipo',coalesce(ultimo->>'canal','sin_atribucion'),coalesce(ultimo->>'medio','desconocido'),coalesce(ultimo->>'campana',''),coalesce(primero->>'canal','sin_atribucion'),coalesce(primero->>'campana',''),entrada->>'idioma')
 on conflict on constraint estadisticas_embudo_pkey do update set cantidad=public.estadisticas_embudo.cantidad+1;return true;
end;$$;
revoke all on function public.registrar_hito_negocio(jsonb) from public,anon,authenticated;
grant execute on function public.registrar_hito_negocio(jsonb) to service_role;
commit;
