-- Segmentación comercial; nunca concede permisos del equipo administrativo.
create table public.roles_clientes (
 usuario_id uuid primary key references auth.users(id) on delete cascade,
 rol text not null check (rol in ('particular','empresa')),
 asignado_por uuid not null references auth.users(id),
 actualizado_en timestamptz not null default now()
);
create table public.historial_roles_clientes (
 id bigint generated always as identity primary key,
 usuario_id uuid not null references auth.users(id) on delete cascade,
 rol_anterior text not null,
 rol_nuevo text not null,
 asignado_por uuid not null references auth.users(id),
 creado_en timestamptz not null default now()
);
alter table public.roles_clientes enable row level security;
alter table public.historial_roles_clientes enable row level security;
revoke all on public.roles_clientes,public.historial_roles_clientes from anon,authenticated;

create function public.listar_usuarios_panel(busqueda text default '', pagina integer default 1)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare resultado jsonb; filtro text := left(trim(coalesce(busqueda,'')),150); total bigint;
begin
 if not public.es_administrador_activo() then raise exception 'SIN_PERMISO' using errcode='42501'; end if;
 if pagina is null or pagina<1 or pagina>100000 then raise exception 'DATOS_INVALIDOS'; end if;
 select count(*) into total from auth.users u
 where filtro='' or strpos(lower(coalesce(u.email,'')),lower(filtro))>0
 or strpos(lower(coalesce(u.raw_user_meta_data->>'nombre_completo',u.raw_user_meta_data->>'full_name','')),lower(filtro))>0;
 select coalesce(jsonb_agg(fila order by fila.creado_en desc,fila.id),'[]'::jsonb) into resultado from (
  select u.id,u.email as correo,
   left(coalesce(u.raw_user_meta_data->>'nombre_completo',u.raw_user_meta_data->>'full_name',''),150) as nombre,
   u.created_at as creado_en,u.last_sign_in_at as ultimo_acceso,
   u.email_confirmed_at is not null as confirmado,
   coalesce(r.rol,'particular') as rol_cliente,
   p.rol as rol_equipo,p.activo as equipo_activo
  from auth.users u left join public.roles_clientes r on r.usuario_id=u.id left join public.perfiles p on p.id=u.id
  where filtro='' or strpos(lower(coalesce(u.email,'')),lower(filtro))>0
   or strpos(lower(coalesce(u.raw_user_meta_data->>'nombre_completo',u.raw_user_meta_data->>'full_name','')),lower(filtro))>0
  order by u.created_at desc,u.id limit 25 offset (pagina-1)*25
 ) fila;
 return jsonb_build_object('usuarios',resultado,'total',total);
end;$$;

create function public.asignar_rol_cliente(usuario uuid,nuevo_rol text,rol_esperado text)
returns void language plpgsql security definer set search_path='' as $$
declare anterior text;
begin
 if not public.es_administrador_activo() then raise exception 'SIN_PERMISO' using errcode='42501'; end if;
 if nuevo_rol is null or rol_esperado is null or nuevo_rol not in ('particular','empresa') or rol_esperado not in ('particular','empresa') then raise exception 'DATOS_INVALIDOS'; end if;
 -- Bloquear incluso la primera asignación, cuando todavía no hay fila comercial.
 perform 1 from auth.users where id=usuario for update;
 if not found then raise exception 'USUARIO_NO_EXISTE'; end if;
 select coalesce((select rol from public.roles_clientes where usuario_id=usuario),'particular') into anterior;
 if anterior<>rol_esperado then raise exception 'CONFLICTO'; end if;
 if anterior=nuevo_rol then return; end if;
 insert into public.roles_clientes(usuario_id,rol,asignado_por) values(usuario,nuevo_rol,auth.uid())
 on conflict(usuario_id) do update set rol=excluded.rol,asignado_por=excluded.asignado_por,actualizado_en=now();
 insert into public.historial_roles_clientes(usuario_id,rol_anterior,rol_nuevo,asignado_por)
 values(usuario,anterior,nuevo_rol,auth.uid());
end;$$;
revoke all on function public.listar_usuarios_panel(text,integer),public.asignar_rol_cliente(uuid,text,text) from public,anon;
grant execute on function public.listar_usuarios_panel(text,integer),public.asignar_rol_cliente(uuid,text,text) to authenticated;
