begin;
-- Operational records, entered explicitly by staff. No browser events or Meta export.
create table if not exists public.contactos_comerciales (
 id uuid primary key,
 referencia text not null unique check (referencia ~ '^[A-Za-z0-9_-]{3,40}$'),
 fecha date not null,
 canal text not null check(canal in ('whatsapp','formulario','telefono','correo')),
 fuente text not null check(fuente in ('sin_confirmar','sitio','sg_video_20261023','sg_ventas_tienda_20261028','otro')),
 etapa text not null check(etapa in ('recibido','calificado','cotizado','cerrado')),
 prueba boolean not null default false,
 revision integer not null default 1 check(revision>0),
 actualizado_en timestamptz not null default now()
);
alter table public.contactos_comerciales enable row level security;
revoke all on public.contactos_comerciales from anon, authenticated;
grant select, insert, update on public.contactos_comerciales to service_role;
create index if not exists contactos_comerciales_fecha on public.contactos_comerciales(fecha);
commit;
