-- Archivar cambia únicamente la organización del panel; conserva pagos e historial del cliente.
alter table public.solicitudes_asesoria add column archivado_en timestamptz;
alter table public.pedidos_manuales add column archivado_en timestamptz;
alter table public.pedidos_tilopay add column archivado_en timestamptz;
create function public.validar_archivo_panel() returns trigger
language plpgsql set search_path='' as $$
declare permitido boolean;
begin
 if TG_OP='INSERT' then
  if new.archivado_en is not null then raise exception 'invalid_archive'; end if;
  return new;
 end if;
 -- Un pago tardío aprobado vuelve a la bandeja activa para que se prepare.
 if TG_TABLE_NAME='pedidos_tilopay' and old.estado<>'pagado' and new.estado='pagado' then
  new.archivado_en:=null;
  return new;
 end if;
 if new.archivado_en is null or new.archivado_en is not distinct from old.archivado_en then return new; end if;
 if TG_TABLE_NAME='solicitudes_asesoria' then
  permitido:=new.estado in ('utilizada','cancelada');
 elsif TG_TABLE_NAME='pedidos_manuales' then
  permitido:=new.estado='cancelado' or (new.estado='pagado' and new.estado_entrega='entregado');
 else
  permitido:=new.estado in ('rechazado','error') or (new.estado='pagado' and new.estado_entrega='entregado') or
    (new.estado in ('iniciado','pendiente') and new.creado_en<=now()-interval '24 hours');
 end if;
 if permitido is not true then raise exception 'invalid_archive'; end if;
 new.archivado_en:=now();
 return new;
end;
$$;
revoke all on function public.validar_archivo_panel() from public,anon,authenticated;
create trigger validar_archivo_asesoria before insert or update on public.solicitudes_asesoria for each row execute function public.validar_archivo_panel();
create trigger validar_archivo_manual before insert or update on public.pedidos_manuales for each row execute function public.validar_archivo_panel();
create trigger validar_archivo_tarjeta before insert or update on public.pedidos_tilopay for each row execute function public.validar_archivo_panel();
