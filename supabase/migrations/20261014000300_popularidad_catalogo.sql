begin;
create function public.popularidad_catalogo()
returns table(producto_id text,puntuacion bigint)
language sql stable security definer set search_path=public,pg_temp
as $$
with vistas as (
 select producto_id,sum(cantidad)::bigint puntos from productos_vistas_diarias where fecha>=timezone('America/Costa_Rica',now())::date-30 group by producto_id
), ventas as (
 select articulo->>'id' producto_id,sum((articulo->>'cantidad')::bigint)*10 puntos
 from (
 select articulos from pedidos_manuales where estado='pagado' and creado_en>=now()-interval '30 days'
 union all
 select articulos from pedidos_tilopay where estado='pagado' and entorno='produccion' and creado_en>=now()-interval '30 days'
 ) pedidos cross join lateral jsonb_array_elements(pedidos.articulos) articulo
 where articulo->>'cantidad' ~ '^[1-9][0-9]?$' group by articulo->>'id'
)
select coalesce(vistas.producto_id,ventas.producto_id),coalesce(vistas.puntos,0)+coalesce(ventas.puntos,0) from vistas full join ventas using(producto_id);
$$;
revoke all on function public.popularidad_catalogo() from public,anon,authenticated;
grant execute on function public.popularidad_catalogo() to service_role;
commit;
