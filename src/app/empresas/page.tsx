import { getTranslations } from 'next-intl/server';
import { CabeceraArea } from '@/components/cabecera-area';
import { Soluciones, Proyectos, Contacto } from '@/components/secciones';
import { enlaceWhatsApp } from '@/lib/empresa';
export async function generateMetadata() { const t = await getTranslations('Empresas'); return {title: t('etiqueta'), description: t('descripcion')}; }
export default async function Empresas() {
  const t = await getTranslations('Empresas');
  return <main id="contenido"><CabeceraArea oscuro etiqueta={t('etiqueta')} titulo={t('titulo')} descripcion={t('descripcion')} imagen="/imagenes/red-hero.webp" alt={t('foto')} accion={t('accion')} href={enlaceWhatsApp(t('mensaje'))}/><Soluciones/><Proyectos/><Contacto/></main>;
}
