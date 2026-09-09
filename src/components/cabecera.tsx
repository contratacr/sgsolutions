'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, ArrowUpRight, MapPin } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Carrito } from './carrito';
import { cambiarIdioma } from '@/app/acciones-idioma';

export function Cabecera() {
  const t = useTranslations('Navegacion');
  const marca = useTranslations('Marca');
  const idioma = useLocale();
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();
  const enlaces = [['/tienda', 'tienda'], ['/soporte', 'soporte'], ['/empresas', 'empresas'], ['/nosotros', 'nosotros']] as const;
  return <header className="cabecera"><div className="barra-local"><div className="contenedor"><span><MapPin size={13}/>{marca('ubicacionCorta')}</span><a href="tel:+50624467846">{marca('telefono')}</a></div></div><div className="contenedor navegacion">
    <Link href="/" aria-label={t('inicio')}><Image className="logo" src="/imagenes/logo-blanco.png" alt={marca('logo')} width={150} height={63} priority/></Link>
    <nav aria-label={t('principal')} className="nav-escritorio">{enlaces.map(([href, texto]) => <Link href={href} key={texto} target="_blank" rel="noopener noreferrer" title={t('nuevaPestana')} aria-current={ruta === href ? 'page' : undefined}>{t(texto)}</Link>)}</nav>
    <div className="nav-acciones"><form action={cambiarIdioma}><button className="boton-icono idioma" name="idioma" value={idioma === 'es' ? 'en' : 'es'} aria-label={t('cambiarIdioma')}>{t('otroIdioma')}</button></form><Carrito/><Link className="boton boton-naranja contacto-nav" href="/contacto" target="_blank" rel="noopener noreferrer" title={t('nuevaPestana')}>{t('contacto')}<ArrowUpRight size={17}/></Link><button className="boton-icono menu-movil" onClick={() => setAbierto(!abierto)} aria-label={abierto ? t('cerrar') : t('menu')} aria-expanded={abierto} aria-controls="navegacion-movil">{abierto ? <X/> : <Menu/>}</button></div>
  </div>{abierto && <nav id="navegacion-movil" aria-label={t('principal')} className="nav-movil">{enlaces.map(([href, texto]) => <Link onClick={() => setAbierto(false)} href={href} key={texto} target="_blank" rel="noopener noreferrer" title={t('nuevaPestana')} aria-current={ruta === href ? 'page' : undefined}>{t(texto)}</Link>)}<Link href="/contacto" target="_blank" rel="noopener noreferrer" title={t('nuevaPestana')} onClick={() => setAbierto(false)}>{t('contacto')}</Link></nav>}</header>;
}
