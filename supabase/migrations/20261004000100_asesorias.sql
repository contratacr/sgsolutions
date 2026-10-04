-- Solicitudes previas al pedido: solo el servidor y los administradores autorizados las gestionan.
create table public.solicitudes_asesoria (
 id uuid primary key,
 creado_en timestamptz not null default now(),
 estado text not null default 'solicitada' check (estado in ('solicitada','aprobada','procesando','utilizada','cancelada')),
 idioma text not null check (idioma in ('es','en')),
 articulos jsonb not null check (jsonb_typeof(articulos) = 'array'),
 token text unique,
 vence_en timestamptz,
 pedido_id uuid
);
create index solicitudes_asesoria_creado_idx on public.solicitudes_asesoria(creado_en desc);
alter table public.solicitudes_asesoria enable row level security;
revoke all on public.solicitudes_asesoria from anon, authenticated;
grant select, insert, update on public.solicitudes_asesoria to service_role;
