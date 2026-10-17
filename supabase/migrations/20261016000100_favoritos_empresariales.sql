begin;
-- Extend product identities only; ownership and account-enabled RLS stay unchanged.
alter table public.favoritos drop constraint favoritos_producto_id_check;
alter table public.favoritos add constraint favoritos_producto_id_check
 check (producto_id ~ '^(eurocomp|empresa-intcomex)-[a-z0-9-]{1,60}$');
commit;
