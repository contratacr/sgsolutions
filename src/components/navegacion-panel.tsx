'use client';

import Link from 'next/link';
import {LayoutDashboard,Package,FileText,MessagesSquare,ChartNoAxesCombined} from 'lucide-react';
import {usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {cerrarSesion} from '@/app/acceso/acciones';

export function NavegacionPanel() {
  const ruta = usePathname();
  const t = useTranslations('Panel');
  const m = useTranslations('Analitica');
  const a = useTranslations('Acceso');
  const enlaces = [
    {href:'/panel', texto:t('titulo'),Icono:LayoutDashboard},
    {href:'/panel/catalogo', texto:t('productos'),Icono:Package},
    {href:'/panel/contenido', texto:t('contenido'),Icono:FileText},
    {href:'/panel/pedidos', texto:t('pedidos'),Icono:MessagesSquare},
    {href:'/panel/estadisticas', texto:m('tituloPanel'),Icono:ChartNoAxesCombined},
  ];
  return <nav className="panel-navegacion contenedor" aria-label={t('titulo')}>
    {enlaces.map(({href,texto,Icono}) => <Link key={href} href={href} aria-current={ruta === href || href !== '/panel' && ruta.startsWith(`${href}/`) ? 'page' : undefined}><Icono size={18} aria-hidden="true"/>{texto}</Link>)}
    <form action={cerrarSesion} data-cerrar-sesion><button className="boton boton-contorno">{a('salir')}</button></form>
  </nav>;
}
