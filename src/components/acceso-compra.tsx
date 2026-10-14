'use client';
import Link from 'next/link';
import {useSesionCuenta} from './sesion-cuenta';
import {useTranslations} from 'next-intl';
import {AccesoSocial} from '@/app/cuenta/formulario';
import {enlaceIngresoCompra} from '@/lib/retorno-compra';
export function AccesoCompra({retorno,google}:{retorno:string;google:boolean}){
 const t=useTranslations('AccesoCompra'),c=useTranslations('CuentaCliente'),sesionIniciada=useSesionCuenta();
 if(sesionIniciada)return null;
 return <aside className="compra-acceso" aria-label={t('titulo')}>
  <div className="compra-acceso-fila">
   <div className="compra-acceso-titulo"><span>{t('titulo')}</span><Link href={enlaceIngresoCompra(retorno)}>{t('ingresar')}</Link></div>
   <p className="compra-acceso-invitado"><Link href={enlaceIngresoCompra(retorno,true)}>{t('registro')}</Link></p>
  </div>
  {google&&<div className="compra-acceso-acciones"><AccesoSocial proveedores={{google:true,facebook:false}} registro={false} aceptado={false} retorno={retorno}/></div>}
  {google&&<p className="compra-acceso-legal">{c('continuarAcepta')} <Link href="/terminos">{c('terminosCorto')}</Link> {c('yLa')} <Link href="/privacidad">{c('privacidad')}</Link> {c('aceptoFin')}</p>}
 </aside>;
}
