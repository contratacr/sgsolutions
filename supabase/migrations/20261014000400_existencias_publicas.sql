-- Publish only supplier availability; keep costs and supplier metadata private.
update public.catalogo_publico as publico
set contenido = jsonb_set(publico.contenido, '{productos}', coalesce((
 select jsonb_agg(producto || jsonb_build_object('stockDisponible', (
  select case when jsonb_typeof(privado_producto->'eurocomp'->'stock') = 'number'
    then privado_producto->'eurocomp'->'stock' else 'null'::jsonb end
  from public.catalogo_privado as privado,
       jsonb_array_elements(privado.contenido->'productos') as privado_producto
  where privado.id = publico.id and privado_producto->>'id' = producto->>'id'
  limit 1
 )))
 from jsonb_array_elements(publico.contenido->'productos') as producto
), '[]'::jsonb));
