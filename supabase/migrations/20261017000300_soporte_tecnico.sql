-- Native adaptation of the supplied published .NET support model.
-- No credentials, user/password seeds or legacy SQL Server scripts are imported.
create table public.soporte_empresas (id uuid primary key default gen_random_uuid(), numero bigint generated always as identity, version integer not null default 1, archivado boolean not null default false, creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), razon_social text not null check(length(razon_social) between 2 and 150),identificacion text not null unique check(length(identificacion) between 3 and 30),telefono text not null default '' check(length(telefono)<=30),correo text not null default '' check(length(correo)<=254),direccion text not null default '' check(length(direccion)<=200));
alter table public.soporte_empresas enable row level security;
revoke all on public.soporte_empresas from anon,authenticated;
grant select on public.soporte_empresas to authenticated;
create policy solo_admin on public.soporte_empresas for select to authenticated using ((select public.es_administrador_activo()));
create index on public.soporte_empresas(archivado,actualizado_en desc);
create table public.soporte_equipos (id uuid primary key default gen_random_uuid(), numero bigint generated always as identity, version integer not null default 1, archivado boolean not null default false, creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), nombre text not null check(length(nombre) between 2 and 100),tipo text not null check(length(tipo) between 2 and 50),marca text not null default '' check(length(marca)<=80),modelo text not null default '' check(length(modelo)<=80),numero_serie text not null unique check(length(numero_serie) between 1 and 100),estado text not null check(estado in ('operativo','mantenimiento','fuera_servicio')),empresa_id uuid references public.soporte_empresas(id),cliente_nombre text not null default '' check(length(cliente_nombre)<=150), check ((empresa_id is not null) <> (length(trim(cliente_nombre))>0)));
alter table public.soporte_equipos enable row level security;
revoke all on public.soporte_equipos from anon,authenticated;
grant select on public.soporte_equipos to authenticated;
create policy solo_admin on public.soporte_equipos for select to authenticated using ((select public.es_administrador_activo()));
create index on public.soporte_equipos(archivado,actualizado_en desc);
create table public.soporte_tickets (id uuid primary key default gen_random_uuid(), numero bigint generated always as identity, version integer not null default 1, archivado boolean not null default false, creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), asunto text not null check(length(asunto) between 3 and 150),descripcion text not null check(length(descripcion) between 5 and 2000),categoria text not null default '' check(length(categoria)<=50),prioridad text not null check(prioridad in ('baja','media','alta')),estado text not null check(estado in ('pendiente','en_proceso','resuelto','cerrado')),solucion text not null default '' check(length(solucion)<=2000),empresa_id uuid references public.soporte_empresas(id),equipo_id uuid references public.soporte_equipos(id),tecnico_id uuid references public.perfiles(id) on delete set null, check(estado not in ('resuelto','cerrado') or length(trim(solucion))>=5));
alter table public.soporte_tickets enable row level security;
revoke all on public.soporte_tickets from anon,authenticated;
grant select on public.soporte_tickets to authenticated;
create policy solo_admin on public.soporte_tickets for select to authenticated using ((select public.es_administrador_activo()));
create index on public.soporte_tickets(archivado,actualizado_en desc);
create table public.soporte_mantenimientos (id uuid primary key default gen_random_uuid(), numero bigint generated always as identity, version integer not null default 1, archivado boolean not null default false, creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), equipo_id uuid not null references public.soporte_equipos(id),ticket_id uuid references public.soporte_tickets(id),tecnico_id uuid references public.perfiles(id) on delete set null,tipo text not null check(tipo in ('preventivo','correctivo')),fecha date not null check(fecha between '2000-01-01' and '2100-12-31'),descripcion text not null check(length(descripcion) between 5 and 1000),observaciones text not null default '' check(length(observaciones)<=1000),completado boolean not null);
alter table public.soporte_mantenimientos enable row level security;
revoke all on public.soporte_mantenimientos from anon,authenticated;
grant select on public.soporte_mantenimientos to authenticated;
create policy solo_admin on public.soporte_mantenimientos for select to authenticated using ((select public.es_administrador_activo()));
create index on public.soporte_mantenimientos(archivado,actualizado_en desc);

