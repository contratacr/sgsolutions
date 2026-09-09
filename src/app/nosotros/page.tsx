import { getTranslations } from 'next-intl/server';
import { CabeceraArea } from '@/components/cabecera-area';
import { Contacto } from '@/components/secciones';
import { empresa } from '@/lib/empresa';
export async function generateMetadata() { const t = await getTranslations('Navegacion'); return {title: t('nosotros')}; }
export default async function Nosotros() {
  const t = await getTranslations('Inicio');
  return <main id="contenido"><CabeceraArea etiqueta={t('nosotrosEtiqueta')} titulo={t('nosotrosTitulo')} descripcion={t('nosotrosTexto')} imagen="/imagenes/oficina.webp" alt={t('nosotrosAlt')} accion={t('visitanos')} href={empresa.mapa}/><Contacto/></main>;
}
