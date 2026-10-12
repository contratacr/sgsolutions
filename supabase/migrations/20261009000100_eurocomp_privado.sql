-- Supplier data is private and does not change catalogo_publico.
create table public.eurocomp_privado (
 id integer primary key check (id=1),
 catalogo jsonb,
 intento timestamptz,
 token uuid
);
alter table public.eurocomp_privado enable row level security;
revoke all on public.eurocomp_privado from anon, authenticated;
grant select on public.eurocomp_privado to authenticated;
create policy eurocomp_admin on public.eurocomp_privado for select to authenticated using(public.es_administrador_activo());

create function public.iniciar_eurocomp(nuevo_token uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if not public.es_administrador_activo() then raise exception 'SIN_PERMISO'; end if;
 perform pg_advisory_xact_lock(903109);
 if exists(select 1 from public.eurocomp_privado where id=1 and intento > now()-interval '1 hour') then raise exception 'ESPERA'; end if;
 insert into public.eurocomp_privado(id,intento,token) values(1,now(),nuevo_token)
 on conflict(id) do update set intento=excluded.intento,token=excluded.token;
 return true;
end $$;
create function public.guardar_eurocomp(token_esperado uuid,nuevo_catalogo jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.es_administrador_activo() then raise exception 'SIN_PERMISO'; end if;
 if jsonb_typeof(nuevo_catalogo->'articulos') is distinct from 'array' or not (nuevo_catalogo ? 'fecha') then raise exception 'VALIDACION'; end if;
 update public.eurocomp_privado set catalogo=nuevo_catalogo where id=1 and token=token_esperado;
 if not found then raise exception 'CONFLICTO'; end if;
end $$;
revoke all on function public.iniciar_eurocomp(uuid), public.guardar_eurocomp(uuid,jsonb) from public;
grant execute on function public.iniciar_eurocomp(uuid), public.guardar_eurocomp(uuid,jsonb) to authenticated;

-- Only twenty products cross the network. Search and pagination run in PostgreSQL.
create function public.consultar_eurocomp(busqueda text default '',pagina_solicitada integer default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c jsonb; total integer; resultados integer; paginas integer; pagina integer; filas jsonb;
begin
 if not public.es_administrador_activo() then raise exception 'SIN_PERMISO'; end if;
 select catalogo into c from public.eurocomp_privado where id=1;
 if c is null then return null; end if;
 total:=jsonb_array_length(c->'articulos');
 select count(*) into resultados from jsonb_array_elements(c->'articulos') a
 where coalesce(busqueda,'')='' or exists (
  select 1 from unnest(array['codigo','parte','nombre','marca','familia']) campo
  where strpos(lower(coalesce(a->>campo,'')),lower(left(busqueda,150)))>0
 );
 paginas:=greatest(1,ceil(resultados/20.0)::integer);
 pagina:=greatest(1,least(paginas,coalesce(pagina_solicitada,1)));
 select coalesce(jsonb_agg(f.a order by f.orden),'[]'::jsonb) into filas from (
  select a,orden from jsonb_array_elements(c->'articulos') with ordinality as items(a,orden)
  where coalesce(busqueda,'')='' or exists (
   select 1 from unnest(array['codigo','parte','nombre','marca','familia']) campo
   where strpos(lower(coalesce(a->>campo,'')),lower(left(busqueda,150)))>0
  ) order by orden limit 20 offset (pagina-1)*20
 ) f;
 return jsonb_build_object('fecha',c->>'fecha','total',total,'resultados',resultados,'pagina',pagina,'paginas',paginas,'articulos',filas);
end $$;
revoke all on function public.consultar_eurocomp(text,integer) from public;
grant execute on function public.consultar_eurocomp(text,integer) to authenticated;
