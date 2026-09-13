import { getTranslations } from 'next-intl/server';
import { CabeceraArea } from '@/components/cabecera-area';
import { Contacto } from '@/components/secciones';
import { empresa } from '@/lib/empresa';
export async function generateMetadata() { const t = await getTranslations('Navegacion'); return {title: t('nosotros')}; }
export default async function Nosotros() {
  const t = await getTranslations('Inicio'); const d = await getTranslations('NosotrosDetalle');
  return <main id="contenido" className="nosotros-pagina"><CabeceraArea etiqueta={t('nosotrosEtiqueta')} titulo={t('nosotrosTitulo')} descripcion={t('nosotrosTexto')} imagen="/imagenes/oficina.webp" alt={t('nosotrosAlt')} accion={t('visitanos')} href={empresa.mapa}/><section className="contenedor seccion nosotros-principios"><p className="etiqueta">{d('etiqueta')}</p><h2>{d('titulo')}</h2><div>{[0,1,2].map(i=><article key={i}><span>0{i+1}</span><h3>{d(`titulo${i}`)}</h3><p>{d(`texto${i}`)}</p></article>)}</div></section><Contacto/></main>;
}
