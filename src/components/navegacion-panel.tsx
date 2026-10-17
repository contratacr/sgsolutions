'use client';

import Link from 'next/link';
import Image from 'next/image';
import {useEffect,useRef} from 'react';
import {LayoutDashboard,Package,FileText,MessagesSquare,ChartNoAxesCombined,Truck,Users} from 'lucide-react';
import {usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {cambiarIdioma} from '@/app/acciones-idioma';
import {useLocale} from 'next-intl';
import {cerrarSesion} from '@/app/acceso/acciones';

export function NavegacionPanel() {
  const ruta = usePathname();
  const idioma=useLocale(),n=useTranslations('Navegacion');
  const t = useTranslations('Panel');
  const m = useTranslations('Analitica');
  const preview=useTranslations('PropuestaPedidos');
  const modulos=useTranslations('PropuestaPanel');
  const nav=useRef<HTMLElement>(null);
  useEffect(()=>{const barra=nav.current,activo=barra?.querySelector<HTMLElement>('[aria-current=page]');if(barra&&activo)barra.scrollLeft=Math.max(0,activo.offsetLeft-barra.offsetLeft-barra.clientWidth/2+activo.clientWidth/2);},[ruta]);
  const a = useTranslations('Acceso');
  const enlaces = [
    {href:'/panel', texto:t('titulo'),Icono:LayoutDashboard},
    {href:'/panel/catalogo', texto:t('productos'),Icono:Package},
    {href:'/panel/proveedores', texto:t('proveedores'),Icono:Truck,Users},
    {href:'/panel/contenido', texto:t('contenido'),Icono:FileText},
    {href:'/panel/pedidos', texto:t('pedidos'),Icono:MessagesSquare},
    {href:'/panel/usuarios',texto:t('usuarios'),Icono:Users},
    {href:'/panel/estadisticas', texto:m('tituloPanel'),Icono:ChartNoAxesCombined,Truck,Users},
  ];
  return <header className="pedidos-reales-nav"><Link href="/panel" aria-label={t('titulo')}><Image src="/imagenes/logo-principal.png" alt={preview('logo')} loading="eager" width={150} height={63}/></Link><nav ref={nav} aria-label={t('titulo')}>{enlaces.map(({href,texto,Icono})=><Link key={href} href={href} aria-current={ruta===href||href!=='/panel'&&ruta.startsWith(href+'/')?'page':undefined}><Icono size={18} aria-hidden="true"/>{href==='/panel'?modulos('inicio'):href==='/panel/contenido'?modulos('contenido'):texto}</Link>)}</nav><div><form action={cambiarIdioma} className="panel-idiomas" aria-label={n('seleccionarIdioma')}>{(['es','en'] as const).map(opcion=><button key={opcion} name="idioma" value={opcion} lang={opcion} aria-pressed={idioma===opcion}>{opcion.toUpperCase()}</button>)}</form><Link href="/">{preview('volverSitio')}</Link><form action={cerrarSesion} data-cerrar-sesion><button>{a('salir')}</button></form></div></header>;
}
