'use client';
import Image from 'next/image';
import {useActionState,useState,useTransition} from 'react';
import {useTranslations} from 'next-intl';
import {prepararAutenticador,verificarAutenticador} from '@/app/admin/doble-factor/acciones';
import {cerrarSesion} from '@/app/acceso/acciones';
export function FormularioMfa({factores}:{factores:{id:string;nombre:string}[]}){
 const t=useTranslations('MfaAdmin');
 const [alta,setAlta]=useState<{factor?:string;qr?:string;secreto?:string;error?:string}>({}),[mostrar,setMostrar]=useState(false),[creando,iniciar]=useTransition();
 const [estado,accion,pendiente]=useActionState(verificarAutenticador,'');
 const [factor,setFactor]=useState(factores[0]?.id??'');
 return <><div className="mfa-pasos">
 {alta.qr&&<div className="mfa-configuracion"><p>{t('escanear')}</p><Image className="mfa-qr" src={alta.qr} alt={t('qrAlt')} width={220} height={220} unoptimized/><details><summary>{t('manual')}</summary><label>{t('claveManual')}<input readOnly type={mostrar?'text':'password'} value={alta.secreto??''} autoComplete="off" spellCheck={false}/></label><button type="button" className="boton boton-contorno" aria-pressed={mostrar} onClick={()=>setMostrar(!mostrar)}>{t(mostrar?'ocultar':'mostrar')}</button><small>{t('noCompartir')}</small></details></div>}
 {alta.error&&<p role="alert">{t(alta.error)}</p>}
 {(factores.length>0||alta.factor)&&<form id="mfa-verificacion" action={accion} className="formulario">
 {factores.length>1?<label>{t('dispositivo')}<select name="factor" value={factor} onChange={e=>setFactor(e.target.value)}>{factores.map(f=><option key={f.id} value={f.id}>{f.nombre}</option>)}</select></label>:<input type="hidden" name="factor" value={alta.factor??factor}/>}
 <label>{t('codigo')}<input name="codigo" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required aria-describedby="mfa-ayuda"/></label><small id="mfa-ayuda">{t('codigoAyuda')}</small>
 {estado&&<p role="alert">{t(estado)}</p>}
 </form>}
 </div><div className="mfa-acciones">
 {(factores.length>0||alta.factor)?<button type="submit" form="mfa-verificacion" className="boton boton-azul" disabled={pendiente}>{t(pendiente?'verificando':'verificar')}</button>:<button type="button" className="boton boton-azul" disabled={creando} onClick={()=>iniciar(async()=>{const r=await prepararAutenticador();setAlta(r);})}>{t(creando?'preparando':'configurar')}</button>}
 <form action={cerrarSesion}><button className="boton boton-contorno">{t('salir')}</button></form>
 </div></>;
}
