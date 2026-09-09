import { getTranslations } from 'next-intl/server';
import { Catalogo } from '@/components/catalogo';
export async function generateMetadata() { const t = await getTranslations('Navegacion'); return {title: t('tienda')}; }
export default async function Tienda() {
  const t = await getTranslations('Tienda');
  return <main id="contenido"><section className="tienda-intro"><div className="contenedor"><p className="etiqueta">{t('etiqueta')}</p><h1>{t('titulo')}</h1><p>{t('descripcion')}</p></div></section><section className="contenedor seccion catalogo"><p className="aviso-tienda">{t('aviso')}</p><Catalogo/></section></main>;
}
