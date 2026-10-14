-- El pago conserva su estado original; la preparación y entrega son independientes.
-- Los pedidos históricos pagados quedan pendientes de preparar, nunca entregados automáticamente.
alter table public.pedidos_manuales add column estado_entrega text not null default 'pendiente_preparar'
  check (estado_entrega in ('pendiente_preparar','preparando','listo_retiro','enviado','entregado'));
alter table public.pedidos_manuales add column entrega_actualizada_en timestamptz;
alter table public.pedidos_tilopay add column estado_entrega text not null default 'pendiente_preparar'
  check (estado_entrega in ('pendiente_preparar','preparando','listo_retiro','enviado','entregado'));
alter table public.pedidos_tilopay add column entrega_actualizada_en timestamptz;

create function public.validar_estado_entrega() returns trigger
language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    if new.estado_entrega <> 'pendiente_preparar' then raise exception 'invalid_delivery_transition'; end if;
    return new;
  end if;
  if new.estado_entrega is not distinct from old.estado_entrega then return new; end if;
  if old.estado <> 'pagado' or new.estado <> 'pagado' then raise exception 'payment_required'; end if;
  if not (
    (old.estado_entrega = 'pendiente_preparar' and new.estado_entrega = 'preparando') or
    (old.estado_entrega = 'preparando' and new.estado_entrega = case when new.cliente->>'modalidad' = 'envio' then 'enviado' else 'listo_retiro' end) or
    (old.estado_entrega in ('enviado','listo_retiro') and new.estado_entrega = 'entregado')
  ) then raise exception 'invalid_delivery_transition'; end if;
  new.entrega_actualizada_en := now();
  return new;
end;
$$;
revoke all on function public.validar_estado_entrega() from public, anon, authenticated;
create trigger validar_entrega_manual before insert or update on public.pedidos_manuales
for each row execute function public.validar_estado_entrega();
create trigger validar_entrega_tarjeta before insert or update on public.pedidos_tilopay
for each row execute function public.validar_estado_entrega();
-- Se mantienen RLS y los permisos existentes: únicamente el servidor administra pedidos.
