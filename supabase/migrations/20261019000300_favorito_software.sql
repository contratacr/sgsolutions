begin;
-- Preserve existing favorites and permissions; allow only the reviewed software SKU.
alter table public.favoritos drop constraint favoritos_producto_id_check;
alter table public.favoritos add constraint favoritos_producto_id_check
 check (producto_id ~ '^((eurocomp|empresa-intcomex)-[a-z0-9-]{1,60}|software-intcomex-se027mse92)$');
commit;
