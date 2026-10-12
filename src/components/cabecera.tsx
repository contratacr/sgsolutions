'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, MapPin, Phone, CircleUserRound, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Carrito } from './carrito';
import * as Dialog from '@radix-ui/react-dialog';
import { cambiarIdioma } from '@/app/acciones-idioma';

export function Cabecera({sesionIniciada=false}:{sesionIniciada?:boolean}) {
  const t = useTranslations('Navegacion');
  const etiquetaCuenta=t(sesionIniciada?'miCuenta':'cuenta');
  const marca = useTranslations('Marca');
  const idioma = useLocale();
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();
  const [rutaMenu,setRutaMenu]=useState(ruta);
  const cambiarMenu=(valor:boolean)=>{setRutaMenu(ruta);setAbierto(valor);};
  const enlaces = [['/tienda', 'tienda'], ['/soporte', 'soporte'], ['/empresas', 'empresas'], ['/casos-de-exito', 'casos'], ['/nosotros', 'nosotros']] as const;
  return <header className="cabecera"><div className="barra-local"><div className="contenedor"><span><MapPin size={13}/>{marca('ubicacionCorta')}</span><a href="tel:+50624467846"><Phone size={13} aria-hidden="true"/>{marca('telefono')}</a></div></div><div className="contenedor navegacion">
    <Link href="/" aria-label={t('inicio')} onClick={(e)=>{setAbierto(false);if(ruta === '/' && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey){e.preventDefault();window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}}}><Image className="logo" src="/imagenes/logo-principal.png" alt={marca('logo')} width={150} height={63} priority/></Link>
    <nav aria-label={t('principal')} className="nav-escritorio">{enlaces.map(([href, texto]) => <Link href={href} key={texto} aria-current={ruta === href ? 'page' : undefined}>{t(texto)}</Link>)}</nav>
    <div className="nav-acciones"><form className="idioma-directo" action={cambiarIdioma} role="group" aria-label={t('seleccionarIdioma')}>{(['es','en'] as const).map(opcion=><button key={opcion} type="submit" name="idioma" value={opcion} lang={opcion} aria-pressed={idioma===opcion} aria-label={idioma===opcion ? `${t(opcion==='es'?'espanol':'ingles')} · ${t('idiomaActual')}` : t('cambiarIdioma')}>{opcion.toUpperCase()}</button>)}</form><Link className="cuenta-nav" href="/cuenta" aria-label={etiquetaCuenta} aria-current={ruta === '/cuenta' ? 'page' : undefined} title={etiquetaCuenta}><CircleUserRound size={21} aria-hidden="true"/><span>{etiquetaCuenta}</span></Link><Carrito/><Dialog.Root open={abierto && rutaMenu===ruta} onOpenChange={cambiarMenu}><Dialog.Trigger className="boton-icono menu-movil" aria-label={t('menu')}><Menu aria-hidden="true"/></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="menu-panel-fondo"/><Dialog.Content className="menu-panel" aria-describedby={undefined}>
      <div className="menu-panel-cabecera"><Link href="/" onClick={()=>setAbierto(false)} aria-label={t('inicio')}><Image src="/imagenes/logo-principal.png" alt={marca('logo')} className="menu-panel-logo" width={150} height={63}/></Link><Dialog.Close className="menu-panel-cerrar" aria-label={t('cerrar')}><X size={23} aria-hidden="true"/></Dialog.Close></div>
      <Dialog.Title className="sr-only">{t('principal')}</Dialog.Title>
      <nav id="navegacion-movil" aria-label={t('principal')} className="menu-panel-enlaces">{enlaces.map(([href,texto])=><Link key={href} href={href} onNavigate={()=>{if(ruta===href)setAbierto(false);}} aria-current={ruta===href?'page':undefined}><span>{t(texto)}</span><ChevronRight size={18} aria-hidden="true"/></Link>)}</nav>
      <div className="menu-panel-base"><Link className="menu-panel-cuenta" href="/cuenta" onNavigate={()=>{if(ruta==='/cuenta')setAbierto(false);}}><CircleUserRound size={21} aria-hidden="true"/>{etiquetaCuenta}<ChevronRight size={18} aria-hidden="true"/></Link><form className="menu-panel-idioma idioma-directo" action={cambiarIdioma} aria-label={t('seleccionarIdioma')}><span>{t('seleccionarIdioma')}</span>{(['es','en'] as const).map(opcion=><button key={opcion} name="idioma" value={opcion} lang={opcion} aria-pressed={idioma===opcion} aria-label={t(opcion==='es'?'espanol':'ingles')}>{opcion.toUpperCase()}</button>)}</form></div>
    </Dialog.Content></Dialog.Portal></Dialog.Root></div>
  </div></header>;
}
