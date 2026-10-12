-- Datos de compra privados, separados de los permisos administrativos.
create table public.perfiles_compra_clientes (
 usuario_id uuid primary key references auth.users(id) on delete cascade,
 datos jsonb not null check(jsonb_typeof(datos)='object' and octet_length(datos::text)<=10000)
);
alter table public.perfiles_compra_clientes enable row level security;
revoke all on public.perfiles_compra_clientes from public,anon;
grant select,insert,update on public.perfiles_compra_clientes to authenticated;
create policy datos_compra_propios on public.perfiles_compra_clientes for all to authenticated
 using(usuario_id=(select auth.uid())) with check(usuario_id=(select auth.uid()));
