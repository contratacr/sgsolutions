-- Anonymous daily product counters survive raw-event retention; sales use saved orders.
create table public.productos_vistas_diarias(
 fecha date not null,producto_id text not null check(producto_id ~ '^[a-z0-9-]{1,60}$'),
 cantidad bigint not null check(cantidad>=0),primary key(fecha,producto_id)
);
alter table public.productos_vistas_diarias enable row level security;
revoke all on public.productos_vistas_diarias from anon,authenticated;
create index productos_vistas_fecha_idx on public.productos_vistas_diarias(fecha);
create function public.acumular_vista_producto() returns trigger language plpgsql security definer set search_path='' as $$
declare producto text;
begin
 if new.tipo<>'producto' then return new; end if;
 select p->>'id' into producto from public.catalogo_publico c cross join lateral jsonb_array_elements(c.contenido->'productos') p
 where c.id=1 and (p->>'id'=new.detalle or p->>'slug'=new.detalle) limit 1;
 if producto is null then return new; end if;
 insert into public.productos_vistas_diarias(fecha,producto_id,cantidad)
 values((new.creado_en at time zone 'America/Costa_Rica')::date,producto,1)
 on conflict(fecha,producto_id) do update set cantidad=public.productos_vistas_diarias.cantidad+1;
 return new;
end;$$;
revoke all on function public.acumular_vista_producto() from public,anon,authenticated;
create trigger acumular_vista_producto after insert on public.eventos_analitica for each row execute function public.acumular_vista_producto();
-- Backfill existing, consented views once before raw events are pruned.
insert into public.productos_vistas_diarias(fecha,producto_id,cantidad)
select (e.creado_en at time zone 'America/Costa_Rica')::date,p->>'id',count(*)
from public.eventos_analitica e join public.catalogo_publico c on c.id=1
cross join lateral jsonb_array_elements(c.contenido->'productos') p
where e.tipo='producto' and (p->>'id'=e.detalle or p->>'slug'=e.detalle)
group by 1,2;
create function public.popularidad_productos_panel(dias integer default 30) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare desde date;vistas jsonb;compras jsonb;
begin
 if not public.es_administrador_activo() then raise exception 'forbidden'; end if;
 if dias is null or dias not in (7,30) then raise exception 'invalid_period'; end if;
 desde:=(now() at time zone 'America/Costa_Rica')::date-(dias-1);
 select coalesce(jsonb_agg(to_jsonb(v) order by cantidad desc,id),'[]'::jsonb) into vistas from
 (select producto_id as id,sum(cantidad) as cantidad from public.productos_vistas_diarias where fecha>=desde group by producto_id) v;
 with pedidos as (
 select 'manual-'||id::text as pedido,articulos from public.pedidos_manuales where estado='pagado' and creado_en>=desde::timestamp at time zone 'America/Costa_Rica'
 union all select 'tarjeta-'||id::text,articulos from public.pedidos_tilopay where estado='pagado' and entorno='produccion' and creado_en>=desde::timestamp at time zone 'America/Costa_Rica'
 ),lineas as (
 select pedido,a->>'id' as id,a->>'nombre' as nombre,case when a->>'cantidad' ~ '^[1-9][0-9]?$' then (a->>'cantidad')::integer else 0 end as cantidad
 from pedidos cross join lateral jsonb_array_elements(articulos) a
 ),totales as (
 select id,max(nombre) as nombre,sum(cantidad) as cantidad,count(distinct pedido) as pedidos from lineas
 where id ~ '^[a-z0-9-]{1,60}$' and cantidad>0 group by id
 ) select coalesce(jsonb_agg(to_jsonb(t) order by cantidad desc,id),'[]'::jsonb) into compras from totales t;
 return jsonb_build_object('vistas',vistas,'compras',compras);
end;$$;
revoke all on function public.popularidad_productos_panel(integer) from public,anon;
grant execute on function public.popularidad_productos_panel(integer) to authenticated;
