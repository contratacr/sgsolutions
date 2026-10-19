-- Administrators must enroll and verify TOTP. Existing roles and customer access are preserved.
begin;
-- Role-only check is used solely to reach enrollment, not to authorize panel data.
create function public.es_administrador_identificado()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.perfiles p join auth.users u on u.id=p.id
 left join public.estado_cuentas_usuario e on e.usuario_id=u.id
 where p.id=auth.uid() and p.activo and p.rol='administrador'
 and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()) and coalesce(e.estado,'activo')='activo');
$$;
revoke all on function public.es_administrador_identificado() from public,anon;
grant execute on function public.es_administrador_identificado() to authenticated;
-- All existing administrative RPCs/RLS/storage policies already call this function.
-- Require the same live session and verified factor that produced the AAL2 token.
-- Revocation or factor replacement cannot reactivate an old token.
create or replace function public.es_administrador_activo()
returns boolean language sql stable security definer set search_path='' as $$
 select public.es_administrador_identificado()
 and coalesce(auth.jwt()->>'aal','aal1')='aal2'
 and exists(select 1 from auth.sessions s join auth.mfa_factors f on f.id=s.factor_id
 where s.id::text=auth.jwt()->>'session_id' and s.user_id=auth.uid() and s.aal='aal2'
 and (s.not_after is null or s.not_after>now())
 and f.user_id=auth.uid() and f.factor_type='totp' and f.status='verified');
$$;
revoke all on function public.es_administrador_activo() from public,anon;
grant execute on function public.es_administrador_activo() to authenticated;
-- The administrator list receives status only, never factor IDs, QR codes or secrets.
create function public.estado_mfa_administradores() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.es_administrador_activo() then raise exception 'SIN_PERMISO' using errcode='42501';end if;
 return coalesce((select jsonb_object_agg(p.id::text,exists(select 1 from auth.mfa_factors f where f.user_id=p.id and f.factor_type='totp' and f.status='verified')) from public.perfiles p where p.rol='administrador' and p.activo),'{}'::jsonb);
end$$;
revoke all on function public.estado_mfa_administradores() from public,anon;
grant execute on function public.estado_mfa_administradores() to authenticated;
commit;
