create or replace function public.registrar_evento(evento jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 -- Defense in depth: administrative accounts never create navigation events.
 if exists(select 1 from public.perfiles where id=auth.uid() and rol='administrador') then return; end if;
 if pg_column_size(evento)>2048 then raise exception 'invalid_event'; end if;
 perform pg_advisory_xact_lock(hashtext(evento->>'sesion'));
 if (select count(*) from public.eventos_analitica where sesion=(evento->>'sesion')::uuid and creado_en>now()-interval '1 minute')>=120 then raise exception 'rate_limit'; end if;
 insert into public.eventos_analitica(id,sesion,visitante,tipo,ruta,detalle,dispositivo,idioma,campana)
 values((evento->>'id')::uuid,(evento->>'sesion')::uuid,(evento->>'visitante')::uuid,evento->>'tipo',evento->>'ruta',evento->>'detalle',evento->>'dispositivo',evento->>'idioma',evento->>'campana') on conflict(id) do nothing;
 delete from public.eventos_analitica where creado_en<now()-interval '30 days';
end;$$;
revoke all on function public.registrar_evento(jsonb) from public;
grant execute on function public.registrar_evento(jsonb) to anon,authenticated;

