import { getTranslations } from 'next-intl/server';
import { FormularioAcceso } from '@/components/formulario-acceso';
import { configuracionSupabase } from '@/lib/supabase/configuracion';
export const metadata = {robots: {index: false, follow: false}};
export default async function Acceso() {
  const t = await getTranslations('Acceso');
  const configurado = !!configuracionSupabase();
  return <main id="contenido" className="acceso"><section className="acceso-tarjeta"><p className="etiqueta">{t('etiqueta')}</p><h1>{t('titulo')}</h1><p>{t('descripcion')}</p>{configurado ? <FormularioAcceso/> : <p className="aviso-formulario" role="status">{t('noDisponible')}</p>}<p>{t('nota')}</p></section></main>;
}
