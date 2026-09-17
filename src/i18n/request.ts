import { getRequestConfig } from 'next-intl/server';
import {leerContenido} from '@/lib/contenido-servidor';
import { cookies } from 'next/headers';
export default getRequestConfig(async () => {
  const idioma = (await cookies()).get('sg-idioma')?.value === 'en' ? 'en' : 'es';
  const messages=structuredClone((await import(`../../messages/${idioma}.json`)).default);
  const contenido=await leerContenido();
  for(const [clave,valor] of Object.entries(contenido.textos)){const [ns,k]=clave.split('.');if(messages[ns]&&typeof messages[ns][k]==='string')messages[ns][k]=valor[idioma];}
  return {
    locale: idioma,
    timeZone: 'America/Costa_Rica',
    messages
  };
});
