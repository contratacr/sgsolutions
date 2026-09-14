import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
export default getRequestConfig(async () => {
  const idioma = (await cookies()).get('sg-idioma')?.value === 'en' ? 'en' : 'es';
  return {
    locale: idioma,
    timeZone: 'America/Costa_Rica',
    messages: (await import(`../../messages/${idioma}.json`)).default
  };
});
