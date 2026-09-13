import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Soluciones, Proyectos, Contacto, Planes } from '@/components/secciones';
export async function generateMetadata() { const t = await getTranslations('Empresas'); return {title: t('etiqueta'), description: t('descripcion')}; }
export default async function Empresas() {
  const t = await getTranslations('Empresas'); const n = await getTranslations('Navegacion'); const c = await getTranslations('Casos');
  return <main id="contenido" className="empresas-editorial"><section className="empresa-portada"><div className="empresa-portada-imagen"><Image src="/imagenes/red-hero.webp" alt={t('foto')} fill priority sizes="(max-width: 760px) 100vw, 65vw"/></div><div className="contenedor empresa-portada-contenido"><Link className="empresa-volver" href="/"><ArrowLeft size={14}/>{n('volver')}</Link><p className="etiqueta etiqueta-clara">{t('etiqueta')}</p><h1>{t('titulo')}</h1><p className="empresa-descripcion">{t('descripcion')}</p><a className="boton boton-naranja" href="#planes">{t('accion')}<ArrowUpRight size={18}/></a></div></section><nav className="empresa-necesidades contenedor" aria-label={t('necesidades')}>{[1,2,3].map(i => <a key={i} href={`#solucion-${i}`}><span>{`0${i}`}</span><div><strong>{t(`necesidad${i}`)}</strong><p>{t(`necesidad${i}Texto`)}</p></div><ArrowRight size={19}/></a>)}</nav><Planes/><Soluciones/><Proyectos/><div className="contenedor casos-enlace"><Link className="boton boton-contorno" href="/casos-de-exito">{c('ver')}<ArrowUpRight size={18}/></Link></div><Contacto porCorreo/></main>;
}
