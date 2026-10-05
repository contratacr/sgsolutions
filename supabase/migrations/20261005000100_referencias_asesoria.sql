-- Referencias cortas para nuevas consultas. Mantiene las referencias existentes.
create sequence public.asesoria_numero_seq;
alter table public.solicitudes_asesoria add column numero bigint unique;
alter sequence public.asesoria_numero_seq owned by public.solicitudes_asesoria.numero;
alter table public.solicitudes_asesoria alter column numero set default nextval('public.asesoria_numero_seq');
revoke all on sequence public.asesoria_numero_seq from anon, authenticated;
grant usage, select on sequence public.asesoria_numero_seq to service_role;
