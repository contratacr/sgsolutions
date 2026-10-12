-- Los roles se guardan en perfiles, nunca en metadatos editables por clientes.
-- La bitácora conserva IDs incluso al eliminar una cuenta.
alter table public.roles_clientes drop constraint roles_clientes_asignado_por_fkey;
alter table public.historial_roles_clientes drop constraint historial_roles_clientes_asignado_por_fkey;
alter table public.historial_roles_clientes drop constraint historial_roles_clientes_usuario_id_fkey;
create table public.estado_cuentas_usuario (
 usuario_id uuid primary key references auth.users(id) on delete cascade,
 estado text not null default 'activo' check(estado in ('activo','bloqueado','eliminando')),
 version bigint not null default 0
);
create table public.gestiones_usuarios (
 id bigint generated always as identity primary key,
 usuario_id uuid not null,
 actor_id uuid not null,
 accion text not null check(accion in ('perfil','correo','recuperacion','confirmacion','rol','bloquear','desbloquear','eliminacion_solicitada','eliminado')),
 creado_en timestamptz not null default now()
);
alter table public.estado_cuentas_usuario enable row level security;
alter table public.gestiones_usuarios enable row level security;
revoke all on public.estado_cuentas_usuario,public.gestiones_usuarios from anon,authenticated;
create or replace function public.es_administrador_activo()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.perfiles p join auth.users u on u.id=p.id
 left join public.estado_cuentas_usuario e on e.usuario_id=u.id
 where p.id=auth.uid() and p.activo and p.rol='administrador'
 and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()) and coalesce(e.estado,'activo')='activo');
$$;

create function public.gestionar_acceso_usuario(usuario uuid,accion text,nuevo_rol text,version_esperada bigint)
returns void language plpgsql security definer set search_path='' as $$
declare anterior text; estado_anterior text; version_actual bigint; correo_verificado boolean; nombre_perfil text;
begin
 -- Serializar promociones/bajas: dos administradores no pueden quitar al último simultáneamente.
 perform pg_advisory_xact_lock(hashtext('sgsolutions:administradores'));
 if not public.es_administrador_activo() then raise exception 'SIN_PERMISO' using errcode='42501'; end if;
 if accion is null or accion not in ('rol','bloquear','desbloquear','eliminar') or version_esperada is null then raise exception 'DATOS_INVALIDOS'; end if;
 select u.email_confirmed_at is not null,left(coalesce(nullif(u.raw_user_meta_data->>'nombre_completo',''),nullif(u.raw_user_meta_data->>'full_name',''),u.email,'Usuario'),150)
 into correo_verificado,nombre_perfil from auth.users u where u.id=usuario and u.deleted_at is null for update;
 if not found then raise exception 'USUARIO_NO_EXISTE'; end if;
 select coalesce((select case when activo then rol::text else 'sin_acceso' end from public.perfiles where id=usuario),'sin_acceso') into anterior;
 select coalesce((select estado from public.estado_cuentas_usuario where usuario_id=usuario),'activo'),coalesce((select version from public.estado_cuentas_usuario where usuario_id=usuario),0) into estado_anterior,version_actual;
 if version_actual<>version_esperada then raise exception 'CONFLICTO'; end if;
 if accion='rol' and (nuevo_rol is null or nuevo_rol not in ('sin_acceso','administrador')) then raise exception 'DATOS_INVALIDOS'; end if;
 if usuario=auth.uid() and (accion in ('bloquear','eliminar') or (accion='rol' and nuevo_rol<>'administrador')) then raise exception 'PROPIA_CUENTA'; end if;
 if anterior='administrador' and (accion in ('bloquear','eliminar') or (accion='rol' and nuevo_rol<>'administrador'))
 and (select count(*) from public.perfiles p join auth.users u on u.id=p.id left join public.estado_cuentas_usuario e on e.usuario_id=p.id where p.activo and p.rol='administrador' and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()) and coalesce(e.estado,'activo')='activo')<=1 then raise exception 'ULTIMO_ADMIN'; end if;
 if estado_anterior='eliminando' and accion<>'eliminar' then raise exception 'ELIMINACION_PENDIENTE'; end if;
 if accion='rol' then
  if nuevo_rol<>'sin_acceso' and (estado_anterior<>'activo' or not correo_verificado or exists(select 1 from auth.users where id=usuario and banned_until>now())) then raise exception 'CONFIRMACION_REQUERIDA'; end if;
  if nuevo_rol='sin_acceso' then update public.perfiles set activo=false where id=usuario;
  else insert into public.perfiles(id,nombre,rol,activo) values(usuario,nombre_perfil,nuevo_rol::public.rol_equipo,true)
   on conflict(id) do update set rol=excluded.rol,activo=true; end if;
 elsif accion in ('bloquear','eliminar') then
  update public.perfiles set activo=false where id=usuario;
 end if;
 insert into public.estado_cuentas_usuario(usuario_id,estado,version) values(usuario,case when accion='bloquear' then 'bloqueado' when accion='eliminar' then 'eliminando' when accion='desbloquear' then 'activo' else estado_anterior end,version_actual+1)
 on conflict(usuario_id) do update set estado=excluded.estado,version=excluded.version;
 insert into public.gestiones_usuarios(usuario_id,actor_id,accion) values(usuario,auth.uid(),case when accion='eliminar' then 'eliminacion_solicitada' else accion end);
end;$$;

