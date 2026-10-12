-- Una cuenta puede desactivar únicamente su propio acceso. No elimina pedidos.
create function public.desactivar_mi_cuenta()
returns void language plpgsql security definer set search_path='' as $$
declare usuario uuid:=auth.uid();
begin
 perform pg_advisory_xact_lock(hashtext('sgsolutions:administradores'));
 if usuario is null or not exists(select 1 from auth.users where id=usuario and email_confirmed_at is not null and deleted_at is null) then
  raise exception 'SIN_SESION' using errcode='42501';
 end if;
 if exists(select 1 from public.perfiles where id=usuario and activo and rol='administrador') then
  raise exception 'ADMIN_PROTEGIDO' using errcode='42501';
 end if;
 if not exists(select 1 from auth.users where id=usuario and last_sign_in_at>=now()-interval '15 minutes') then
  raise exception 'REAUTENTICAR' using errcode='42501';
 end if;
 if not public.cuenta_habilitada() then raise exception 'SIN_SESION' using errcode='42501'; end if;
 insert into public.estado_cuentas_usuario(usuario_id,estado,version) values(usuario,'bloqueado',1)
 on conflict(usuario_id) do update set estado='bloqueado',version=public.estado_cuentas_usuario.version+1;
 insert into public.gestiones_usuarios(usuario_id,actor_id,accion) values(usuario,usuario,'bloquear');
end;
$$;
revoke all on function public.desactivar_mi_cuenta() from public,anon;
grant execute on function public.desactivar_mi_cuenta() to authenticated;
