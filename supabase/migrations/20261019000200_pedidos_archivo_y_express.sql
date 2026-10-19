-- Archivo administrativo reversible, con motivo interno. No cambia el pago ni cancela enlaces.
begin;
alter table public.solicitudes_asesoria add column archivado_motivo text check(archivado_motivo is null or char_length(btrim(archivado_motivo)) between 3 and 1000);
alter table public.pedidos_manuales add column archivado_motivo text check(archivado_motivo is null or char_length(btrim(archivado_motivo)) between 3 and 1000);
alter table public.pedidos_tilopay add column archivado_motivo text check(archivado_motivo is null or char_length(btrim(archivado_motivo)) between 3 and 1000);
create or replace function public.validar_archivo_panel() returns trigger
language plpgsql set search_path='' as $$
declare permitido boolean;
begin
 if TG_OP='INSERT' then
  if new.archivado_en is not null or new.archivado_motivo is not null then raise exception 'invalid_archive';end if;
  return new;
 end if;
 -- Un pago confirmado después del archivo vuelve a la bandeja; conserva el motivo como historial.
 if TG_TABLE_NAME in ('pedidos_tilopay','pedidos_manuales') and old.estado<>'pagado' and new.estado='pagado' then
  new.archivado_en:=null;return new;
 end if;
 if new.archivado_en is null or new.archivado_en is not distinct from old.archivado_en then
  if new.archivado_motivo is distinct from old.archivado_motivo then raise exception 'archive_reason_immutable';end if;
  return new;
 end if;
 if old.archivado_en is not null then raise exception 'invalid_archive';end if;
 if TG_TABLE_NAME='solicitudes_asesoria' then permitido:=new.estado in ('utilizada','cancelada');
 elsif TG_TABLE_NAME='pedidos_manuales' then permitido:=new.estado in ('revision','pendiente_pago','cancelado') or (new.estado='pagado' and new.estado_entrega='entregado');
 else permitido:=new.estado in ('iniciado','pendiente','rechazado','error') or (new.estado='pagado' and new.estado_entrega='entregado');
 end if;
 if permitido is not true or new.archivado_motivo is null or char_length(btrim(new.archivado_motivo)) not between 3 and 1000 then raise exception 'invalid_archive';end if;
 new.archivado_en:=now();new.archivado_motivo:=btrim(new.archivado_motivo);return new;
end$$;
-- Express tiene el mismo avance logístico que envío normal; retiro conserva su propio flujo.
create or replace function public.validar_estado_entrega() returns trigger
language plpgsql set search_path='' as $$
begin
 if TG_OP='INSERT' then
  if new.estado_entrega<>'pendiente_preparar' then raise exception 'invalid_delivery_transition';end if;
  return new;
 end if;
 if new.estado_entrega is not distinct from old.estado_entrega then return new;end if;
 if old.estado<>'pagado' or new.estado<>'pagado' then raise exception 'payment_required';end if;
 if not (
 (old.estado_entrega='pendiente_preparar' and new.estado_entrega='preparando') or
 (old.estado_entrega='preparando' and new.estado_entrega=case when new.cliente->>'modalidad'='digital' then 'entregado' when new.cliente->>'modalidad' in ('envio','express') then 'enviado' else 'listo_retiro' end) or
 (old.estado_entrega in ('enviado','listo_retiro') and new.estado_entrega='entregado')
 ) then raise exception 'invalid_delivery_transition';end if;
 new.entrega_actualizada_en:=now();return new;
end$$;
revoke all on function public.validar_archivo_panel() from public,anon,authenticated;
revoke all on function public.validar_estado_entrega() from public,anon,authenticated;
commit;
