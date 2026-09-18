-- Public website photos. Uploading requires an active administrator profile.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('imagenes-admin','imagenes-admin',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "administradores_suben_imagenes" on storage.objects for insert to authenticated
with check (bucket_id='imagenes-admin' and exists (select 1 from public.perfiles where id=auth.uid() and activo=true and rol='administrador'));
