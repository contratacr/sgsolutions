import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
export default async function NoEncontrado() {
  const t = await getTranslations('Error');
  return <main id="contenido" className="contenedor seccion"><h1>{t('noEncontrado')}</h1><Link className="boton boton-azul" href="/">{t('volver')}</Link></main>;
}
