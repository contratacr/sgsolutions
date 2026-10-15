'use client';
import {useConfiguracionSitio} from '@/components/configuracion-sitio';
import { useState } from 'react';
import Link from 'next/link';
import {enlaceIngresoCompra,retornoCompra} from '@/lib/retorno-compra';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu,  MapPin, Phone, CircleUserRound, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Carrito } from './carrito';
import {MenuCuenta} from './menu-cuenta';
import {MarcoModal} from '@/components/marco-modal';
import * as Dialog from '@radix-ui/react-dialog';
import { cambiarIdioma } from '@/app/acciones-idioma';

export function Cabecera({sesionIniciada=false,nombreCuenta="",administrador=false}:{sesionIniciada?:boolean;nombreCuenta?:string;administrador?:boolean}) {
 const {empresa}=useConfiguracionSitio();
  const t = useTranslations('Navegacion');
  const etiquetaCuenta=sesionIniciada?(nombreCuenta||t('miCuenta')):t('cuenta');
  const marca = useTranslations('Marca');
  const idioma = useLocale();
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();
  const destinoCuenta=!sesionIniciada&&retornoCompra(ruta)?enlaceIngresoCompra(ruta):'/cuenta';
  function ingresarDesdeMenu(evento:{preventDefault:()=>void}){
    setAbierto(false);
    const retorno=retornoCompra(window.location.pathname+window.location.search);
    if(!sesionIniciada&&retorno){evento.preventDefault();window.location.assign(enlaceIngresoCompra(retorno));}
  }
  const [rutaMenu,setRutaMenu]=useState(ruta);
  const cambiarMenu=(valor:boolean)=>{setRutaMenu(ruta);setAbierto(valor);};
  const enlaces = [['/tienda', 'tienda'], ['/soporte', 'soporte'], ['/empresas', 'empresas'], ['/casos-de-exito', 'casos'], ['/nosotros', 'nosotros']] as const;
  if(ruta==='/panel/pedidos')return null;
  return <header className="cabecera"><div className="barra-local"><div className="contenedor"><span><MapPin size={13}/>{marca('ubicacionCorta')}</span><a href={`tel:${empresa.telefono}`}><Phone size={13} aria-hidden="true"/>{marca('telefono')}</a></div></div><div className="contenedor navegacion">
    <Link href="/" aria-label={t('inicio')} onClick={(e)=>{setAbierto(false);if(ruta === '/' && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey){e.preventDefault();window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}}}><Image className="logo" src="/imagenes/logo-principal.png" alt={marca('logo')} width={150} height={63} priority/></Link>
    <nav aria-label={t('principal')} className="nav-escritorio">{enlaces.map(([href, texto]) => <Link href={href} key={texto} aria-current={ruta === href ? 'page' : undefined}>{t(texto)}</Link>)}</nav>
    <div className="nav-acciones"><form className="idioma-directo" action={cambiarIdioma} role="group" aria-label={t('seleccionarIdioma')}>{(['es','en'] as const).map(opcion=><button key={opcion} type="submit" name="idioma" value={opcion} lang={opcion} aria-pressed={idioma===opcion} aria-label={idioma===opcion ? `${t(opcion==='es'?'espanol':'ingles')} · ${t('idiomaActual')}` : t('cambiarIdioma')}>{opcion.toUpperCase()}</button>)}</form>{sesionIniciada?<MenuCuenta nombre={nombreCuenta} administrador={administrador}/>:<Link className="cuenta-nav" href={destinoCuenta} onNavigate={ingresarDesdeMenu} aria-label={etiquetaCuenta}><CircleUserRound size={21} aria-hidden="true"/><span>{etiquetaCuenta}</span></Link>}<Carrito sesionIniciada={sesionIniciada}/><Dialog.Root open={abierto && rutaMenu===ruta} onOpenChange={cambiarMenu}><Dialog.Trigger className="boton-icono menu-movil" aria-label={t('menu')}><Menu aria-hidden="true"/></Dialog.Trigger>{abierto&&rutaMenu===ruta&&<Dialog.Portal><Dialog.Overlay className="menu-panel-fondo"/><MarcoModal className="menu-panel" aria-describedby={undefined}>
      <div className="menu-panel-cabecera"><Link href="/" onClick={()=>setAbierto(false)} aria-label={t('inicio')}><Image src="/imagenes/logo-principal.png" alt={marca('logo')} className="menu-panel-logo" width={150} height={63}/></Link></div>
      <Dialog.Title className="sr-only">{t('principal')}</Dialog.Title>
      <nav id="navegacion-movil" aria-label={t('principal')} className="menu-panel-enlaces">{enlaces.map(([href,texto])=><Link key={href} href={href} onNavigate={()=>setAbierto(false)} aria-current={ruta===href?'page':undefined}><span>{t(texto)}</span><ChevronRight size={18} aria-hidden="true"/></Link>)}</nav>
      <div className="menu-panel-base"><Link className="menu-panel-cuenta" href={destinoCuenta} onNavigate={ingresarDesdeMenu}><CircleUserRound size={21} aria-hidden="true"/>{etiquetaCuenta}<ChevronRight size={18} aria-hidden="true"/></Link><form className="menu-panel-idioma idioma-directo" action={cambiarIdioma} aria-label={t('seleccionarIdioma')}><span>{t('seleccionarIdioma')}</span>{(['es','en'] as const).map(opcion=><button key={opcion} name="idioma" value={opcion} lang={opcion} aria-pressed={idioma===opcion} aria-label={t(opcion==='es'?'espanol':'ingles')}>{opcion.toUpperCase()}</button>)}</form></div>
    </MarcoModal></Dialog.Portal>}</Dialog.Root></div>
  </div></header>;
}
