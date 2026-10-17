-- Daily counters only. No IP, account, session, visitor or per-event rows.
create table public.estadisticas_diarias (
 fecha date not null,tipo text not null,ruta text not null,detalle text not null default '',
 dispositivo text not null check(dispositivo in ('movil','escritorio')),
 idioma text not null check(idioma in ('es','en')),cantidad bigint not null default 0 check(cantidad>=0),
 primary key(fecha,tipo,ruta,detalle,dispositivo,idioma)
);
alter table public.estadisticas_diarias enable row level security;
revoke all on public.estadisticas_diarias from public,anon,authenticated;
grant select on public.estadisticas_diarias to service_role;
create function public.registrar_conteo_anonimo(evento jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare dia date:=(now() at time zone 'America/Costa_Rica')::date;tipo text:=evento->>'tipo';ruta text:=evento->>'ruta';detalle text:=evento->>'detalle';producto text;
begin
 if exists(select 1 from public.perfiles where id=auth.uid() and rol='administrador') then return; end if;
 if jsonb_typeof(evento)<>'object' or pg_column_size(evento)>2048 or
 (select count(*) from jsonb_object_keys(evento))<>5 or not (evento ?& array['tipo','ruta','detalle','dispositivo','idioma']) then raise exception 'invalid_event';end if;
 if tipo not in ('pagina','producto','busqueda_producto','carrito','plan','whatsapp','correo','telefono','mapa','red_social','galeria','pedido_revisado','plan_revisado','scroll') or
 ruta not in ('/','/tienda','/tienda/producto','/soporte','/empresas','/casos-de-exito','/nosotros','/contacto','/pagar','/finalizar-compra','/terminos','/privacidad') or
 detalle is null or length(detalle)>100 then raise exception 'invalid_event';end if;
 if tipo in ('producto','busqueda_producto','carrito') then
  select p->>'id' into producto from public.catalogo_publico c cross join lateral jsonb_array_elements(c.contenido->'productos') p where c.id=1 and (p->>'id'=detalle or p->>'slug'=detalle) limit 1;
  if producto is null then return; end if;detalle:=producto;
 elsif tipo in ('plan','plan_revisado') then if detalle not in ('1','2','3') then raise exception 'invalid_event';end if;
 elsif tipo='scroll' then if detalle not in ('25','50','75','100') then raise exception 'invalid_event';end if;
 elsif tipo='whatsapp' then if detalle not in ('','footer','flotante','contenido') then raise exception 'invalid_event';end if;
 elsif tipo='red_social' then if detalle not in ('www.instagram.com','www.facebook.com') then raise exception 'invalid_event';end if;
 elsif detalle<>'' then raise exception 'invalid_event';end if;
 insert into public.estadisticas_diarias(fecha,tipo,ruta,detalle,dispositivo,idioma,cantidad)
 values(dia,tipo,ruta,detalle,evento->>'dispositivo',evento->>'idioma',1)
 on conflict on constraint estadisticas_diarias_pkey do update set cantidad=public.estadisticas_diarias.cantidad+1;
 if tipo='producto' then
  insert into public.productos_vistas_diarias(fecha,producto_id,cantidad) values(dia,detalle,1)
  on conflict(fecha,producto_id) do update set cantidad=public.productos_vistas_diarias.cantidad+1;
 end if;
 delete from public.estadisticas_diarias where fecha<dia-30;
 -- Retire previously consented raw events on their original retention schedule.
 delete from public.eventos_analitica where creado_en<now()-interval '30 days';
end;$$;
revoke all on function public.registrar_conteo_anonimo(jsonb) from public,anon,authenticated;
grant execute on function public.registrar_conteo_anonimo(jsonb) to service_role;
-- Stop browser clients from bypassing the anonymous aggregate pipeline.
revoke execute on function public.registrar_evento(jsonb) from anon,authenticated;
create function public.resumen_estadisticas_agregadas_panel(dias integer default 30) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare base jsonb;desde date;conteos jsonb;
begin
 -- Existing function checks admin permissions and computes accounts/paid orders.
 base:=public.resumen_estadisticas_panel(dias);
 desde:=(now() at time zone 'America/Costa_Rica')::date-(dias-1);
 with recientes as (select * from public.estadisticas_diarias where fecha>=desde),
 filas as (select tipo,case when tipo='pagina' then ruta else detalle end as detalle,sum(cantidad) as cantidad from recientes group by 1,2),
 diario as (select fecha::text,sum(cantidad) as visitas,sum(cantidad) as paginas from recientes where tipo='pagina' group by 1),
 dispositivos as (select dispositivo as detalle,sum(cantidad) as cantidad from recientes where tipo='pagina' group by 1),
 idiomas as (select idioma as detalle,sum(cantidad) as cantidad from recientes where tipo='pagina' group by 1)
 select jsonb_build_object('modo','agregado','sesiones',null,'visitantes',null,'total',coalesce((select sum(cantidad) from recientes),0),
 'filas',coalesce((select jsonb_agg(to_jsonb(f) order by cantidad desc) from filas f),'[]'::jsonb),
 'diario',coalesce((select jsonb_agg(to_jsonb(d) order by fecha) from diario d),'[]'::jsonb),
 'dispositivos',coalesce((select jsonb_agg(to_jsonb(d)) from dispositivos d),'[]'::jsonb),
 'idiomas',coalesce((select jsonb_agg(to_jsonb(i)) from idiomas i),'[]'::jsonb)) into conteos;
 return base||conteos;
end;$$;
revoke all on function public.resumen_estadisticas_agregadas_panel(integer) from public,anon;
grant execute on function public.resumen_estadisticas_agregadas_panel(integer) to authenticated;
create function public.popularidad_productos_agregada_panel(dias integer default 30) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare base jsonb;vistas jsonb;
begin
 base:=public.popularidad_productos_panel(dias);
 select coalesce(jsonb_agg(to_jsonb(f) order by cantidad desc),'[]'::jsonb) into vistas from
 (select detalle as id,sum(cantidad) as cantidad from public.estadisticas_diarias
 where tipo='producto' and fecha>=(now() at time zone 'America/Costa_Rica')::date-(dias-1) group by detalle) f;
 return base||jsonb_build_object('vistas',vistas);
end;$$;
revoke all on function public.popularidad_productos_agregada_panel(integer) from public,anon;
grant execute on function public.popularidad_productos_agregada_panel(integer) to authenticated;
