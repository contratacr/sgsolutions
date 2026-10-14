begin;
create table public.favoritos (
 usuario_id uuid not null references auth.users(id) on delete cascade,
 producto_id text not null check (producto_id ~ '^eurocomp-[a-z0-9-]{1,60}$'),
 creado_en timestamptz not null default now(),
 primary key(usuario_id,producto_id)
);
alter table public.favoritos enable row level security;
revoke all on public.favoritos from anon, authenticated;
grant select,insert,delete on public.favoritos to authenticated;
create policy favoritos_propios_lectura on public.favoritos for select to authenticated using (usuario_id=auth.uid() and public.cuenta_habilitada());
create policy favoritos_propios_guardar on public.favoritos for insert to authenticated with check (usuario_id=auth.uid() and public.cuenta_habilitada());
create policy favoritos_propios_borrar on public.favoritos for delete to authenticated using (usuario_id=auth.uid() and public.cuenta_habilitada());
commit;