create table public.soporte_historial (
 id bigint generated always as identity primary key, entidad text not null,
 registro_id uuid not null, accion text not null, version integer not null,
 actor uuid references auth.users(id) on delete set null, fecha timestamptz not null default now()
);
alter table public.soporte_historial enable row level security;
revoke all on public.soporte_historial from anon,authenticated;
grant select on public.soporte_historial to authenticated;
create policy solo_admin on public.soporte_historial for select to authenticated using ((select public.es_administrador_activo()));
create index on public.soporte_historial(registro_id,fecha desc);

create function public.validar_relaciones_soporte() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_table_name='soporte_equipos' then
  if tg_op='UPDATE' and new.empresa_id is not distinct from old.empresa_id then return new; end if;
 else
  if tg_op='UPDATE' and new.empresa_id is not distinct from old.empresa_id and new.equipo_id is not distinct from old.equipo_id then return new; end if;
  if new.equipo_id is not null then
   if not exists(select 1 from public.soporte_equipos where id=new.equipo_id and not archivado and empresa_id is not distinct from new.empresa_id) then raise exception 'RELACION_INVALIDA'; end if;
  end if;
 end if;
 if new.empresa_id is not null and not exists(select 1 from public.soporte_empresas where id=new.empresa_id and not archivado) then raise exception 'RELACION_INVALIDA'; end if;
 return new;
end $$;
create trigger relaciones before insert or update on public.soporte_equipos for each row execute function public.validar_relaciones_soporte();
create trigger relaciones before insert or update on public.soporte_tickets for each row execute function public.validar_relaciones_soporte();

create function public.validar_mantenimiento_soporte() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' and new.equipo_id=old.equipo_id and new.ticket_id is not distinct from old.ticket_id then return new; end if;
 if not exists(select 1 from public.soporte_equipos where id=new.equipo_id and not archivado) then raise exception 'RELACION_INVALIDA'; end if;
 if new.ticket_id is not null and not exists(select 1 from public.soporte_tickets where id=new.ticket_id and equipo_id=new.equipo_id and not archivado) then raise exception 'RELACION_INVALIDA'; end if;
 return new;
end $$;
create trigger relaciones before insert or update on public.soporte_mantenimientos for each row execute function public.validar_mantenimiento_soporte();

create function public.auditar_soporte() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.soporte_historial(entidad,registro_id,accion,version,actor)
 values (replace(tg_table_name,'soporte_',''),new.id,case when tg_op='INSERT' then 'creado' when new.archivado is distinct from old.archivado then case when new.archivado then 'archivado' else 'restaurado' end else 'actualizado' end,new.version,auth.uid());
 return new;
end $$;
create trigger historial after insert or update on public.soporte_empresas for each row execute function public.auditar_soporte();
create trigger historial after insert or update on public.soporte_equipos for each row execute function public.auditar_soporte();
create trigger historial after insert or update on public.soporte_tickets for each row execute function public.auditar_soporte();
create trigger historial after insert or update on public.soporte_mantenimientos for each row execute function public.auditar_soporte();

create function public.guardar_soporte(entidad text,datos jsonb,registro uuid default null,version_esperada integer default 0)
returns uuid language plpgsql security definer set search_path='' as $$
declare resultado uuid; campos text[];
begin
 if not public.es_administrador_activo() then raise exception 'SIN_PERMISO' using errcode='42501'; end if;
 if jsonb_typeof(datos) is distinct from 'object' or octet_length(datos::text)>12000 then raise exception 'VALIDACION'; end if;
 case entidad
when 'empresas' then campos:=array['razon_social','identificacion','telefono','correo','direccion'];
when 'equipos' then campos:=array['nombre','tipo','marca','modelo','numero_serie','estado','empresa_id','cliente_nombre'];
when 'tickets' then campos:=array['asunto','descripcion','categoria','prioridad','estado','solucion','empresa_id','equipo_id','tecnico_id'];
when 'mantenimientos' then campos:=array['equipo_id','ticket_id','tecnico_id','tipo','fecha','descripcion','observaciones','completado'];
else raise exception 'VALIDACION'; end case;
 if exists(select 1 from jsonb_object_keys(datos) k where not(k=any(campos))) or (select count(*) from jsonb_object_keys(datos))<>cardinality(campos) then raise exception 'VALIDACION'; end if;
if datos->>'tecnico_id' is not null and not exists(select 1 from public.perfiles where id=(datos->>'tecnico_id')::uuid and rol='administrador' and activo) then raise exception 'RELACION_INVALIDA'; end if;
 if registro is null and version_esperada<>0 then raise exception 'CONFLICTO'; end if;
 case entidad
