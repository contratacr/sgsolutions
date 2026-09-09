import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Catalogo } from '@/components/catalogo';
export async function generateMetadata() { const t = await getTranslations('Navegacion'); return {title: t('tienda')}; }
export default async function Tienda() {
  const t = await getTranslations('Tienda');
  const n = await getTranslations('Navegacion');
  const idioma = await getLocale();
  return <main id="contenido" className="tienda-editorial">
    <section className="contenedor tienda-portada"><div className="tienda-portada-texto"><p className="etiqueta">{t('etiqueta')}</p><h1>{t('titulo')}</h1><p>{t('descripcion')}</p><div className="tienda-portada-acciones"><a className="boton boton-azul" href="#catalogo">{t('explorarEquipo')}<ArrowDown size={17}/></a><Link className="enlace-azul" href="/soporte" target="_blank" rel="noopener noreferrer" title={n('nuevaPestana')}>{t('necesitoAyuda')}<ArrowUpRight size={16}/></Link></div><span className="tienda-promesa"><ShieldCheck size={16}/>{t('respaldoLocal')}</span></div><figure className="tienda-portada-foto"><Image src="/imagenes/portatil.webp" alt={t('portatilAlt')} fill priority sizes="(max-width: 760px) 100vw, 50vw"/><figcaption><span>{t('seleccionEtiqueta')}</span><strong>{t('seleccionTitulo')}</strong></figcaption></figure></section>
    <section id="catalogo" className="contenedor seccion catalogo"><div className="catalogo-encabezado"><div><p className="etiqueta">{t('catalogoEtiqueta')}</p><h2>{t('catalogoTitulo')}</h2></div><p>{t('catalogoTexto')}</p></div><Catalogo key={idioma}/><p className="aviso-tienda aviso-tienda-final">{t('aviso')}</p></section>
  </main>;
}
