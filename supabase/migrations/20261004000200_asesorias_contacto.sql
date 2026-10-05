-- Optional callback enquiries. Existing RLS keeps contact details server-only.
alter table public.solicitudes_asesoria
 add column contacto jsonb check (contacto is null or jsonb_typeof(contacto) = 'object');
create index solicitudes_asesoria_pendientes_idx
 on public.solicitudes_asesoria(creado_en) where estado = 'solicitada';
