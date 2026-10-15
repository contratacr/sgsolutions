'use client';
import Link from 'next/link';
import {useSesionCuenta} from './sesion-cuenta';
import {useTranslations} from 'next-intl';
import {enlaceIngresoCompra} from '@/lib/retorno-compra';
export function AccesoCompra({retorno}:{retorno:string;google:boolean}){
 const t=useTranslations('AccesoCompra'),sesionIniciada=useSesionCuenta();
 if(sesionIniciada)return null;
 return <aside className="compra-acceso" aria-label={t('titulo')}>
  <div className="compra-acceso-fila">
   <div className="compra-acceso-titulo"><span>{t('titulo')}</span><Link href={enlaceIngresoCompra(retorno)}>{t('ingresar')}</Link></div>
  </div>
 </aside>;
}
