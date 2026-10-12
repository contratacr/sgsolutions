-- Cola privada: cada destinatario recibe una sola confirmación por pedido.
create table if not exists public.correos_pago_tarjeta (
 pedido_id uuid not null references public.pedidos_tilopay(id),
 destinatario text not null check (destinatario in ('cliente','equipo')),
 estado text not null default 'pendiente' check (estado in ('pendiente','enviando','enviado')),
 actualizado_en timestamptz not null default now(),
 intentos integer not null default 0,
 primary key (pedido_id,destinatario)
);
alter table public.correos_pago_tarjeta enable row level security;
revoke all on public.correos_pago_tarjeta from anon,authenticated;
grant select,insert,update on public.correos_pago_tarjeta to service_role;
