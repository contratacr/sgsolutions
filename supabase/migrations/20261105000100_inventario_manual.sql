-- Available units live in the private catalog. Every stock change shares its
-- advisory lock/revision with guardar_catalogo, preventing stale editor saves.
create table public.reservas_inventario_manual(
 fuente text not null check(fuente in ('manual','tarjeta')), pedido uuid not null,
 producto text not null, cantidad integer not null check(cantidad>0),
 estado text not null check(estado in ('reservado','consumido','liberado')),
 vence_en timestamptz, primary key(fuente,pedido,producto)
);
alter table public.reservas_inventario_manual enable row level security;
revoke all on public.reservas_inventario_manual from public,anon,authenticated;
alter table public.pedidos_manuales add column inventario_alerta boolean not null default false;
alter table public.pedidos_tilopay add column inventario_alerta boolean not null default false;

create function public.ajustar_existencias_manual(producto text, diferencia integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare c jsonb; i integer; unidades integer;
begin
 perform pg_advisory_xact_lock(903107);
 select contenido into c from public.catalogo_privado where id=1;
 select (ord-1)::integer,(p->>'stockManual')::integer into i,unidades
 from jsonb_array_elements(c->'productos') with ordinality a(p,ord)
 where p->>'id'=producto and p->>'origen'='manual' and jsonb_typeof(p->'stockManual')='number';
 if i is null or (unidades+diferencia<0 or unidades+diferencia>1000000) then return false; end if;
 update public.catalogo_privado set contenido=jsonb_set(contenido,array['productos',i::text,'stockManual'],to_jsonb(unidades+diferencia)),revision=revision+1 where id=1;
 update public.catalogo_publico set contenido=jsonb_set(contenido,'{productos}',coalesce((select jsonb_agg(case when p->>'id'=producto then jsonb_set(jsonb_set(p,'{stockDisponible}',to_jsonb(unidades+diferencia)),'{disponibilidad}',to_jsonb(case when unidades+diferencia=0 then 'agotado'::text else 'proveedor'::text end)) else p end order by ord) from jsonb_array_elements(contenido->'productos') with ordinality a(p,ord)),'[]'::jsonb)) where id=1;
 return true;
end $$;

create function public.liberar_reservas_inventario() returns void
language plpgsql security definer set search_path='' as $$
declare r record;
begin
 perform pg_advisory_xact_lock(903107);
 for r in select * from public.reservas_inventario_manual where estado='reservado' and vence_en<=now() for update loop
  if not public.ajustar_existencias_manual(r.producto,r.cantidad) then raise exception 'INVENTARIO_NO_DISPONIBLE'; end if;
  update public.reservas_inventario_manual set estado='liberado',vence_en=null where fuente=r.fuente and pedido=r.pedido and producto=r.producto;
 end loop;
end $$;

create function public.controlar_inventario_pedido() returns trigger
language plpgsql security definer set search_path='' as $$
declare fuente_actual text:=case when tg_table_name='pedidos_manuales' then 'manual' else 'tarjeta' end;
 linea record; r record; controlado boolean; vencimiento timestamptz; liberar boolean;
begin
 -- Sandbox orders never consume the production inventory.
 if tg_op='UPDATE' and new.entorno is distinct from old.entorno then raise exception 'ENTORNO_INMUTABLE'; end if;
 if new.entorno<>'produccion' then return new; end if;
 perform pg_advisory_xact_lock(903107);
 if tg_op='UPDATE' then
  if new.articulos is distinct from old.articulos or new.entorno is distinct from old.entorno then raise exception 'ARTICULOS_INMUTABLES'; end if;
  if old.inventario_alerta and new.estado_entrega is distinct from old.estado_entrega then raise exception 'INVENTARIO_REQUIERE_REVISION'; end if;
 end if;
 perform public.liberar_reservas_inventario();
 if tg_op='INSERT' then
  -- Aggregate repeated IDs before reserving; the whole order rolls back on failure.
  for linea in select x->>'id' id,sum((x->>'cantidad')::integer)::integer cantidad from jsonb_array_elements(new.articulos) x group by x->>'id' loop
   select exists(select 1 from public.catalogo_privado c,jsonb_array_elements(c.contenido->'productos') p where p->>'id'=linea.id and p->>'origen'='manual' and jsonb_typeof(p->'stockManual')='number') into controlado;
   if not controlado then continue; end if;
   if linea.cantidad<1 or not public.ajustar_existencias_manual(linea.id,-linea.cantidad) then raise exception 'STOCK_INSUFICIENTE'; end if;
   -- Hosted card links have no confirmed revocation API yet. Never release
   -- an active card reservation by time alone while that link can still charge.
   vencimiento:=case when fuente_actual='tarjeta' then null else now()+interval '24 hours' end;
   insert into public.reservas_inventario_manual values(fuente_actual,new.id,linea.id,linea.cantidad,case when new.estado='pagado' then 'consumido' else 'reservado' end,case when new.estado='pagado' then null else vencimiento end);
  end loop;
 end if;
 if new.estado='pagado' then new.inventario_alerta:=false; end if;
 liberar:=new.estado='cancelado' or (new.archivado_en is not null and new.estado<>'pagado');
 for r in select * from public.reservas_inventario_manual where fuente=fuente_actual and pedido=new.id for update loop
  if new.estado='pagado' then
   if r.estado='liberado' and not public.ajustar_existencias_manual(r.producto,-r.cantidad) then
    -- Record the real payment even when it arrives after expiry. Fulfilment is
    -- blocked for an administrator to resolve; never conceal a successful charge.
    new.inventario_alerta:=true;
   else
    update public.reservas_inventario_manual set estado='consumido',vence_en=null where fuente=r.fuente and pedido=r.pedido and producto=r.producto;
   end if;
  elsif liberar and r.estado='reservado' then
   if not public.ajustar_existencias_manual(r.producto,r.cantidad) then raise exception 'INVENTARIO_NO_DISPONIBLE'; end if;
   update public.reservas_inventario_manual set estado='liberado',vence_en=null where fuente=r.fuente and pedido=r.pedido and producto=r.producto;
  elsif new.estado='comprobante_recibido' and r.estado='reservado' then
   update public.reservas_inventario_manual set vence_en=null where fuente=r.fuente and pedido=r.pedido and producto=r.producto;
  end if;
 end loop;
 return new;
end $$;
create trigger inventario_manual_pedido before insert or update on public.pedidos_manuales for each row execute function public.controlar_inventario_pedido();
create trigger inventario_tarjeta_pedido before insert or update on public.pedidos_tilopay for each row execute function public.controlar_inventario_pedido();
revoke all on function public.ajustar_existencias_manual(text,integer),public.liberar_reservas_inventario(),public.controlar_inventario_pedido() from public,anon,authenticated;
grant execute on function public.liberar_reservas_inventario() to service_role;

-- Do not allow an editor/synchronizer to remove tracking while stock is reserved.
create function public.proteger_reservas_catalogo() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(903107);
 if exists(select 1 from public.reservas_inventario_manual r where r.estado='reservado' and not exists(select 1 from jsonb_array_elements(new.contenido->'productos') p where p->>'id'=r.producto and p->>'origen'='manual' and jsonb_typeof(p->'stockManual')='number')) then raise exception 'INVENTARIO_CON_RESERVAS'; end if;
 return new;
end $$;
create trigger proteger_reservas_catalogo before update on public.catalogo_privado for each row execute function public.proteger_reservas_catalogo();
revoke all on function public.proteger_reservas_catalogo() from public,anon,authenticated;
