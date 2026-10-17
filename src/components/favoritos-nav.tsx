'use client';
import Link from 'next/link';
import {Heart} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {usePathname} from 'next/navigation';
import {IndicadorCantidad} from './indicador-cantidad';
export function FavoritosNav({cantidad}:{cantidad:number|null}){
 const t=useTranslations('AccionesProducto'),ruta=usePathname();
 return <Link className="favoritos-nav-movil boton-icono" href="/favoritos" aria-label={cantidad===null?t('favoritos'):`${t('favoritos')} (${cantidad})`} aria-current={ruta==='/favoritos'?'page':undefined}><Heart size={23} aria-hidden="true"/>{cantidad!==null&&<IndicadorCantidad cantidad={cantidad}/>}</Link>;
}
