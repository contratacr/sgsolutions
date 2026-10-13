-- Anonymous navigation counters and aggregated business statistics for admins.
create table if not exists public.eventos_analitica (
 id uuid primary key, sesion uuid not null, creado_en timestamptz not null default now(),
 tipo text not null check(tipo in ('pagina','producto','busqueda_producto','carrito','plan','whatsapp','correo','telefono','mapa','red_social','galeria','pedido_revisado','plan_revisado','scroll')),
 ruta text not null,detalle text not null check(length(detalle)<=100 and detalle ~ '^[a-zA-Z0-9_.:/-]*$'),
 dispositivo text not null check(dispositivo in ('movil','escritorio')),idioma text not null check(idioma in ('es','en')),
 campana text not null check(length(campana)<=80 and campana ~ '^[a-zA-Z0-9_-]*$')
);
alter table public.eventos_analitica add column if not exists visitante uuid;
alter table public.eventos_analitica drop constraint if exists eventos_analitica_ruta_check;
alter table public.eventos_analitica add constraint eventos_analitica_ruta_check
 check(ruta ~ '^/(|tienda(/[a-z0-9-]{1,100})?|soporte|empresas|casos-de-exito|nosotros|contacto|pagar|finalizar-compra|terminos|privacidad)$') not valid;
create index if not exists eventos_analitica_fecha_idx on public.eventos_analitica(creado_en);
create index if not exists eventos_analitica_sesion_fecha_idx on public.eventos_analitica(sesion,creado_en);
alter table public.eventos_analitica enable row level security;
revoke all on public.eventos_analitica from anon,authenticated;
create or replace function public.registrar_evento(evento jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if pg_column_size(evento)>2048 then raise exception 'invalid_event'; end if;
 perform pg_advisory_xact_lock(hashtext(evento->>'sesion'));
 if (select count(*) from public.eventos_analitica where sesion=(evento->>'sesion')::uuid and creado_en>now()-interval '1 minute')>=120 then raise exception 'rate_limit'; end if;
 insert into public.eventos_analitica(id,sesion,visitante,tipo,ruta,detalle,dispositivo,idioma,campana)
 values((evento->>'id')::uuid,(evento->>'sesion')::uuid,(evento->>'visitante')::uuid,evento->>'tipo',evento->>'ruta',evento->>'detalle',evento->>'dispositivo',evento->>'idioma',evento->>'campana') on conflict(id) do nothing;
 delete from public.eventos_analitica where creado_en<now()-interval '30 days';
end;$$;
revoke all on function public.registrar_evento(jsonb) from public;
grant execute on function public.registrar_evento(jsonb) to anon,authenticated;

create or replace function public.resumen_estadisticas_panel(dias integer default 30) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare resultado jsonb; clientes jsonb; compras jsonb; desde timestamptz;
begin
 if not public.es_administrador_activo() then raise exception 'forbidden'; end if;
 if dias is null or dias not in (7,30) then raise exception 'invalid_period'; end if;
 desde:=((now() at time zone 'America/Costa_Rica')::date-(dias-1))::timestamp at time zone 'America/Costa_Rica';
 with recientes as (select * from public.eventos_analitica where creado_en>=desde),
 filas as (select tipo,case when tipo='pagina' then ruta else detalle end as detalle,count(*) as cantidad from recientes group by 1,2
 union all select 'campana',campana,count(*) from recientes where tipo='pagina' and campana<>'' group by campana),
 diario as (select (creado_en at time zone 'America/Costa_Rica')::date::text as fecha,count(distinct sesion) as visitas,count(*) as paginas from recientes where tipo='pagina' group by 1),
 dispositivos as (select dispositivo as detalle,count(distinct sesion) as cantidad from recientes where tipo='pagina' group by 1),
 idiomas as (select idioma as detalle,count(distinct sesion) as cantidad from recientes where tipo='pagina' group by 1)
 select jsonb_build_object('total',(select count(*) from recientes),'sesiones',(select count(distinct sesion) from recientes),
 'visitantes',(select count(distinct coalesce(visitante,sesion)) from recientes),
 'filas',coalesce((select jsonb_agg(to_jsonb(f) order by cantidad desc) from filas f),'[]'::jsonb),
 'diario',coalesce((select jsonb_agg(to_jsonb(d) order by fecha) from diario d),'[]'::jsonb),
 'dispositivos',coalesce((select jsonb_agg(to_jsonb(d) order by cantidad desc) from dispositivos d),'[]'::jsonb),
 'idiomas',coalesce((select jsonb_agg(to_jsonb(i) order by cantidad desc) from idiomas i),'[]'::jsonb)) into resultado;
 -- Counts only; customer identifiers, emails and metadata never leave this RPC.
 select jsonb_build_object('total',count(*),'nuevos',count(*) filter(where u.created_at>=desde),
 'activos',count(*) filter(where u.last_sign_in_at>=desde)) into clientes from auth.users u
 where u.deleted_at is null and not exists(select 1 from public.perfiles p where p.id=u.id and p.rol='administrador');
 with pedidos as (
 select estado,coalesce(total_cobrar,total_productos+costo_envio,total_productos) as total from public.pedidos_manuales where creado_en>=desde
 union all select estado,total from public.pedidos_tilopay where creado_en>=desde and entorno='produccion'
 ) select jsonb_build_object('total',count(*),'pagados',count(*) filter(where estado='pagado'),
 'pendientes',count(*) filter(where estado in ('revision','pendiente_pago','comprobante_recibido','iniciado','pendiente')),
 'ingresos',coalesce(sum(total) filter(where estado='pagado'),0),'promedio',coalesce(avg(total) filter(where estado='pagado'),0)) into compras from pedidos;
 return resultado||jsonb_build_object('clientes',clientes,'compras',compras);
end;$$;
revoke all on function public.resumen_estadisticas_panel(integer) from public,anon;
grant execute on function public.resumen_estadisticas_panel(integer) to authenticated;
