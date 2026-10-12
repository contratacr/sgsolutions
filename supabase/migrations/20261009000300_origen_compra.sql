-- Checkout verification sessions are internal; they are not advice requests.
alter table public.solicitudes_asesoria
 add column origen text not null default 'asesoria'
 check (origen in ('asesoria','tienda'));
create index solicitudes_asesoria_origen_creado_idx
 on public.solicitudes_asesoria(origen,creado_en desc);
