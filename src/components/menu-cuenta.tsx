'use client';
import {useRef,useEffect,type FocusEvent} from 'react';
import Link from 'next/link';
import styles from './menu-cuenta.module.css';
import {useTranslations} from 'next-intl';
import {CircleUserRound,ChevronDown,ShoppingBag,UserRound,ShieldCheck,LogOut,LayoutDashboard,Heart} from 'lucide-react';
import {cerrarSesionCliente} from '@/app/cuenta/acciones';
export function MenuCuenta({nombre,administrador}:{nombre:string;administrador:boolean}){
 const t=useTranslations('Navegacion'),d=useTranslations('DatosCuenta'),s=useTranslations('SeguridadCuenta'),c=useTranslations('CuentaCliente'),a=useTranslations('AdministracionCuenta');
 const ref=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{const cerrar=(e:PointerEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))ref.current.open=false;};document.addEventListener('pointerdown',cerrar);return()=>document.removeEventListener('pointerdown',cerrar);},[]);
 function cerrarAlSalir(e:FocusEvent<HTMLDetailsElement>){
  // Safari no enfoca algunos enlaces/botones al pulsarlos: relatedTarget puede ser null.
  // Cerrar en ese blur oculta el destino antes de que se dispare click/submit.
  if(e.relatedTarget&&!e.currentTarget.contains(e.relatedTarget as Node))e.currentTarget.open=false;
 }
 const opciones=[{href:'/cuenta?seccion=favoritos',texto:d('misFavoritos'),Icono:Heart},{href:'/cuenta?seccion=compras',texto:d('misCompras'),Icono:ShoppingBag},{href:'/cuenta?seccion=datos',texto:d('misDatos'),Icono:UserRound},{href:'/cuenta?seccion=seguridad',texto:s('titulo'),Icono:ShieldCheck}];
 return <details ref={ref} className={`nav-cuenta-menu ${styles.menu}`} onKeyDown={e=>{if(e.key==='Escape'&&ref.current){ref.current.open=false;ref.current.querySelector('summary')?.focus();}}} onBlur={cerrarAlSalir}><summary className={`cuenta-nav ${styles.activador}`} aria-label={t('menuCuenta')}><CircleUserRound size={21} aria-hidden="true"/><span>{nombre||t('miCuenta')}</span><ChevronDown className="cuenta-chevron" size={14} aria-hidden="true"/></summary><div className={`nav-cuenta-desplegable ${styles.desplegable}`}><nav aria-label={d('navegacion')}>{opciones.map(({href,texto,Icono})=><Link href={href} key={href} onClick={()=>{if(ref.current)ref.current.open=false;}}><Icono size={18} aria-hidden="true"/>{texto}</Link>)}{administrador&&<Link href="/panel" prefetch={false} onClick={()=>{if(ref.current)ref.current.open=false;}}><LayoutDashboard size={18} aria-hidden="true"/>{a('abrir')}</Link>}</nav><form action={cerrarSesionCliente}><button><LogOut size={18} aria-hidden="true"/>{c('salir')}</button></form></div></details>;
}
