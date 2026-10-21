-- Internal reconciliation only. Existing attempts never trigger retrospective email.
alter table public.pedidos_tilopay
 add column conciliacion_proxima_en timestamptz not null default now(),
 add column conciliacion_reserva uuid,
 add column aviso_intento_elegible boolean not null default false,
 add column aviso_intento_en timestamptz,
 add column aviso_intento_estado text not null default 'pendiente' check(aviso_intento_estado in ('pendiente','enviando','enviado','incierto'));
alter table public.pedidos_tilopay alter column aviso_intento_elegible set default true;
create index pedidos_tarjeta_conciliacion on public.pedidos_tilopay(conciliacion_proxima_en) where estado in ('iniciado','pendiente','rechazado','error');
create function public.reservar_conciliacion_tarjeta() returns setof public.pedidos_tilopay
language sql security definer set search_path=public as $$
 with candidatos as (
 select id from public.pedidos_tilopay where entorno='produccion'
 and (estado in ('iniciado','pendiente','rechazado','error') or estado='pagado' and (select count(*) from public.correos_pago_tarjeta c where c.pedido_id=pedidos_tilopay.id and c.estado='enviado')<2)
 and creado_en>now()-interval '7 days' and creado_en<now()-interval '2 minutes'
 and conciliacion_proxima_en<=now()
 order by conciliacion_proxima_en,id limit 12 for update skip locked
 ) update public.pedidos_tilopay p set aviso_intento_estado=case when p.aviso_intento_estado='enviando' then 'incierto' else p.aviso_intento_estado end,conciliacion_reserva=gen_random_uuid(),conciliacion_proxima_en=now()+case when p.creado_en>now()-interval '1 hour' then interval '15 minutes' when p.creado_en>now()-interval '1 day' then interval '1 hour' else interval '6 hours' end
 from candidatos c where p.id=c.id returning p.*;
$$;
revoke all on function public.reservar_conciliacion_tarjeta() from public,anon,authenticated;
grant execute on function public.reservar_conciliacion_tarjeta() to service_role;
