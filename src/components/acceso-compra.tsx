'use client';
import Link from 'next/link';
import {useSesionCuenta} from './sesion-cuenta';
import {CircleUserRound} from 'lucide-react';
import {useTranslations} from 'next-intl';
import {AccesoSocial} from '@/app/cuenta/formulario';
import {enlaceIngresoCompra} from '@/lib/retorno-compra';
export function AccesoCompra({retorno,google}:{retorno:string;google:boolean}){
 const t=useTranslations('AccesoCompra'),c=useTranslations('CuentaCliente'),sesionIniciada=useSesionCuenta();
 if(sesionIniciada)return null;
 return <aside className="compra-acceso" aria-label={t('titulo')}>
  <div className="compra-acceso-titulo"><CircleUserRound size={24} aria-hidden="true"/><div><strong>{t('titulo')}</strong></div></div>
  <div className="compra-acceso-acciones"><Link className="boton boton-contorno" href={enlaceIngresoCompra(retorno)}>{t('ingresar')}</Link>{google&&<AccesoSocial proveedores={{google:true,facebook:false}} registro={false} aceptado={false} retorno={retorno}/>}</div>
  <p className="compra-acceso-invitado"><Link href={enlaceIngresoCompra(retorno,true)}>{t('registro')}</Link></p>
  {google&&<p className="compra-acceso-legal">{c('continuarAcepta')} <Link href="/terminos">{c('terminosCorto')}</Link> {c('yLa')} <Link href="/privacidad">{c('privacidad')}</Link> {c('aceptoFin')}</p>}
 </aside>;
}