when 'empresas' then
 if registro is null then insert into public.soporte_empresas (razon_social,identificacion,telefono,correo,direccion) select razon_social,identificacion,telefono,correo,direccion from jsonb_populate_record(null::public.soporte_empresas,datos) returning id into resultado;
 else update public.soporte_empresas t set razon_social=d.razon_social,identificacion=d.identificacion,telefono=d.telefono,correo=d.correo,direccion=d.direccion,version=t.version+1,actualizado_en=now() from jsonb_populate_record(null::public.soporte_empresas,datos) d where t.id=registro and t.version=version_esperada and not t.archivado returning t.id into resultado; end if;
when 'equipos' then
 if registro is null then insert into public.soporte_equipos (nombre,tipo,marca,modelo,numero_serie,estado,empresa_id,cliente_nombre) select nombre,tipo,marca,modelo,numero_serie,estado,empresa_id,cliente_nombre from jsonb_populate_record(null::public.soporte_equipos,datos) returning id into resultado;
 else update public.soporte_equipos t set nombre=d.nombre,tipo=d.tipo,marca=d.marca,modelo=d.modelo,numero_serie=d.numero_serie,estado=d.estado,empresa_id=d.empresa_id,cliente_nombre=d.cliente_nombre,version=t.version+1,actualizado_en=now() from jsonb_populate_record(null::public.soporte_equipos,datos) d where t.id=registro and t.version=version_esperada and not t.archivado returning t.id into resultado; end if;
when 'tickets' then
 if registro is null then insert into public.soporte_tickets (asunto,descripcion,categoria,prioridad,estado,solucion,empresa_id,equipo_id,tecnico_id) select asunto,descripcion,categoria,prioridad,estado,solucion,empresa_id,equipo_id,tecnico_id from jsonb_populate_record(null::public.soporte_tickets,datos) returning id into resultado;
 else update public.soporte_tickets t set asunto=d.asunto,descripcion=d.descripcion,categoria=d.categoria,prioridad=d.prioridad,estado=d.estado,solucion=d.solucion,empresa_id=d.empresa_id,equipo_id=d.equipo_id,tecnico_id=d.tecnico_id,version=t.version+1,actualizado_en=now() from jsonb_populate_record(null::public.soporte_tickets,datos) d where t.id=registro and t.version=version_esperada and not t.archivado returning t.id into resultado; end if;
when 'mantenimientos' then
 if registro is null then insert into public.soporte_mantenimientos (equipo_id,ticket_id,tecnico_id,tipo,fecha,descripcion,observaciones,completado) select equipo_id,ticket_id,tecnico_id,tipo,fecha,descripcion,observaciones,completado from jsonb_populate_record(null::public.soporte_mantenimientos,datos) returning id into resultado;
 else update public.soporte_mantenimientos t set equipo_id=d.equipo_id,ticket_id=d.ticket_id,tecnico_id=d.tecnico_id,tipo=d.tipo,fecha=d.fecha,descripcion=d.descripcion,observaciones=d.observaciones,completado=d.completado,version=t.version+1,actualizado_en=now() from jsonb_populate_record(null::public.soporte_mantenimientos,datos) d where t.id=registro and t.version=version_esperada and not t.archivado returning t.id into resultado; end if;
else raise exception 'VALIDACION'; end case;
 if resultado is null then raise exception 'CONFLICTO'; end if; return resultado;
end $$;
create function public.archivar_soporte(entidad text,registro uuid,version_esperada integer,archivar boolean)
returns void language plpgsql security definer set search_path='' as $$
declare cantidad integer;
begin
 if not public.es_administrador_activo() then raise exception 'SIN_PERMISO' using errcode='42501'; end if;
 if entidad not in ('empresas','equipos','tickets','mantenimientos') then raise exception 'VALIDACION'; end if;
 execute format('update public.%I set archivado=$1,version=version+1,actualizado_en=now() where id=$2 and version=$3 and archivado is distinct from $1','soporte_'||entidad) using archivar,registro,version_esperada;
 get diagnostics cantidad=row_count;
 if cantidad<>1 then raise exception 'CONFLICTO'; end if;
