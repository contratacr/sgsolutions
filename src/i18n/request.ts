import { getRequestConfig } from 'next-intl/server';
import {leerContenido} from '@/lib/contenido-servidor';
import {aplicarTexto} from '@/lib/textos-editables';
import { cookies } from 'next/headers';
export default getRequestConfig(async () => {
  const idioma = (await cookies()).get('sg-idioma')?.value === 'en' ? 'en' : 'es';
  const messages=structuredClone((await import(`../../messages/${idioma}.json`)).default);
  const contenido=await leerContenido();
  for(const [clave,valor] of Object.entries(contenido.textos))aplicarTexto(messages,clave,valor[idioma]);
  const numero=contenido.contacto.telefono.slice(-8);messages.Marca.telefono=numero.slice(0,4)+'-'+numero.slice(4);messages.Marca.correo=contenido.contacto.correo;
  return {
    locale: idioma,
    timeZone: 'America/Costa_Rica',
    messages
  };
});
