-- Base de identidad. No habilita cuentas ni concede autoasignación de roles.
create type public.rol_equipo as enum ('administrador', 'comercial');

create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null check (length(nombre) between 1 and 150),
  rol public.rol_equipo not null default 'comercial',
  activo boolean not null default false,
  creado_en timestamptz not null default now()
);

alter table public.perfiles enable row level security;
revoke all on public.perfiles from anon, authenticated;
grant select on public.perfiles to authenticated;

create function public.es_administrador_activo()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and activo and rol = 'administrador'
  );
$$;
revoke all on function public.es_administrador_activo() from public;
grant execute on function public.es_administrador_activo() to authenticated;

create policy leer_perfil_propio_o_equipo on public.perfiles
for select to authenticated
using (id = (select auth.uid()) or (select public.es_administrador_activo()));

-- Sin políticas de escritura: altas/cambios solo mediante administración autorizada.
-- El panel además exige activo=true. No hay registro público ni datos de demostración.
