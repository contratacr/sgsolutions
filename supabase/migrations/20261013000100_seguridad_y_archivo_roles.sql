-- Archivo reversible de la segmentación comercial retirada. Auth sigue siendo
-- la única fuente de identidad; no duplicar correos/contraseñas en public.
create schema if not exists sg_archivo;
revoke all on schema sg_archivo from public,anon,authenticated;
alter table public.roles_clientes set schema sg_archivo;
alter table public.historial_roles_clientes set schema sg_archivo;
revoke all on all tables in schema sg_archivo from public,anon,authenticated;
-- Conservar la definición para reversión, sin exponer la RPC antigua.
alter function public.asignar_rol_cliente(uuid,text,text) set schema sg_archivo;
revoke all on function sg_archivo.asignar_rol_cliente(uuid,text,text) from public,anon,authenticated;
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
 'particular'::text as rol_cliente,p.rol as rol_equipo,p.activo as equipo_activo,
 case when e.estado='eliminando' then 'eliminando' when e.estado='bloqueado' or u.banned_until>now() then 'bloqueado' else 'activo' end as estado_cuenta,
 coalesce(e.version,0) as version_gestion
 from auth.users u left join public.perfiles p on p.id=u.id left join public.estado_cuentas_usuario e on e.usuario_id=u.id
 where u.deleted_at is null and (filtro='' or strpos(lower(coalesce(u.email,'')),lower(filtro))>0 or strpos(lower(coalesce(u.raw_user_meta_data->>'nombre_completo',u.raw_user_meta_data->>'full_name','')),lower(filtro))>0)
 order by u.created_at desc,u.id limit 25 offset (pagina-1)*25) fila;
 return jsonb_build_object('usuarios',resultado,'total',total);
end;$$;
create or replace function public.historial_gestion_usuario(usuario uuid)
returns table(accion text,creado_en timestamptz,actor text)
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.es_administrador_activo() then raise exception 'SIN_PERMISO' using errcode='42501'; end if;
 return query select actividad.accion,actividad.creado_en,actividad.actor from (
  select g.accion,g.creado_en,coalesce(u.raw_user_meta_data->>'nombre_completo',u.email,'') as actor from public.gestiones_usuarios g left join auth.users u on u.id=g.actor_id where g.usuario_id=usuario
  union all
  select 'tipo_cliente'::text,h.creado_en,coalesce(u.raw_user_meta_data->>'nombre_completo',u.email,'') from sg_archivo.historial_roles_clientes h left join auth.users u on u.id=h.asignado_por where h.usuario_id=usuario
 ) actividad order by actividad.creado_en desc limit 20;
end;$$;


-- Un JWT anterior al bloqueo tampoco puede leer o editar datos de compra.
alter policy datos_compra_propios on public.perfiles_compra_clientes
using (usuario_id=(select auth.uid()) and (select public.cuenta_habilitada()))
with check (usuario_id=(select auth.uid()) and (select public.cuenta_habilitada()));
alter policy administradores_suben_imagenes on storage.objects
with check (bucket_id='imagenes-admin' and (select public.es_administrador_activo()));
comment on table public.perfiles is 'Permisos del equipo; no es el registro de clientes. Identidad central: auth.users.';
comment on table public.perfiles_compra_clientes is 'Datos guardados al completar el perfil de compra; una fila opcional por auth.users.id.';

-- Supabase puede haber concedido EXECUTE directamente por privilegios por defecto.
-- Revocar PUBLIC no revoca esos permisos explícitos. Conservar las defensas
-- internas y los permisos autenticados/servidor de cada RPC vigente.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as firma from pg_proc p
 join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prosecdef and p.proname in (
 'es_administrador_activo','guardar_catalogo','guardar_contenido','consultar_eurocomp',
 'guardar_eurocomp','iniciar_eurocomp','iniciar_eurocomp_programado','publicar_eurocomp',
 'sincronizar_catalogo','resumen_analitica','cuenta_habilitada','mis_pedidos',
 'listar_usuarios_panel','gestionar_acceso_usuario','registrar_gestion_usuario',
 'historial_gestion_usuario','desactivar_mi_cuenta') loop
 execute format('revoke all on function %s from public,anon',f.firma);
 end loop;
 for f in select p.oid::regprocedure as firma from pg_proc p
 join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
 and p.proname in ('iniciar_eurocomp_programado','sincronizar_catalogo') loop
 execute format('revoke all on function %s from authenticated',f.firma);
 end loop;
end $$;
