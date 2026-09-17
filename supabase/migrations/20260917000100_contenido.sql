-- Costos y política comercial solo para administradores activos.
create table public.contenido_privado(id integer primary key check(id=1), contenido jsonb not null, revision integer not null default 1);
create table public.contenido_publico(id integer primary key check(id=1), contenido jsonb not null);
alter table public.contenido_privado enable row level security;
alter table public.contenido_publico enable row level security;
revoke all on public.contenido_privado,public.contenido_publico from anon,authenticated;
grant select on public.contenido_privado to authenticated;
grant select on public.contenido_publico to anon,authenticated;
create policy contenido_admin on public.contenido_privado for select to authenticated using(public.es_administrador_activo());
create policy contenido_visible on public.contenido_publico for select to anon,authenticated using(true);
-- Transacción única y control de revisión: evita perder cambios de otro administrador.
create function public.guardar_contenido(privado jsonb, visible jsonb, revision_esperada integer) returns integer
language plpgsql security definer set search_path='' as $$
declare actual integer;
begin
 if not public.es_administrador_activo() then raise exception 'SIN_PERMISO'; end if;
 perform pg_advisory_xact_lock(903108);
 select revision into actual from public.contenido_privado where id=1;
 if coalesce(actual,0) <> revision_esperada then raise exception 'CONFLICTO'; end if;
 insert into public.contenido_privado values(1,privado,coalesce(actual,0)+1) on conflict(id) do update set contenido=excluded.contenido,revision=excluded.revision;
 insert into public.contenido_publico values(1,visible) on conflict(id) do update set contenido=excluded.contenido;
 return coalesce(actual,0)+1;
end $$;
revoke all on function public.guardar_contenido(jsonb,jsonb,integer) from public;
grant execute on function public.guardar_contenido(jsonb,jsonb,integer) to authenticated;
