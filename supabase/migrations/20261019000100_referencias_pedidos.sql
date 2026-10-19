-- Referencia pública estable por operación; UUID, tokens, pagos y números antiguos intactos.
begin;
lock table public.solicitudes_asesoria, public.pedidos_manuales, public.pedidos_tilopay in share row exclusive mode;
create sequence public.referencia_pedido_seq;
create table public.referencias_pedido (
 operacion_id uuid primary key,
 numero bigint not null unique default nextval('public.referencia_pedido_seq'),
 constraint referencia_pedido_positiva check(numero > 0)
);
alter sequence public.referencia_pedido_seq owned by public.referencias_pedido.numero;
alter table public.referencias_pedido enable row level security;
revoke all on public.referencias_pedido from public, anon, authenticated, service_role;
revoke all on sequence public.referencia_pedido_seq from public, anon, authenticated, service_role;
grant select on public.referencias_pedido to service_role;
alter table public.solicitudes_asesoria add column referencia_numero bigint references public.referencias_pedido(numero);
alter table public.pedidos_manuales add column solicitud_asesoria_id uuid references public.solicitudes_asesoria(id);
alter table public.pedidos_tilopay add column solicitud_asesoria_id uuid references public.solicitudes_asesoria(id);
alter table public.pedidos_manuales add column referencia_numero bigint references public.referencias_pedido(numero);
alter table public.pedidos_tilopay add column referencia_numero bigint references public.referencias_pedido(numero);
-- Abortar si una relación histórica resulta ambigua: nunca asignar al azar.
do $$begin
 if exists(select pedido_id from public.solicitudes_asesoria where pedido_id is not null group by pedido_id having count(*)>1) then raise exception 'RELACION_PEDIDO_AMBIGUA';end if;
end$$;
update public.pedidos_manuales p set solicitud_asesoria_id=s.id from public.solicitudes_asesoria s where s.pedido_id=p.id;
update public.pedidos_tilopay p set solicitud_asesoria_id=s.id from public.solicitudes_asesoria s where s.pedido_id=p.id;
-- Orden cronológico determinista, incluyendo archivados/eliminados/pruebas; nunca reciclar números.
insert into public.referencias_pedido(operacion_id)
 select operacion_id from (
 select id operacion_id,creado_en from public.solicitudes_asesoria
 union all select coalesce(solicitud_asesoria_id,id),creado_en from public.pedidos_manuales
 union all select coalesce(solicitud_asesoria_id,id),creado_en from public.pedidos_tilopay
 ) operaciones group by operacion_id order by min(creado_en),operacion_id;
update public.solicitudes_asesoria s set referencia_numero=r.numero from public.referencias_pedido r where r.operacion_id=s.id;
update public.pedidos_manuales p set referencia_numero=r.numero from public.referencias_pedido r where r.operacion_id=coalesce(p.solicitud_asesoria_id,p.id);
update public.pedidos_tilopay p set referencia_numero=r.numero from public.referencias_pedido r where r.operacion_id=coalesce(p.solicitud_asesoria_id,p.id);
alter table public.solicitudes_asesoria alter column referencia_numero set not null;
alter table public.pedidos_manuales alter column referencia_numero set not null;
alter table public.pedidos_tilopay alter column referencia_numero set not null;
create function public.asignar_referencia_pedido() returns trigger language plpgsql security definer set search_path='' as $$
declare operacion uuid;n bigint;
begin
 if tg_op='UPDATE' then
  if new.referencia_numero is distinct from old.referencia_numero or new.id is distinct from old.id then raise exception 'REFERENCIA_INMUTABLE';end if;
  if tg_table_name<>'solicitudes_asesoria' then
   if new.solicitud_asesoria_id is distinct from old.solicitud_asesoria_id then raise exception 'REFERENCIA_INMUTABLE';end if;
  end if;
  return new;
 end if;
 if tg_table_name='solicitudes_asesoria' then operacion:=new.id;
 else operacion:=coalesce(new.solicitud_asesoria_id,new.id);end if;
 select numero into n from public.referencias_pedido where operacion_id=operacion;
 if n is null then
  insert into public.referencias_pedido(operacion_id) values(operacion) on conflict(operacion_id) do nothing returning numero into n;
  if n is null then select numero into strict n from public.referencias_pedido where operacion_id=operacion;end if;
 end if;
 new.referencia_numero:=n;
 return new;
end$$;
revoke all on function public.asignar_referencia_pedido() from public,anon,authenticated,service_role;
create trigger referencia_asesoria before insert or update on public.solicitudes_asesoria for each row execute function public.asignar_referencia_pedido();
create trigger referencia_manual before insert or update on public.pedidos_manuales for each row execute function public.asignar_referencia_pedido();
create trigger referencia_tarjeta before insert or update on public.pedidos_tilopay for each row execute function public.asignar_referencia_pedido();
-- Se conserva la RPC anterior para clientes abiertos antes de este despliegue.
create function public.mis_pedidos_referencias()
returns table(id uuid,origen text,creado_en timestamptz,estado text,total numeric,articulos jsonb,referencia_numero bigint)
language sql security definer set search_path='' as $$
 select m.*,case when m.origen='manual' then p.referencia_numero else t.referencia_numero end
 from public.mis_pedidos() m
 left join public.pedidos_manuales p on m.origen='manual' and p.id=m.id
 left join public.pedidos_tilopay t on m.origen='tarjeta' and t.id=m.id
 order by m.creado_en desc;
$$;
revoke all on function public.mis_pedidos_referencias() from public,anon;
grant execute on function public.mis_pedidos_referencias() to authenticated;
commit;
