import { getTranslations } from 'next-intl/server';
import { Laptop, Wifi, ShieldCheck, ArrowUpRight, Plus, Headset } from 'lucide-react';
import Image from 'next/image';
import { Planes } from '@/components/secciones';
import { enlaceWhatsApp } from '@/lib/empresa';

export async function generateMetadata() { const t = await getTranslations('Soporte'); return {title: t('etiqueta'), description: t('descripcion')}; }
export default async function Soporte() {
  const t = await getTranslations('Soporte');
  const iconos = [Laptop, Wifi, ShieldCheck];
  return <main id="contenido" className="soporte-editorial">
    <section className="soporte-bienvenida contenedor"><div className="soporte-emblema"><Headset size={34} strokeWidth={1.3}/></div><p className="etiqueta">{t('etiqueta')}</p><h1>{t('titulo')}</h1><p>{t('descripcion')}</p><a className="boton boton-azul" href={enlaceWhatsApp(t('mensaje'))} target="_blank" rel="noopener noreferrer">{t('accion')}<ArrowUpRight size={17}/></a></section>
    <section className="contenedor seccion ayuda-seccion"><div className="encabezado-seccion"><div><p className="etiqueta">{t('elegir')}</p><h2>{t('ayudaTitulo')}</h2></div><p>{t('ayudaTexto')}</p></div><div className="ayuda-grid">{iconos.map((Icono,i) => <a key={i} className="ayuda-opcion" href={enlaceWhatsApp(t('temaMensaje', {tema: t(`tema${i}`)}))} target="_blank" rel="noopener noreferrer"><Icono size={27} strokeWidth={1.5}/><h3>{t(`tema${i}`)}</h3><p>{t(`texto${i}`)}</p><span>{t('consultar')}<ArrowUpRight size={18}/></span></a>)}</div></section>
    <section className="contenedor soporte-cercano"><figure><Image src="/imagenes/oficina.webp" alt={t('foto')} fill sizes="(max-width: 760px) 100vw, 45vw"/><figcaption>{t('foto')}</figcaption></figure><div><p className="etiqueta">{t('procesoEtiqueta')}</p><h2>{t('procesoTitulo')}</h2><ol className="soporte-pasos">{[0,1,2].map(i => <li key={i}><span>{`0${i+1}`}</span><div><h3>{t(`paso${i}Titulo`)}</h3><p>{t(`paso${i}Texto`)}</p></div></li>)}</ol></div></section>
    <Planes/>
    <section className="contenedor seccion preguntas preguntas-editorial"><div><p className="etiqueta">{t('preguntasEtiqueta')}</p><h2>{t('preguntasTitulo')}</h2></div><div>{[0,1,2].map(i => <details key={i}><summary>{t(`pregunta${i}`)}<Plus size={18}/></summary><p>{t(`respuesta${i}`)}</p></details>)}</div></section>
  </main>;
}
