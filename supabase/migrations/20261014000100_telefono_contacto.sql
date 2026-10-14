-- Apply the contact-number correction to saved CMS data, preserving WhatsApp/SINPE.
select pg_advisory_xact_lock(903108);
create function pg_temp.corregir_telefono_contacto(c jsonb) returns jsonb language plpgsql as $$
declare textos jsonb;
begin
 if c ? 'contacto' then c:=jsonb_set(c,'{contacto,telefono}',to_jsonb('+50624467846'::text)); end if;
 if c ? 'textos' then
  textos:=replace((c->'textos')::text,'8606-5342','2446-7846')::jsonb;
  textos:=replace(textos::text,'o al +506 2446-7846, también por WhatsApp.','o al +506 2446-7846. También puede escribirnos mediante los botones de WhatsApp.')::jsonb;
  textos:=replace(textos::text,'or +506 2446-7846, also on WhatsApp.','or +506 2446-7846. You can also use our WhatsApp buttons.')::jsonb;
  c:=jsonb_set(c,'{textos}',textos);
 end if;
 return c;
end;$$;
update public.contenido_privado set contenido=pg_temp.corregir_telefono_contacto(contenido),revision=revision+1
where contenido is distinct from pg_temp.corregir_telefono_contacto(contenido);
update public.contenido_publico set contenido=pg_temp.corregir_telefono_contacto(contenido)
where contenido is distinct from pg_temp.corregir_telefono_contacto(contenido);
drop function pg_temp.corregir_telefono_contacto(jsonb);