end $$;
revoke all on function public.guardar_soporte(text,jsonb,uuid,integer),public.archivar_soporte(text,uuid,integer,boolean) from public,anon;
grant execute on function public.guardar_soporte(text,jsonb,uuid,integer),public.archivar_soporte(text,uuid,integer,boolean) to authenticated;
revoke all on function public.auditar_soporte(),public.validar_relaciones_soporte(),public.validar_mantenimiento_soporte() from public,anon,authenticated;

create table public.soporte_adjuntos (
 id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.soporte_tickets(id),
 ruta text not null unique, nombre text not null check(length(nombre) between 1 and 180),
 tipo text not null check(tipo in ('image/jpeg','image/png','image/webp')),
 bytes integer not null check(bytes between 100 and 5242880), creado_en timestamptz not null default now()
);
alter table public.soporte_adjuntos enable row level security;
revoke all on public.soporte_adjuntos from anon,authenticated;
grant select on public.soporte_adjuntos to authenticated;
create policy solo_admin on public.soporte_adjuntos for select to authenticated using ((select public.es_administrador_activo()));
create index on public.soporte_adjuntos(ticket_id);
create function public.registrar_adjunto_soporte(ticket uuid,ruta_archivo text,nombre_archivo text,tipo_archivo text,tamano integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare resultado uuid;
begin
 if not public.es_administrador_activo() then raise exception 'SIN_PERMISO' using errcode='42501'; end if;
 perform 1 from public.soporte_tickets where id=ticket and not archivado for update;
 if not found then raise exception 'RELACION_INVALIDA'; end if;
 if (select count(*) from public.soporte_adjuntos where ticket_id=ticket)>=10 then raise exception 'LIMITE_ADJUNTOS'; end if;
 if ruta_archivo !~ ('^'||ticket::text||'/[a-f0-9-]{36}\.(jpg|png|webp)$') then raise exception 'VALIDACION'; end if;
 if not exists(select 1 from storage.objects where bucket_id='soporte-privado' and name=ruta_archivo) then raise exception 'RELACION_INVALIDA'; end if;
 insert into public.soporte_adjuntos(ticket_id,ruta,nombre,tipo,bytes) values(ticket,ruta_archivo,nombre_archivo,tipo_archivo,tamano) returning id into resultado;
 update public.soporte_tickets set version=version+1,actualizado_en=now() where id=ticket;
 return resultado;
end $$;
revoke all on function public.registrar_adjunto_soporte(uuid,text,text,text,integer) from public,anon;
grant execute on function public.registrar_adjunto_soporte(uuid,text,text,text,integer) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('soporte-privado','soporte-privado',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy soporte_leer on storage.objects for select to authenticated using(bucket_id='soporte-privado' and (select public.es_administrador_activo()));
create policy soporte_subir on storage.objects for insert to authenticated with check(bucket_id='soporte-privado' and (select public.es_administrador_activo()) and exists(select 1 from public.soporte_tickets where id::text=split_part(name,'/',1) and not archivado));
create policy soporte_limpiar on storage.objects for delete to authenticated using(bucket_id='soporte-privado' and (select public.es_administrador_activo()));

create function public.resumen_soporte() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.es_administrador_activo() then raise exception 'SIN_PERMISO' using errcode='42501'; end if;
 return jsonb_build_object(
  'pendientes',(select count(*) from public.soporte_tickets where not archivado and estado='pendiente'),
  'enProceso',(select count(*) from public.soporte_tickets where not archivado and estado='en_proceso'),
  'programados',(select count(*) from public.soporte_mantenimientos where not archivado and not completado),
  'meses',(select coalesce(jsonb_agg(jsonb_build_object('mes',to_char(m,'YYYY-MM'),'cantidad',cantidad) order by m),'[]'::jsonb) from (
   select m,count(t.id) cantidad from generate_series(date_trunc('month',now() at time zone 'America/Costa_Rica')-interval '5 months',date_trunc('month',now() at time zone 'America/Costa_Rica'),interval '1 month') m
   left join public.soporte_tickets t on not t.archivado and date_trunc('month',t.creado_en at time zone 'America/Costa_Rica')=m group by m
  ) mensual)
 );
end $$;
revoke all on function public.resumen_soporte() from public,anon;
grant execute on function public.resumen_soporte() to authenticated;

create unique index soporte_empresa_identificacion_unica on public.soporte_empresas(lower(trim(identificacion)));
create unique index soporte_equipo_serie_unica on public.soporte_equipos(lower(trim(numero_serie)));
