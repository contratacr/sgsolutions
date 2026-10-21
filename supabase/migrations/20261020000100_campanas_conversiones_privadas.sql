-- Aggregate usage remains separate from consented, pseudonymous advertising.
alter table public.pedidos_manuales add column if not exists entorno text not null default 'produccion' check(entorno in ('produccion','pruebas'));
create table public.estadisticas_embudo (
 fecha date not null,tipo text not null,canal text not null,medio text not null,campana text not null default '',
 primer_canal text not null,primera_campana text not null default '',idioma text not null check(idioma in ('es','en')),cantidad bigint not null default 1,
 primary key(fecha,tipo,canal,medio,campana,primer_canal,primera_campana,idioma)
);
create table public.medicion_operaciones (
 clave text primary key check(clave ~ '^[A-Za-z0-9_-]{43}$'),tipo text not null,operacion uuid not null,
 excluir boolean not null,contexto jsonb,idioma text not null check(idioma in ('es','en')),creado_en timestamptz not null default now(),
 unique(tipo,operacion)
);
create table public.medicion_hitos (clave text primary key,fecha date not null default (now() at time zone 'America/Costa_Rica')::date);
create table public.publicidad_revocaciones (id uuid primary key,vence_en timestamptz not null default now()+interval '31 days');
create table public.publicidad_cola (
 id text primary key check(id ~ '^[A-Za-z0-9_-]{43}$'),contexto uuid not null,
 evento text not null check(evento in ('PageView','ViewContent','AddToCart','Search','WhatsAppClick','ContactClick','InitiateCheckout','Lead','Purchase')),
 ruta text not null check(ruta in ('/','/tienda','/tienda/producto','/soporte','/empresas','/casos-de-exito','/nosotros','/contacto','/pagar','/finalizar-compra','/terminos','/privacidad')),
 producto text check(producto ~ '^[a-z0-9-]{1,100}$'),valor numeric check(valor>0 and valor<=100000000),
 fbp text,fbc text,estado text not null default 'pendiente' check(estado in ('pendiente','enviando','aceptado','suprimido','expirado')),
 intentos integer not null default 0,reserva uuid,creado_en timestamptz not null default now(),vence_en timestamptz not null,
 proximo_en timestamptz not null default now(),reservado_en timestamptz,codigo text check(length(codigo)<=20),
 check(evento<>'Purchase' or valor is not null),check(fbp is null or fbp ~ '^fb\.1\.[0-9]{10,13}\.[0-9]{1,20}$'),
 check(fbc is null or fbc ~ '^fb\.1\.[0-9]{10,13}\.[A-Za-z0-9_-]{1,300}$')
);
create index publicidad_pendiente on public.publicidad_cola(proximo_en) where estado in ('pendiente','enviando');
-- Operational inbox, not an analytics table. Personal content never enters CAPI.
create table public.solicitudes_empresas (
 id uuid primary key,creado_en timestamptz not null default now(),estado text not null default 'recibida' check(estado in ('recibida','notificada','archivada')),
 idioma text not null check(idioma in ('es','en')),plan integer not null check(plan between 0 and 2),datos jsonb not null,
 clave_solicitud uuid not null unique
);
do $$declare t text;begin foreach t in array array['estadisticas_embudo','medicion_operaciones','medicion_hitos','publicidad_revocaciones','publicidad_cola','solicitudes_empresas'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
end loop;end;$$;
create policy solicitudes_empresas_admin on public.solicitudes_empresas for select to authenticated using(public.es_administrador_activo());
grant select on public.solicitudes_empresas to authenticated;
create function public.revocar_publicidad(contexto uuid) returns void language plpgsql security definer set search_path='' as $$begin
 insert into public.publicidad_revocaciones(id) values(contexto) on conflict(id) do update set vence_en=greatest(public.publicidad_revocaciones.vence_en,excluded.vence_en);
 update public.publicidad_cola set estado='suprimido',fbp=null,fbc=null where publicidad_cola.contexto=revocar_publicidad.contexto and estado in ('pendiente','enviando');
 update public.medicion_operaciones set contexto=null where medicion_operaciones.contexto->>'id'=revocar_publicidad.contexto::text;
end;$$;
create function public.encolar_publicidad(entrada jsonb) returns void language plpgsql security definer set search_path='' as $$begin
 if exists(select 1 from public.publicidad_revocaciones where id=(entrada->>'contexto')::uuid) then return;end if;
 insert into public.publicidad_cola(id,contexto,evento,ruta,producto,valor,fbp,fbc,vence_en)
 values(entrada->>'id',(entrada->>'contexto')::uuid,entrada->>'evento',entrada->>'ruta',entrada->>'producto',(entrada->>'valor')::numeric,entrada->>'fbp',entrada->>'fbc',least(now()+interval '48 hours',(entrada->>'vence_contexto')::timestamptz)) on conflict(id) do nothing;
end;$$;
create function public.reservar_publicidad(limite integer default 8) returns setof public.publicidad_cola language sql security definer set search_path='' as $$
 with candidatas as (select id from public.publicidad_cola where vence_en>now() and intentos<5 and
 (estado='pendiente' and proximo_en<=now() or estado='enviando' and reservado_en<now()-interval '10 minutes')
 and not exists(select 1 from public.publicidad_revocaciones r where r.id=contexto) order by creado_en for update skip locked limit least(greatest(limite,1),8))
 update public.publicidad_cola c set estado='enviando',reserva=gen_random_uuid(),reservado_en=now(),intentos=intentos+1 from candidatas t where c.id=t.id returning c.*;
$$;
create function public.terminar_publicidad(clave text,reserva uuid,resultado text,codigo text) returns void language plpgsql security definer set search_path='' as $$begin
 if resultado not in ('pendiente','aceptado','suprimido','expirado') then raise exception 'invalid_state';end if;
 update public.publicidad_cola c set estado=case when exists(select 1 from public.publicidad_revocaciones r where r.id=c.contexto) then 'suprimido' when resultado='pendiente' and c.intentos>=5 then 'expirado' else resultado end,
 codigo=left(terminar_publicidad.codigo,20),proximo_en=now()+make_interval(secs=>least(3600,60*power(2,c.intentos)::integer)),
 fbp=case when resultado='pendiente' and c.intentos<5 and not exists(select 1 from public.publicidad_revocaciones r where r.id=c.contexto) then c.fbp else null end,
 fbc=case when resultado='pendiente' and c.intentos<5 and not exists(select 1 from public.publicidad_revocaciones r where r.id=c.contexto) then c.fbc else null end
 where c.id=clave and c.reserva=terminar_publicidad.reserva and c.estado='enviando';
end;$$;
create function public.depurar_medicion() returns void language plpgsql security definer set search_path='' as $$begin
 update public.publicidad_cola set estado='expirado',fbp=null,fbc=null where estado in ('pendiente','enviando') and (vence_en<=now() or intentos>=5 and (estado='pendiente' or reservado_en<now()-interval '10 minutes'));
 delete from public.publicidad_cola where creado_en<now()-interval '30 days';
 delete from public.medicion_operaciones where creado_en<now()-interval '30 days';
 delete from public.publicidad_revocaciones where vence_en<now();
 delete from public.estadisticas_embudo where fecha<(now() at time zone 'America/Costa_Rica')::date-30;
 delete from public.medicion_hitos where fecha<(now() at time zone 'America/Costa_Rica')::date-30;
end;$$;
create function public.registrar_hito_negocio(entrada jsonb) returns boolean language plpgsql security definer set search_path='' as $$
declare c jsonb:=entrada->'contexto';ultimo jsonb:=c->'reciente';primero jsonb:=c->'primero';begin
 if exists(select 1 from public.perfiles where id=auth.uid() and rol='administrador') then return false;end if;
 if entrada->>'tipo' not in ('solicitud_recibida','pedido_creado','pago_confirmado','cotizacion_preparada','campana_visita') then raise exception 'invalid_event';end if;
 if not (entrada->>'clave' ~ '^[A-Za-z0-9_-]{43}$') then raise exception 'invalid_key';end if;
 if coalesce((entrada->>'excluir')::boolean,true) then return false;end if;
 if c is not null and c<>'null'::jsonb and (exists(select 1 from public.publicidad_revocaciones where id=(c->>'id')::uuid) or (c->>'vence')::bigint<extract(epoch from now())*1000) then c:=null;ultimo:=null;primero:=null;end if;
 insert into public.medicion_hitos(clave) values(entrada->>'clave') on conflict do nothing;if not found then return false;end if;
 insert into public.estadisticas_embudo(fecha,tipo,canal,medio,campana,primer_canal,primera_campana,idioma)
 values((now() at time zone 'America/Costa_Rica')::date,entrada->>'tipo',coalesce(ultimo->>'canal','sin_atribucion'),coalesce(ultimo->>'medio','desconocido'),coalesce(ultimo->>'campana',''),coalesce(primero->>'canal','sin_atribucion'),coalesce(primero->>'campana',''),entrada->>'idioma')
 on conflict on constraint estadisticas_embudo_pkey do update set cantidad=public.estadisticas_embudo.cantidad+1;return true;
end;$$;
create function public.resumen_campanas_panel(dias integer default 30) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not public.es_administrador_activo() then raise exception 'SIN_PERMISO' using errcode='42501';end if;
 if dias not in (7,30) then raise exception 'invalid_period';end if;
 return jsonb_build_object('embudo',coalesce((select jsonb_agg(to_jsonb(f)) from(select tipo,sum(cantidad) as cantidad from public.estadisticas_embudo where fecha>=((now() at time zone 'America/Costa_Rica')::date-(dias-1)) group by tipo)f),'[]'::jsonb),
 'campanas',coalesce((select jsonb_agg(to_jsonb(f)) from(select canal,medio,campana,primer_canal,primera_campana,tipo,sum(cantidad) as cantidad from public.estadisticas_embudo where fecha>=((now() at time zone 'America/Costa_Rica')::date-(dias-1)) group by canal,medio,campana,primer_canal,primera_campana,tipo order by sum(cantidad) desc limit 100)f),'[]'::jsonb),
 'meta',coalesce((select jsonb_agg(to_jsonb(f)) from(select estado,count(*) as cantidad from public.publicidad_cola where creado_en>=now()-make_interval(days=>dias) group by estado)f),'[]'::jsonb));end;$$;
revoke all on function public.resumen_campanas_panel(integer) from public,anon;
grant execute on function public.resumen_campanas_panel(integer) to authenticated;
do $$declare f text;begin foreach f in array array['revocar_publicidad(uuid)','encolar_publicidad(jsonb)','reservar_publicidad(integer)','terminar_publicidad(text,uuid,text,text)','depurar_medicion()','registrar_hito_negocio(jsonb)'] loop
 execute 'revoke all on function public.'||f||' from public,anon,authenticated';execute 'grant execute on function public.'||f||' to service_role';end loop;end;$$;
-- Check the operational record at payment time, without copying identity to analytics.
create function public.medicion_operacion_elegible(tipo_operacion text,id_operacion uuid) returns boolean language plpgsql stable security definer set search_path='' as $$
declare cliente jsonb;entorno text;begin
 if tipo_operacion='manual' then select p.cliente,p.entorno into cliente,entorno from public.pedidos_manuales p where p.id=id_operacion;
 elsif tipo_operacion='tarjeta' then select p.cliente,p.entorno into cliente,entorno from public.pedidos_tilopay p where p.id=id_operacion;
 else return false;end if;
 return cliente is not null and entorno='produccion' and coalesce(cliente->>'excluir_medicion','false')<>'true' and not exists(
 select 1 from auth.users u join public.perfiles p on p.id=u.id where lower(u.email)=lower(cliente->>'correo') and p.rol='administrador');end;$$;
revoke all on function public.medicion_operacion_elegible(text,uuid) from public,anon,authenticated;
grant execute on function public.medicion_operacion_elegible(text,uuid) to service_role;

create or replace function public.registrar_conteo_anonimo(evento jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare dia date:=(now() at time zone 'America/Costa_Rica')::date;tipo text:=evento->>'tipo';ruta text:=evento->>'ruta';detalle text:=evento->>'detalle';producto text;
begin
 if exists(select 1 from public.perfiles where id=auth.uid() and rol='administrador') then return; end if;
 if jsonb_typeof(evento)<>'object' or pg_column_size(evento)>2048 or
 (select count(*) from jsonb_object_keys(evento))<>5 or not (evento ?& array['tipo','ruta','detalle','dispositivo','idioma']) then raise exception 'invalid_event';end if;
 if tipo not in ('pagina','producto','busqueda_producto','carrito','plan','whatsapp','correo','telefono','mapa','red_social','galeria','pedido_revisado','plan_revisado','scroll','busqueda','busqueda_vacia','filtro','formulario_inicio','formulario_error','formulario_abandono') or
 ruta not in ('/','/tienda','/tienda/producto','/soporte','/empresas','/casos-de-exito','/nosotros','/contacto','/pagar','/finalizar-compra','/terminos','/privacidad') or
 detalle is null or length(detalle)>100 then raise exception 'invalid_event';end if;
 if tipo in ('producto','busqueda_producto','carrito') then
  select p->>'id' into producto from public.catalogo_publico c cross join lateral jsonb_array_elements(c.contenido->'productos') p where c.id=1 and (p->>'id'=detalle or p->>'slug'=detalle) limit 1;
  if producto is null then return; end if;detalle:=producto;
 elsif tipo in ('plan','plan_revisado') then if detalle not in ('1','2','3') then raise exception 'invalid_event';end if;
 elsif tipo in ('formulario_inicio','formulario_error','formulario_abandono') then if detalle not in ('compra','empresa','asesoria') then raise exception 'invalid_event';end if;
 elsif tipo='filtro' then if detalle not in ('categoria','subcategoria','marca','precio','orden') then raise exception 'invalid_event';end if;
 elsif tipo='scroll' then if detalle not in ('25','50','75','100') then raise exception 'invalid_event';end if;
 elsif tipo='whatsapp' then if detalle not in ('','footer','flotante','contenido') then raise exception 'invalid_event';end if;
 elsif tipo='red_social' then if detalle not in ('www.instagram.com','www.facebook.com') then raise exception 'invalid_event';end if;
 elsif detalle<>'' then raise exception 'invalid_event';end if;
 insert into public.estadisticas_diarias(fecha,tipo,ruta,detalle,dispositivo,idioma,cantidad)
 values(dia,tipo,ruta,detalle,evento->>'dispositivo',evento->>'idioma',1)
 on conflict on constraint estadisticas_diarias_pkey do update set cantidad=public.estadisticas_diarias.cantidad+1;
 if tipo='producto' then
  insert into public.productos_vistas_diarias(fecha,producto_id,cantidad) values(dia,detalle,1)
  on conflict(fecha,producto_id) do update set cantidad=public.productos_vistas_diarias.cantidad+1;
 end if;
 delete from public.estadisticas_diarias where fecha<dia-30;
 -- Retire previously consented raw events on their original retention schedule.
 delete from public.eventos_analitica where creado_en<now()-interval '30 days';
end;$$;

create or replace function public.resumen_estadisticas_panel(dias integer default 30) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare resultado jsonb; clientes jsonb; compras jsonb; desde timestamptz;
begin
 if not public.es_administrador_activo() then raise exception 'forbidden'; end if;
 if dias is null or dias not in (7,30) then raise exception 'invalid_period'; end if;
 desde:=((now() at time zone 'America/Costa_Rica')::date-(dias-1))::timestamp at time zone 'America/Costa_Rica';
 with recientes as (select * from public.eventos_analitica where creado_en>=desde),
 filas as (select tipo,case when tipo='pagina' then ruta else detalle end as detalle,count(*) as cantidad from recientes group by 1,2
 union all select 'campana',campana,count(*) from recientes where tipo='pagina' and campana<>'' group by campana),
 diario as (select (creado_en at time zone 'America/Costa_Rica')::date::text as fecha,count(distinct sesion) as visitas,count(*) as paginas from recientes where tipo='pagina' group by 1),
 dispositivos as (select dispositivo as detalle,count(distinct sesion) as cantidad from recientes where tipo='pagina' group by 1),
 idiomas as (select idioma as detalle,count(distinct sesion) as cantidad from recientes where tipo='pagina' group by 1)
 select jsonb_build_object('total',(select count(*) from recientes),'sesiones',(select count(distinct sesion) from recientes),
 'visitantes',(select count(distinct coalesce(visitante,sesion)) from recientes),
 'filas',coalesce((select jsonb_agg(to_jsonb(f) order by cantidad desc) from filas f),'[]'::jsonb),
 'diario',coalesce((select jsonb_agg(to_jsonb(d) order by fecha) from diario d),'[]'::jsonb),
 'dispositivos',coalesce((select jsonb_agg(to_jsonb(d) order by cantidad desc) from dispositivos d),'[]'::jsonb),
 'idiomas',coalesce((select jsonb_agg(to_jsonb(i) order by cantidad desc) from idiomas i),'[]'::jsonb)) into resultado;
 -- Counts only; customer identifiers, emails and metadata never leave this RPC.
 select jsonb_build_object('total',count(*),'nuevos',count(*) filter(where u.created_at>=desde),
 'activos',count(*) filter(where u.last_sign_in_at>=desde)) into clientes from auth.users u
 where u.deleted_at is null and not exists(select 1 from public.perfiles p where p.id=u.id and p.rol='administrador');
 with pedidos as (
 select estado,coalesce(total_cobrar,total_productos+costo_envio,total_productos) as total from public.pedidos_manuales where creado_en>=desde and entorno='produccion'
 union all select estado,total from public.pedidos_tilopay where creado_en>=desde and entorno='produccion'
 ) select jsonb_build_object('total',count(*),'pagados',count(*) filter(where estado='pagado'),
 'pendientes',count(*) filter(where estado in ('revision','pendiente_pago','comprobante_recibido','iniciado','pendiente')),
 'ingresos',coalesce(sum(total) filter(where estado='pagado'),0),'promedio',coalesce(avg(total) filter(where estado='pagado'),0)) into compras from pedidos;
 return resultado||jsonb_build_object('clientes',clientes,'compras',compras);
end;$$;
alter table public.solicitudes_empresas drop constraint solicitudes_empresas_estado_check;
alter table public.solicitudes_empresas add constraint solicitudes_empresas_estado_check check(estado in ('recibida','notificando','notificada','archivada'));
alter table public.solicitudes_empresas add column intentos integer not null default 0,add column reservado_en timestamptz,add column proximo_en timestamptz not null default now();
create function public.reservar_solicitud_empresa(identificador uuid) returns setof public.solicitudes_empresas language sql security definer set search_path='' as $$
 update public.solicitudes_empresas set estado='notificando',reservado_en=now(),intentos=intentos+1 where id=identificador and intentos<5 and proximo_en<=now() and (estado='recibida' or estado='notificando' and reservado_en<now()-interval '10 minutes') returning *;
$$;
revoke all on function public.reservar_solicitud_empresa(uuid) from public,anon,authenticated;
grant execute on function public.reservar_solicitud_empresa(uuid) to service_role;
alter table public.medicion_operaciones add column conversion_registrada boolean not null default false;
create function public.medicion_pagos_pendientes() returns setof public.medicion_operaciones language sql stable security definer set search_path='' as $$
 select m.* from public.medicion_operaciones m where not m.excluir and not m.conversion_registrada and m.tipo in ('manual','tarjeta') and m.creado_en>now()-interval '30 days' and
 (m.tipo='manual' and exists(select 1 from public.pedidos_manuales p where p.id=m.operacion and p.estado='pagado' and p.entorno='produccion') or m.tipo='tarjeta' and exists(select 1 from public.pedidos_tilopay p where p.id=m.operacion and p.estado='pagado' and p.entorno='produccion')) order by m.creado_en limit 8;
$$;
revoke all on function public.medicion_pagos_pendientes() from public,anon,authenticated;
grant execute on function public.medicion_pagos_pendientes() to service_role;

create or replace function public.popularidad_productos_panel(dias integer default 30) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare desde date;vistas jsonb;compras jsonb;
begin
 if not public.es_administrador_activo() then raise exception 'forbidden'; end if;
 if dias is null or dias not in (7,30) then raise exception 'invalid_period'; end if;
 desde:=(now() at time zone 'America/Costa_Rica')::date-(dias-1);
 select coalesce(jsonb_agg(to_jsonb(v) order by cantidad desc,id),'[]'::jsonb) into vistas from
 (select producto_id as id,sum(cantidad) as cantidad from public.productos_vistas_diarias where fecha>=desde group by producto_id) v;
 with pedidos as (
 select 'manual-'||id::text as pedido,articulos from public.pedidos_manuales where estado='pagado' and entorno='produccion' and creado_en>=desde::timestamp at time zone 'America/Costa_Rica'
 union all select 'tarjeta-'||id::text,articulos from public.pedidos_tilopay where estado='pagado' and entorno='produccion' and creado_en>=desde::timestamp at time zone 'America/Costa_Rica'
 ),lineas as (
 select pedido,a->>'id' as id,a->>'nombre' as nombre,case when a->>'cantidad' ~ '^[1-9][0-9]?$' then (a->>'cantidad')::integer else 0 end as cantidad
 from pedidos cross join lateral jsonb_array_elements(articulos) a
 ),totales as (
 select id,max(nombre) as nombre,sum(cantidad) as cantidad,count(distinct pedido) as pedidos from lineas
 where id ~ '^[a-z0-9-]{1,60}$' and cantidad>0 group by id
 ) select coalesce(jsonb_agg(to_jsonb(t) order by cantidad desc,id),'[]'::jsonb) into compras from totales t;
 return jsonb_build_object('vistas',vistas,'compras',compras);
end;$$;
