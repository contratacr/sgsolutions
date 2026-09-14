import { getTranslations } from 'next-intl/server';
import { ArrowUpRight, Plus } from 'lucide-react';
import Image from 'next/image';
import { ServiciosSoporte } from '@/components/servicios-soporte';
import { enlaceWhatsApp } from '@/lib/empresa';

export async function generateMetadata() { const t = await getTranslations('Soporte'); return {title: t('etiqueta'), description: t('descripcion')}; }
export default async function Soporte() {
  const t = await getTranslations('Soporte');
  return <main id="contenido" className="soporte-editorial">
    <section className="soporte-bienvenida contenedor"><div><p className="etiqueta">{t('etiqueta')}</p><h1>{t('titulo')}</h1><p>{t('descripcion')}</p><a className="boton boton-azul" href={enlaceWhatsApp(t('mensaje'))} target="_blank" rel="noopener noreferrer">{t('accion')}<ArrowUpRight size={17}/></a></div><ul className="soporte-resumen" aria-label={t('resumen')}><li><span>01</span>{t('resumen0')}</li><li><span>02</span>{t('resumen1')}</li><li><span>03</span>{t('resumen2')}</li></ul></section>
    <ServiciosSoporte/>
    <section className="contenedor soporte-cercano"><figure><Image src="/imagenes/oficina.webp" alt={t('foto')} fill sizes="(max-width: 760px) 100vw, 45vw"/><figcaption>{t('foto')}</figcaption></figure><div><p className="etiqueta">{t('procesoEtiqueta')}</p><h2>{t('procesoTitulo')}</h2><ol className="soporte-pasos">{[0,1,2].map(i => <li key={i}><span>{`0${i+1}`}</span><div><h3>{t(`paso${i}Titulo`)}</h3><p>{t(`paso${i}Texto`)}</p></div></li>)}</ol></div></section>

    <section className="contenedor seccion preguntas preguntas-editorial"><div><p className="etiqueta">{t('preguntasEtiqueta')}</p><h2>{t('preguntasTitulo')}</h2></div><div>{[0,1,2].map(i => <details key={i}><summary>{t(`pregunta${i}`)}<Plus size={18}/></summary><p>{t(`respuesta${i}`)}</p></details>)}</div></section>
  </main>;
}
