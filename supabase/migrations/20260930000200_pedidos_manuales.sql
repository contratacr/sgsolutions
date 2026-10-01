-- Los datos de clientes y comprobantes son privados. La aplicación valida cada pedido y usa service_role.
create table public.pedidos_manuales (
  id uuid primary key,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  estado text not null default 'revision' check (estado in ('revision','pendiente_pago','comprobante_recibido','pagado','cancelado')),
  metodo text not null check (metodo in ('sinpe','transferencia')),
  moneda text not null default 'CRC' check (moneda = 'CRC'),
  total_productos numeric(12,2) not null check (total_productos > 0),
  costo_envio numeric(12,2) check (costo_envio >= 0),
  total_cobrar numeric(12,2) check (total_cobrar > 0),
  cliente jsonb not null,
  articulos jsonb not null,
  comprobante_path text,
  comprobante_en timestamptz,
  verificado_en timestamptz,
  correo_cliente_en timestamptz,
  correo_equipo_en timestamptz,
  correo_pago_en timestamptz
);
create index pedidos_manuales_creado_en_idx on public.pedidos_manuales(creado_en desc);
alter table public.pedidos_manuales enable row level security;
revoke all on public.pedidos_manuales from anon, authenticated;
grant select, insert, update on public.pedidos_manuales to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes-pedidos', 'comprobantes-pedidos', false, 5242880, array['image/jpeg','image/png','application/pdf'])
on conflict (id) do nothing;
