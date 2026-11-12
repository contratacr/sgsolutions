-- Usuarios del panel: filtro opcional por acceso o estado de la cuenta. No cambia datos ni permisos.
-- La firma anterior (busqueda,pagina) se reemplaza; el nuevo parámetro tiene valor por defecto,
-- así que las llamadas existentes siguen funcionando igual.
-- Idempotente: puede ejecutarse de nuevo (por ejemplo desde el SQL Editor y luego con db push) sin error.
drop function if exists public.listar_usuarios_panel(text,integer);
create or replace function public.listar_usuarios_panel(busqueda text default '',pagina integer default 1,filtro text default 'todos')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare resultado jsonb; texto text:=lower(left(trim(coalesce(busqueda,'')),150)); vista text:=coalesce(filtro,'todos'); total bigint;
begin
 if not public.es_administrador_activo() then raise exception 'SIN_PERMISO' using errcode='42501'; end if;
 if pagina is null or pagina<1 or pagina>100000 or vista not in ('todos','administradores','clientes','bloqueados','sin_confirmar') then raise exception 'DATOS_INVALIDOS'; end if;
 with fila as (
  select u.id,u.email as correo,left(coalesce(u.raw_user_meta_data->>'nombre_completo',u.raw_user_meta_data->>'full_name',''),150) as nombre,
  u.created_at as creado_en,u.last_sign_in_at as ultimo_acceso,u.email_confirmed_at is not null as confirmado,
  'particular'::text as rol_cliente,p.rol as rol_equipo,p.activo as equipo_activo,
  case when e.estado='eliminando' then 'eliminando' when e.estado='bloqueado' or u.banned_until>now() then 'bloqueado' else 'activo' end as estado_cuenta,
  coalesce(e.version,0) as version_gestion
  from auth.users u left join public.perfiles p on p.id=u.id left join public.estado_cuentas_usuario e on e.usuario_id=u.id
  where u.deleted_at is null and (texto='' or strpos(lower(coalesce(u.email,'')),texto)>0 or strpos(lower(coalesce(u.raw_user_meta_data->>'nombre_completo',u.raw_user_meta_data->>'full_name','')),texto)>0)
 ), filtradas as (
  select * from fila where vista='todos'
  or vista='administradores' and fila.rol_equipo='administrador' and fila.equipo_activo is true
  or vista='clientes' and not (fila.rol_equipo is not distinct from 'administrador' and fila.equipo_activo is true)
  or vista='bloqueados' and fila.estado_cuenta<>'activo'
  or vista='sin_confirmar' and not fila.confirmado
 )
 select (select count(*) from filtradas),
  (select coalesce(jsonb_agg(pagina_filas order by pagina_filas.creado_en desc,pagina_filas.id),'[]'::jsonb)
   from (select * from filtradas order by filtradas.creado_en desc,filtradas.id limit 25 offset (pagina-1)*25) pagina_filas)
 into total,resultado;
 return jsonb_build_object('usuarios',resultado,'total',total);
end;$$;
revoke all on function public.listar_usuarios_panel(text,integer,text) from public,anon;
grant execute on function public.listar_usuarios_panel(text,integer,text) to authenticated;
notify pgrst,'reload schema';
