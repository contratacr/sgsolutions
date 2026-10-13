-- Manual refreshes may run between hourly jobs. The shared five-minute
-- cooldown prevents double clicks and overlaps with the 90-second download.
-- The scheduled entry point retains its existing one-hour limit.
create or replace function public.iniciar_eurocomp(nuevo_token uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if not public.es_administrador_activo() then raise exception 'SIN_PERMISO'; end if;
 if nuevo_token is null then raise exception 'VALIDACION'; end if;
 perform pg_advisory_xact_lock(903109);
 if exists(select 1 from public.eurocomp_privado where id=1 and intento > now()-interval '5 minutes') then raise exception 'ESPERA'; end if;
 insert into public.eurocomp_privado(id,intento,token) values(1,now(),nuevo_token)
 on conflict(id) do update set intento=excluded.intento,token=excluded.token;
 return true;
end $$;
revoke all on function public.iniciar_eurocomp(uuid) from public;
grant execute on function public.iniciar_eurocomp(uuid) to authenticated;
