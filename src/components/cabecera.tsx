'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, MapPin } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Carrito } from './carrito';
import { cambiarIdioma } from '@/app/acciones-idioma';

export function Cabecera() {
  const t = useTranslations('Navegacion');
  const marca = useTranslations('Marca');
  const idioma = useLocale();
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();
  const cabecera=useRef<HTMLElement>(null),botonMenu=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!abierto)return;
    const fuera=(e:PointerEvent)=>{if(e.target instanceof Node&&!cabecera.current?.contains(e.target))setAbierto(false);};
    const tecla=(e:KeyboardEvent)=>{if(e.key==='Escape'){setAbierto(false);botonMenu.current?.focus();}};
    const foco=(e:FocusEvent)=>{if(e.target instanceof Node&&!cabecera.current?.contains(e.target))setAbierto(false);};
    document.addEventListener('pointerdown',fuera);document.addEventListener('keydown',tecla);document.addEventListener('focusin',foco);
    return()=>{document.removeEventListener('pointerdown',fuera);document.removeEventListener('keydown',tecla);document.removeEventListener('focusin',foco);};
  },[abierto]);
  const enlaces = [['/soluciones', 'tienda'], ['/soporte', 'soporte'], ['/empresas', 'empresas'], ['/casos-de-exito', 'casos'], ['/nosotros', 'nosotros']] as const;
  return <header ref={cabecera} className="cabecera"><div className="barra-local"><div className="contenedor"><span><MapPin size={13}/>{marca('ubicacionCorta')}</span><a href="tel:+50624467846">{marca('telefono')}</a></div></div><div className="contenedor navegacion">
    <Link href="/" aria-label={t('inicio')}><Image className="logo" src="/imagenes/logo-principal.png" alt={marca('logo')} width={150} height={63} priority/></Link>
    <nav aria-label={t('principal')} className="nav-escritorio">{enlaces.map(([href, texto]) => <Link href={href} key={texto} aria-current={ruta === href ? 'page' : undefined}>{t(texto)}</Link>)}</nav>
    <div className="nav-acciones"><form className="selector-idioma" action={cambiarIdioma} role="group" aria-label={t('seleccionarIdioma')}>{(['es', 'en'] as const).map(opcion => <button key={opcion} type="submit" name="idioma" value={opcion} lang={opcion} aria-pressed={idioma === opcion} aria-label={idioma === opcion ? `${t(opcion === 'es' ? 'espanol' : 'ingles')} · ${t('idiomaActual')}` : t('cambiarIdioma')}>{opcion.toUpperCase()}</button>)}</form><Carrito/><button ref={botonMenu} className="boton-icono menu-movil" onClick={() => setAbierto(!abierto)} aria-label={abierto ? t('cerrar') : t('menu')} aria-expanded={abierto} aria-controls="navegacion-movil">{abierto ? <X/> : <Menu/>}</button></div>
  </div>{abierto && <nav id="navegacion-movil" aria-label={t('principal')} className="nav-movil">{enlaces.map(([href, texto]) => <Link onClick={() => setAbierto(false)} href={href} key={texto} aria-current={ruta === href ? 'page' : undefined}>{t(texto)}</Link>)}</nav>}</header>;
}
