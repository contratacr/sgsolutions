import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft, ArrowUpRight, MapPin, Phone, Mail, MessageCircle } from 'lucide-react';
import { empresa, enlaceWhatsApp } from '@/lib/empresa';
export async function generateMetadata() { const t = await getTranslations('Navegacion'); return {title: t('contacto')}; }
export default async function Contacto() {
  const t = await getTranslations('Inicio'); const marca = await getTranslations('Marca'); const n = await getTranslations('Navegacion'); const c = await getTranslations('ContactoPagina'); const contacto = await getTranslations('Contacto');
  return <main id="contenido"><section className="contenedor seccion contacto-pagina"><div className="area-ruta"><Link href="/"><ArrowLeft size={14}/>{n('volver')}</Link></div><p className="etiqueta">{t('contactoEtiqueta')}</p><h1>{t('contactoTitulo')}</h1><p className="area-descripcion">{t('contactoTexto')}</p><div className="contactos-grid"><a href={enlaceWhatsApp(contacto('mensaje'))} target="_blank" rel="noopener noreferrer"><MessageCircle/><strong>{c('whatsapp')}</strong><span>{c('escribir')}<ArrowUpRight size={16}/></span></a><a href={`tel:${empresa.telefono}`}><Phone/><strong>{c('telefono')}</strong><span>{marca('telefono')}</span></a><a href={`mailto:${empresa.correo}`}><Mail/><strong>{c('correo')}</strong><span>{marca('correo')}</span></a></div><div className="ubicacion-grid"><div className="ubicacion-foto"><Image src="/imagenes/oficina.webp" alt={t('nosotrosAlt')} fill sizes="(max-width: 760px) 100vw, 45vw"/></div><div><MapPin size={28}/><h2>{c('visita')}</h2><p>{marca('direccion')}</p><a className="boton boton-azul" href={empresa.mapa} target="_blank" rel="noopener noreferrer">{t('mapa')}<ArrowUpRight size={17}/></a></div></div></section></main>;
}
