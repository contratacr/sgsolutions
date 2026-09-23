-- Anonymous, allowlisted interaction events. No form contents or customer identity.
create table public.eventos_analitica (
 id uuid primary key, sesion uuid not null, creado_en timestamptz not null default now(),
 tipo text not null check(tipo in ('pagina','producto','busqueda_producto','carrito','plan','whatsapp','correo','telefono','mapa','red_social','galeria','pedido_revisado','plan_revisado','scroll')),
 ruta text not null check(ruta ~ '^/(|tienda(/[a-z0-9-]{1,60})?|soporte|empresas|casos-de-exito|nosotros|contacto|finalizar-compra|terminos|privacidad)$'),
 detalle text not null check(length(detalle)<=100 and detalle ~ '^[a-zA-Z0-9_.:/-]*$'),
 dispositivo text not null check(dispositivo in ('movil','escritorio')),
 idioma text not null check(idioma in ('es','en')), campana text not null check(length(campana)<=80 and campana ~ '^[a-zA-Z0-9_-]*$')
);
create index on public.eventos_analitica(creado_en);
create index on public.eventos_analitica(sesion,creado_en);
alter table public.eventos_analitica enable row level security;
revoke all on public.eventos_analitica from anon,authenticated;
create function public.registrar_evento(evento jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if pg_column_size(evento)>2048 then raise exception 'invalid_event'; end if;
 perform pg_advisory_xact_lock(hashtext(evento->>'sesion'));
 if (select count(*) from public.eventos_analitica where sesion=(evento->>'sesion')::uuid and creado_en>now()-interval '1 minute')>=120 then raise exception 'rate_limit'; end if;
 insert into public.eventos_analitica(id,sesion,tipo,ruta,detalle,dispositivo,idioma,campana)
 values((evento->>'id')::uuid,(evento->>'sesion')::uuid,evento->>'tipo',evento->>'ruta',evento->>'detalle',evento->>'dispositivo',evento->>'idioma',evento->>'campana') on conflict(id) do nothing;
 delete from public.eventos_analitica where creado_en<now()-interval '30 days';
end;$$;
revoke all on function public.registrar_evento(jsonb) from public;
grant execute on function public.registrar_evento(jsonb) to anon,authenticated;
create function public.resumen_analitica() returns jsonb language plpgsql security definer set search_path='' as $$
declare resultado jsonb;
begin
 if not public.es_administrador_activo() then raise exception 'forbidden'; end if;
 with recientes as (select * from public.eventos_analitica where creado_en>=now()-interval '30 days'),
 filas as (select tipo,case when tipo='pagina' then ruta else detalle end as detalle,count(*) as cantidad from recientes group by 1,2
 union all select 'campana',campana,count(*) from recientes where tipo='pagina' and campana<>'' group by campana)
 select jsonb_build_object('total',(select count(*) from recientes),'sesiones',(select count(distinct sesion) from recientes),'filas',coalesce((select jsonb_agg(to_jsonb(f) order by cantidad desc) from filas f),'[]'::jsonb)) into resultado;
 return resultado;
end;$$;
revoke all on function public.resumen_analitica() from public;
grant execute on function public.resumen_analitica() to authenticated;
