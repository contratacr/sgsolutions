-- Excluir pedidos administrativos del resumen y el ranking, sin alterar las operaciones.
-- El historial sin identidad ni marca de exclusión no puede clasificarse retrospectivamente.
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
 select p.estado,coalesce(p.total_cobrar,p.total_productos+p.costo_envio,p.total_productos) as total from public.pedidos_manuales p where p.creado_en>=desde and p.entorno='produccion' and coalesce(p.cliente->>'excluir_medicion','false')<>'true'
 and not exists (select 1 from auth.users u join public.perfiles perfil on perfil.id=u.id where perfil.rol='administrador' and lower(u.email)=lower(p.cliente->>'correo'))
 and not exists (select 1 from public.medicion_operaciones m where m.tipo='manual' and m.operacion=p.id and m.excluir)
 union all select p.estado,p.total from public.pedidos_tilopay p where p.creado_en>=desde and p.entorno='produccion' and coalesce(p.cliente->>'excluir_medicion','false')<>'true'
 and not exists (select 1 from auth.users u join public.perfiles perfil on perfil.id=u.id where perfil.rol='administrador' and lower(u.email)=lower(p.cliente->>'correo'))
 and not exists (select 1 from public.medicion_operaciones m where m.tipo='tarjeta' and m.operacion=p.id and m.excluir)
 ) select jsonb_build_object('total',count(*),'pagados',count(*) filter(where estado='pagado'),
 'pendientes',count(*) filter(where estado in ('revision','pendiente_pago','comprobante_recibido','iniciado','pendiente')),
 'ingresos',coalesce(sum(total) filter(where estado='pagado'),0),'promedio',coalesce(avg(total) filter(where estado='pagado'),0)) into compras from pedidos;
 return resultado||jsonb_build_object('clientes',clientes,'compras',compras);
end;$$;

create or replace function public.popularidad_productos_panel(dias integer default 30) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare desde date;vistas jsonb;compras jsonb;
begin
 if not public.es_administrador_activo() then raise exception 'forbidden'; end if;
 if dias is null or dias not in (7,30) then raise exception 'invalid_period'; end if;
 desde:=(now() at time zone 'America/Costa_Rica')::date-(dias-1);
 select coalesce(jsonb_agg(to_jsonb(v) order by cantidad desc,id),'[]'::jsonb) into vistas from
 (select producto_id as id,sum(cantidad) as cantidad from public.productos_vistas_diarias where fecha>=desde group by producto_id) v;
 with pedidos as (
 select 'manual-'||p.id::text as pedido,p.articulos from public.pedidos_manuales p where p.estado='pagado' and p.entorno='produccion' and p.creado_en>=desde::timestamp at time zone 'America/Costa_Rica' and coalesce(p.cliente->>'excluir_medicion','false')<>'true'
 and not exists (select 1 from auth.users u join public.perfiles perfil on perfil.id=u.id where perfil.rol='administrador' and lower(u.email)=lower(p.cliente->>'correo'))
 and not exists (select 1 from public.medicion_operaciones m where m.tipo='manual' and m.operacion=p.id and m.excluir)
 union all select 'tarjeta-'||p.id::text,p.articulos from public.pedidos_tilopay p where p.estado='pagado' and p.entorno='produccion' and p.creado_en>=desde::timestamp at time zone 'America/Costa_Rica' and coalesce(p.cliente->>'excluir_medicion','false')<>'true'
 and not exists (select 1 from auth.users u join public.perfiles perfil on perfil.id=u.id where perfil.rol='administrador' and lower(u.email)=lower(p.cliente->>'correo'))
 and not exists (select 1 from public.medicion_operaciones m where m.tipo='tarjeta' and m.operacion=p.id and m.excluir)
 ),lineas as (
 select pedido,a->>'id' as id,a->>'nombre' as nombre,case when a->>'cantidad' ~ '^[1-9][0-9]?$' then (a->>'cantidad')::integer else 0 end as cantidad
 from pedidos cross join lateral jsonb_array_elements(articulos) a
 ),totales as (
 select id,max(nombre) as nombre,sum(cantidad) as cantidad,count(distinct pedido) as pedidos from lineas
 where id ~ '^[a-z0-9-]{1,60}$' and cantidad>0 group by id
 ) select coalesce(jsonb_agg(to_jsonb(t) order by cantidad desc,id),'[]'::jsonb) into compras from totales t;
 return jsonb_build_object('vistas',vistas,'compras',compras);
end;$$;
