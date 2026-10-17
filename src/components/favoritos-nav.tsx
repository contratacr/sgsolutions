'use client';
import Link from 'next/link';
import {Heart} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {usePathname} from 'next/navigation';
import {useFavoritos} from '@/lib/favoritos';
import {IndicadorCantidad} from './indicador-cantidad';
export function FavoritosNav(){
 const {ids}=useFavoritos(),t=useTranslations('AccionesProducto'),ruta=usePathname();
 return <Link className="favoritos-nav-movil boton-icono" href="/favoritos" aria-label={`${t('favoritos')} (${ids.length})`} aria-current={ruta==='/favoritos'?'page':undefined}><Heart size={23} aria-hidden="true"/><IndicadorCantidad cantidad={ids.length}/></Link>;
}
