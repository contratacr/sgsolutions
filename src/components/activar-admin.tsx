'use client';
import Link from 'next/link';
import {useActionState,useEffect,useRef,useState} from 'react';
import {useTranslations} from 'next-intl';
import {aceptarInvitacion,guardarClave} from '@/app/admin/activar/acciones';
import {MINIMO_CLAVE_CUENTA} from '@/lib/cuenta-validacion';
import {RequisitosClave} from './requisitos-clave';
export function ActivarAdmin(){
 const t=useTranslations('Activacion');
 const [estado,setEstado]=useState('validando');
 const [clave,setClave]=useState('');
 const inicio=useRef<Promise<boolean>|null>(null);
 const [resultado,accion,pendiente]=useActionState(guardarClave,'');
 useEffect(()=>{
  if(!inicio.current){
   const params=new URLSearchParams(window.location.hash.slice(1));
   const access=params.get('access_token'),refresh=params.get('refresh_token');
   const tipo=params.get('type');
   window.history.replaceState(null,'',window.location.pathname);
   inicio.current=access&&refresh&&!params.has('error')&&['invite','recovery'].includes(tipo??'')?aceptarInvitacion(access,refresh):Promise.resolve(false);
  }
  let activo=true;
  inicio.current.then(ok=>{if(activo)setEstado(ok?'formulario':'invalido');}).catch(()=>{if(activo)setEstado('invalido');});
  return ()=>{activo=false;};
 },[]);
 return <main id="contenido" className="acceso"><section className="acceso-tarjeta"><p className="etiqueta">{t('marca')}</p><h1>{t('titulo')}</h1>{estado==='validando'?<p role="status">{t('validando')}</p>:estado==='invalido'||resultado==='invalido'?<><p role="alert">{t('invalido')}</p><Link className="boton boton-azul" href="/admin">{t('volver')}</Link></>:resultado==='listo'?<><p role="status">{t('listo')}</p><Link className="boton boton-azul" href="/admin">{t('entrar')}</Link></>:<><p>{t('descripcion')}</p><form action={accion} className="formulario"><label>{t('clave')}<input name="clave" type="password" autoComplete="new-password" minLength={MINIMO_CLAVE_CUENTA} maxLength={128} required value={clave} onChange={e=>setClave(e.target.value)}/></label><RequisitosClave valor={clave}/><label>{t('confirmacion')}<input name="confirmacion" type="password" autoComplete="new-password" minLength={MINIMO_CLAVE_CUENTA} maxLength={128} required/></label>{resultado&&<p role="alert">{t(resultado)}</p>}<button className="boton boton-azul" disabled={pendiente}>{t(pendiente?'guardando':'guardar')}</button></form></>}</section></main>;
}
