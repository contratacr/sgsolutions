-- Los pedidos se vinculan una vez al ID de la cuenta tras verificar su correo.
-- La cuenta no obtiene acceso directo a las tablas, comprobantes o datos fiscales.
alter table public.pedidos_manuales add column if not exists cliente_usuario_id uuid references auth.users(id) on delete set null;
alter table public.pedidos_tilopay add column if not exists cliente_usuario_id uuid references auth.users(id) on delete set null;
create index if not exists pedidos_manuales_usuario_idx on public.pedidos_manuales(cliente_usuario_id, creado_en desc);
create index if not exists pedidos_tilopay_usuario_idx on public.pedidos_tilopay(cliente_usuario_id, creado_en desc);
create index if not exists pedidos_manuales_correo_cliente_idx on public.pedidos_manuales(lower(btrim(cliente ->> 'correo')));
create index if not exists pedidos_tilopay_correo_cliente_idx on public.pedidos_tilopay(lower(btrim(cliente ->> 'correo')));

create or replace function public.mis_pedidos()
returns table (id uuid, origen text, creado_en timestamptz, estado text, total numeric, articulos jsonb)
language plpgsql security definer
set search_path = ''
as $$
declare
  usuario uuid;
  correo_verificado text;
begin
  select u.id, lower(btrim(u.email)) into usuario, correo_verificado
  from auth.users u
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null and u.email is not null;
  if usuario is null then return; end if;

  update public.pedidos_manuales p set cliente_usuario_id = usuario
  where p.cliente_usuario_id is null and lower(btrim(p.cliente ->> 'correo')) = correo_verificado;
  update public.pedidos_tilopay p set cliente_usuario_id = usuario
  where p.cliente_usuario_id is null and p.entorno = 'produccion' and lower(btrim(p.cliente ->> 'correo')) = correo_verificado;

  return query
    select historial.* from (
    select p.id, 'manual'::text, p.creado_en, p.estado, p.total_cobrar, p.articulos
    from public.pedidos_manuales p where p.cliente_usuario_id = usuario
    union all
    select p.id, 'tarjeta'::text, p.creado_en, p.estado, p.total, p.articulos
    from public.pedidos_tilopay p where p.cliente_usuario_id = usuario and p.entorno = 'produccion'
    ) historial order by historial.creado_en desc limit 100;
end;
$$;
revoke all on function public.mis_pedidos() from public, anon;
grant execute on function public.mis_pedidos() to authenticated;
