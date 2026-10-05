-- Retirar del panel consultas canceladas sin pedido, conservando su referencia.
alter table public.solicitudes_asesoria add column eliminado_en timestamptz;
