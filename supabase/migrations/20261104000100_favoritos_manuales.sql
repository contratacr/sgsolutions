-- Keep account ownership policies; allow explicit manual product identifiers.
begin;
alter table public.favoritos drop constraint favoritos_producto_id_check;
alter table public.favoritos add constraint favoritos_producto_id_check
 check (producto_id ~ '^((eurocomp|empresa-intcomex)-[a-z0-9-]{1,60}|manual-[a-z0-9-]{1,52}|software-intcomex-se027mse92)$');
commit;
