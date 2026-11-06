begin;
-- Extend the allowed campaign sources without modifying historical contacts or grants.
alter table public.contactos_comerciales
 drop constraint contactos_comerciales_fuente_check;
alter table public.contactos_comerciales
 add constraint contactos_comerciales_fuente_check
 check (fuente in ('sin_confirmar','sitio','sg_video_20261023','sg_ventas_tienda_20261028','sg_lenovo_82xm_20261105','otro'));
commit;