create function public.registrar_gestion_usuario(usuario uuid,accion text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.es_administrador_activo() then raise exception 'SIN_PERMISO' using errcode='42501'; end if;
 if accion is null or accion not in ('perfil','correo','recuperacion','confirmacion','eliminado') then raise exception 'DATOS_INVALIDOS'; end if;
 insert into public.gestiones_usuarios(usuario_id,actor_id,accion) values(usuario,auth.uid(),accion);
end;$$;

create function public.historial_gestion_usuario(usuario uuid)
returns table(accion text,creado_en timestamptz,actor text)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.es_administrador_activo() then raise exception 'SIN_PERMISO' using errcode='42501'; end if;
 return query select actividad.accion,actividad.creado_en,actividad.actor from (
  select g.accion,g.creado_en,coalesce(u.raw_user_meta_data->>'nombre_completo',u.email,'') as actor from public.gestiones_usuarios g left join auth.users u on u.id=g.actor_id where g.usuario_id=usuario
  union all
  select 'tipo_cliente'::text,h.creado_en,coalesce(u.raw_user_meta_data->>'nombre_completo',u.email,'') from public.historial_roles_clientes h left join auth.users u on u.id=h.asignado_por where h.usuario_id=usuario
 ) actividad order by actividad.creado_en desc limit 20;
end;$$;

create function public.cuenta_habilitada()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u left join public.estado_cuentas_usuario e on e.usuario_id=u.id where u.id=auth.uid() and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()) and coalesce(e.estado,'activo')='activo');
$$;

create or replace function public.listar_usuarios_panel(busqueda text default '',pagina integer default 1)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare resultado jsonb; filtro text:=left(trim(coalesce(busqueda,'')),150); total bigint;
begin
 if not public.es_administrador_activo() then raise exception 'SIN_PERMISO' using errcode='42501'; end if;
 if pagina is null or pagina<1 or pagina>100000 then raise exception 'DATOS_INVALIDOS'; end if;
 select count(*) into total from auth.users u where u.deleted_at is null and (filtro='' or strpos(lower(coalesce(u.email,'')),lower(filtro))>0 or strpos(lower(coalesce(u.raw_user_meta_data->>'nombre_completo',u.raw_user_meta_data->>'full_name','')),lower(filtro))>0);
 select coalesce(jsonb_agg(fila order by fila.creado_en desc,fila.id),'[]'::jsonb) into resultado from (
 select u.id,u.email as correo,left(coalesce(u.raw_user_meta_data->>'nombre_completo',u.raw_user_meta_data->>'full_name',''),150) as nombre,
 u.created_at as creado_en,u.last_sign_in_at as ultimo_acceso,u.email_confirmed_at is not null as confirmado,
 coalesce(r.rol,'particular') as rol_cliente,p.rol as rol_equipo,p.activo as equipo_activo,
 case when e.estado='eliminando' then 'eliminando' when e.estado='bloqueado' or u.banned_until>now() then 'bloqueado' else 'activo' end as estado_cuenta,
 coalesce(e.version,0) as version_gestion
 from auth.users u left join public.roles_clientes r on r.usuario_id=u.id left join public.perfiles p on p.id=u.id left join public.estado_cuentas_usuario e on e.usuario_id=u.id
 where u.deleted_at is null and (filtro='' or strpos(lower(coalesce(u.email,'')),lower(filtro))>0 or strpos(lower(coalesce(u.raw_user_meta_data->>'nombre_completo',u.raw_user_meta_data->>'full_name','')),lower(filtro))>0)
 order by u.created_at desc,u.id limit 25 offset (pagina-1)*25) fila;
 return jsonb_build_object('usuarios',resultado,'total',total);
end;$$;
revoke all on function public.gestionar_acceso_usuario(uuid,text,text,bigint),public.registrar_gestion_usuario(uuid,text),public.historial_gestion_usuario(uuid),public.cuenta_habilitada() from public,anon;
grant execute on function public.gestionar_acceso_usuario(uuid,text,text,bigint),public.registrar_gestion_usuario(uuid,text),public.historial_gestion_usuario(uuid),public.cuenta_habilitada() to authenticated;

-- Bloquear también el historial frente a sesiones JWT emitidas antes de una baja.
create or replace function public.mis_pedidos()
returns table (id uuid, origen text, creado_en timestamptz, estado text, total numeric, articulos jsonb)
language plpgsql security definer
set search_path = ''
as $$
declare
  usuario uuid;
  correo_verificado text;
begin
  if not public.cuenta_habilitada() then return; end if;
  select u.id, lower(btrim(u.email)) into usuario, correo_verificado
  from auth.users u
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null and u.email is not null;
  if usuario is null then return; end if;

  update public.pedidos_manuales p set cliente_usuario_id = usuario
  where p.cliente_usuario_id is null and lower(btrim(p.cliente ->> 'correo')) = correo_verificado;
  update public.pedidos_tilopay p set cliente_usuario_id = usuario
  where p.cliente_usuario_id is null and p.entorno = 'produccion' and lower(btrim(p.cliente ->> 'correo')) = correo_verificado;

  return query
    select historial.* from (
    select p.id, 'manual'::text, p.creado_en, p.estado, p.total_cobrar, p.articulos
    from public.pedidos_manuales p where p.cliente_usuario_id = usuario
    union all
    select p.id, 'tarjeta'::text, p.creado_en, p.estado, p.total, p.articulos
    from public.pedidos_tilopay p where p.cliente_usuario_id = usuario and p.entorno = 'produccion'
    ) historial order by historial.creado_en desc limit 100;
end;
$$;
revoke all on function public.mis_pedidos() from public, anon;
grant execute on function public.mis_pedidos() to authenticated;
