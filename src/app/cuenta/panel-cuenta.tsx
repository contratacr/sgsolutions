import Link from 'next/link';
import {getTranslations} from 'next-intl/server';
import {UserRound,ShoppingBag,ShieldCheck,ChevronRight,ArrowLeft,LogOut,LayoutDashboard,Heart} from 'lucide-react';
import type {ReactNode} from 'react';
import {FavoritosCuenta} from '@/components/favoritos-cuenta';
import {cerrarSesionCliente} from './acciones';
export async function PanelCuenta({datos,compras,seguridad,seccion,administrador=false}:{datos:ReactNode;compras:ReactNode;seguridad:ReactNode;seccion?:string;administrador?:boolean}){
 const t=await getTranslations('DatosCuenta'),s=await getTranslations('SeguridadCuenta'),c=await getTranslations('CuentaCliente'),a=await getTranslations('AdministracionCuenta');
 const favoritos=await getTranslations('AccionesProducto');
 const opciones=[{clave:'favoritos',titulo:favoritos('favoritos'),Icono:Heart,contenido:<FavoritosCuenta/>},{clave:'compras',titulo:t('misCompras'),Icono:ShoppingBag,contenido:compras},{clave:'datos',titulo:t('misDatos'),Icono:UserRound,contenido:datos},{clave:'seguridad',titulo:s('titulo'),Icono:ShieldCheck,contenido:seguridad}];
 const actual=opciones.find(o=>o.clave===seccion);
 return <div className={`cuenta-panel cuenta-distribucion${actual?' cuenta-seccion-abierta':''}`}><aside className="cuenta-lateral"><nav className="cuenta-menu-secciones" aria-label={t('navegacion')}>{opciones.map(({clave,titulo,Icono})=><Link href={`/cuenta?seccion=${clave}`} key={clave} aria-current={(actual?.clave||'compras')===clave?'page':undefined}><Icono className="cuenta-menu-icono" size={20} aria-hidden="true"/><span>{titulo}</span><ChevronRight className="cuenta-menu-flecha" size={17} aria-hidden="true"/></Link>)}</nav><div className="cuenta-lateral-base">{administrador&&<Link className="cuenta-admin-enlace" href="/admin"><LayoutDashboard size={18} aria-hidden="true"/>{a('abrir')}</Link>}<form action={cerrarSesionCliente}><button className="cuenta-salir"><LogOut size={18} aria-hidden="true"/>{c('salir')}</button></form></div></aside><div className="cuenta-contenido">{actual&&<Link className="cuenta-volver" href="/cuenta"><ArrowLeft size={17} aria-hidden="true"/>{s('volver')}</Link>}{(actual||opciones.find(o=>o.clave==='compras')!).contenido}</div></div>;
}
