'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {cerrarSesion} from '@/app/acceso/acciones';

export function NavegacionPanel() {
  const ruta = usePathname();
  const t = useTranslations('Panel');
  const m = useTranslations('Analitica');
  const a = useTranslations('Acceso');
  const enlaces = [
    {href:'/panel', texto:t('titulo')},
    {href:'/panel/catalogo', texto:t('productos')},
    {href:'/panel/contenido', texto:t('contenido')},
    {href:'/panel/pedidos', texto:t('pedidos')},
    {href:'/panel/estadisticas', texto:m('tituloPanel')},
  ];
  return <nav className="panel-navegacion contenedor" aria-label={t('titulo')}>
    {enlaces.map(({href,texto}) => <Link key={href} href={href} aria-current={ruta === href || href !== '/panel' && ruta.startsWith(`${href}/`) ? 'page' : undefined}>{texto}</Link>)}
    <form action={cerrarSesion} data-cerrar-sesion><button className="boton boton-contorno">{a('salir')}</button></form>
  </nav>;
}
