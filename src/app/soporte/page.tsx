import { getTranslations } from 'next-intl/server';
import { Laptop, Wifi, ShieldCheck, ArrowUpRight, Plus } from 'lucide-react';
import { CabeceraArea } from '@/components/cabecera-area';
import { Planes } from '@/components/secciones';
import { enlaceWhatsApp } from '@/lib/empresa';

export async function generateMetadata() { const t = await getTranslations('Soporte'); return {title: t('etiqueta'), description: t('descripcion')}; }
export default async function Soporte() {
  const t = await getTranslations('Soporte');
  const iconos = [Laptop, Wifi, ShieldCheck];
  return <main id="contenido">
    <CabeceraArea etiqueta={t('etiqueta')} titulo={t('titulo')} descripcion={t('descripcion')} imagen="/imagenes/oficina.webp" alt={t('foto')} accion={t('accion')} href={enlaceWhatsApp(t('mensaje'))}/>
    <section className="contenedor seccion ayuda-seccion"><div className="encabezado-seccion"><div><p className="etiqueta">{t('elegir')}</p><h2>{t('ayudaTitulo')}</h2></div><p>{t('ayudaTexto')}</p></div><div className="ayuda-grid">{iconos.map((Icono,i) => <a key={i} className="ayuda-opcion" href={enlaceWhatsApp(t('temaMensaje', {tema: t(`tema${i}`)}))} target="_blank" rel="noopener noreferrer"><Icono size={27} strokeWidth={1.5}/><h3>{t(`tema${i}`)}</h3><p>{t(`texto${i}`)}</p><span>{t('consultar')}<ArrowUpRight size={18}/></span></a>)}</div></section>
    <section className="ayuda-proceso"><div className="contenedor"><p className="etiqueta">{t('procesoEtiqueta')}</p><h2>{t('procesoTitulo')}</h2><ol className="pasos-grid">{[0,1,2].map(i => <li key={i}><span>{`0${i+1}`}</span><h3>{t(`paso${i}Titulo`)}</h3><p>{t(`paso${i}Texto`)}</p></li>)}</ol></div></section>
    <Planes/>
    <section className="contenedor seccion preguntas"><p className="etiqueta">{t('preguntasEtiqueta')}</p><h2>{t('preguntasTitulo')}</h2>{[0,1,2].map(i => <details key={i}><summary>{t(`pregunta${i}`)}<Plus size={18}/></summary><p>{t(`respuesta${i}`)}</p></details>)}</section>
  </main>;
}
