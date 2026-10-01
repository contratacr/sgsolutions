-- Los pedidos y datos de contacto solo son accesibles al servidor con service_role.
create table public.pedidos_tilopay (
  id uuid primary key,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  estado text not null check (estado in ('iniciado', 'pendiente', 'pagado', 'rechazado', 'error')),
  entorno text not null check (entorno in ('pruebas', 'produccion')),
  moneda text not null default 'CRC' check (moneda = 'CRC'),
  total numeric(12, 2) not null check (total > 0),
  cliente jsonb not null,
  articulos jsonb not null,
  transaccion_tilopay text,
  resultado_tilopay text
);
create index pedidos_tilopay_creado_en_idx on public.pedidos_tilopay(creado_en desc);
alter table public.pedidos_tilopay enable row level security;
revoke all on public.pedidos_tilopay from anon, authenticated;
grant select, insert, update on public.pedidos_tilopay to service_role;
