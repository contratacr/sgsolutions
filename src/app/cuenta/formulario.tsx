'use client';
import { useActionState, useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff, Facebook, Mail } from 'lucide-react';
import { MINIMO_CLAVE_CUENTA } from '@/lib/cuenta-validacion';
import {IndicadorCampo} from '@/components/indicador-campo';
import {RequisitosClave} from '@/components/requisitos-clave';
import { accederCliente, actualizarClaveCliente, accederCuentaSocial, type EstadoAccesoCliente } from './acciones';

// También manejar fallos de transporte de Server Actions sin desmontar el formulario.
function accionSegura(accion:(estado:EstadoAccesoCliente,datos:FormData)=>Promise<EstadoAccesoCliente>) {
  return async (estado:EstadoAccesoCliente,datos:FormData):Promise<EstadoAccesoCliente>=>{
    try{return await accion(estado,datos);}catch{return 'conexion';}
  };
}
const accederSeguro=accionSegura(accederCliente);
const socialSeguro=accionSegura(accederCuentaSocial);
const claveSegura=accionSegura(actualizarClaveCliente);
type Modo = 'login' | 'registro' | 'recuperar' | 'reenviar';
function CampoClave({confirmar=false,nueva=false}:{confirmar?:boolean;nueva?:boolean}) {
  const t=useTranslations('CuentaCliente');
  const [visible,setVisible]=useState(false);
  const [valor,setValor]=useState('');
  const id=confirmar?'confirmar-cuenta':'clave-cuenta';
  return <div className="cuenta-campo"><label htmlFor={id}>{t(confirmar?'confirmarClave':'clave')}<IndicadorCampo obligatorio/></label><div className="cuenta-clave"><input id={id} name={confirmar?'confirmar':'clave'} type={visible?'text':'password'} autoComplete={nueva?'new-password':'current-password'} placeholder={t(confirmar?'confirmarClaveEjemplo':'claveEjemplo')} required minLength={nueva?MINIMO_CLAVE_CUENTA:1} maxLength={128} value={valor} onChange={e=>setValor(e.target.value)}/><button type="button" aria-label={t(visible?'ocultarClave':'mostrarClave')} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<Eye size={20} aria-hidden="true"/>:<EyeOff size={20} aria-hidden="true"/>}</button></div>{nueva&&!confirmar&&<RequisitosClave valor={valor}/>}</div>;
}
function AceptacionCuenta({aceptado,cambiar}:{aceptado:boolean;cambiar:(valor:boolean)=>void}) {
  const t=useTranslations('CuentaCliente');
  return <label className="cuenta-aceptacion"><input type="checkbox" name="acepta" value="si" checked={aceptado} onChange={e=>cambiar(e.target.checked)} required/><span>{t('aceptoInicio')} <a href="/terminos">{t('terminos')}</a> {t('aceptoDatos')} <a href="/privacidad">{t('privacidad')}</a> {t('aceptoFin')}<IndicadorCampo obligatorio/></span></label>;
}
function AccesoFormulario({modo,cambiar,aceptado,cambiarAceptacion,retorno}:{modo:Modo;cambiar:(modo:Modo)=>void;aceptado:boolean;cambiarAceptacion:(valor:boolean)=>void;retorno?:string}) {
  const t=useTranslations('CuentaCliente');
  const [estado,accion,pendiente]=useActionState(accederSeguro,'inicio' as EstadoAccesoCliente);
  const [nombre,setNombre]=useState(''),[correo,setCorreo]=useState('');
  const aviso=useRef<HTMLParagraphElement>(null);
  useEffect(()=>{if(estado!=='inicio')aviso.current?.focus();},[estado,pendiente]);
  const exito=['registroEnviado','recuperacionEnviada','confirmacionEnviada'].includes(estado);
  return <>
    {(modo==='recuperar'||modo==='reenviar')&&<p className="cuenta-explicacion">{t(modo==='recuperar'?'recuperarDetalle':'reenviarDetalle')}</p>}
    <form id={modo==='registro'?'cuenta-correo-registro':undefined} action={accion} className="cuenta-formulario" aria-busy={pendiente}>
      <input type="hidden" name="modo" value={modo}/><input type="hidden" name="retorno" value={retorno??''}/>
      {modo==='registro'&&<div className="cuenta-campo"><label htmlFor="nombre-cuenta">{t('nombre')}<IndicadorCampo obligatorio/></label><input id="nombre-cuenta" name="nombre" autoComplete="name" required minLength={2} maxLength={150} value={nombre} onChange={e=>setNombre(e.target.value)}/></div>}
      <div className="cuenta-campo"><label htmlFor="correo-cuenta">{t('correo')}<IndicadorCampo obligatorio/></label><input id="correo-cuenta" name="correo" type="email" required autoComplete="email" maxLength={254} placeholder={t('correoEjemplo')} value={correo} onChange={e=>setCorreo(e.target.value)}/></div>
      {(modo==='login'||modo==='registro')&&<CampoClave key={String(exito)} nueva={modo==='registro'}/>}
      {modo==='registro'&&<><CampoClave key={String(exito)} confirmar nueva/></>}
      {modo==='login'&&<button type="button" className="cuenta-enlace" onClick={()=>cambiar('recuperar')}>{t('olvidoClave')}</button>}
      {estado!=='inicio'&&<p ref={aviso} tabIndex={-1} role={exito?'status':'alert'} className={exito?'cuenta-aviso':`cuenta-error-formulario${estado==='confirmarCorreo'?' cuenta-informacion':''}`}>{estado==='confirmarCorreo'&&<Mail size={20} aria-hidden="true"/>}<span>{t(estado)}</span></p>}
      {modo==='registro'&&<AceptacionCuenta aceptado={aceptado} cambiar={cambiarAceptacion}/>}
      <button className="boton boton-azul cuenta-enviar" disabled={pendiente||exito}>{t(pendiente?'procesando':modo==='registro'?'registrarme':modo==='login'?'iniciarSesion':modo==='recuperar'?'enviarRecuperacion':'reenviarConfirmacion')}</button>
      {modo==='login'&&estado==='confirmarCorreo'&&<button type="button" className="cuenta-enlace" onClick={()=>cambiar('reenviar')}>{t('reenviarConfirmacion')}</button>}
      {(modo==='recuperar'||modo==='reenviar')&&<button type="button" className="cuenta-enlace" onClick={()=>cambiar('login')}>{t('volverLogin')}</button>}
    </form>
  </>;
}
export function AccesoSocial({proveedores,registro,aceptado,retorno}:{proveedores:{google:boolean;facebook:boolean};registro:boolean;aceptado:boolean;retorno?:string}) {
  const t=useTranslations('CuentaCliente');
  const [estado,accion,pendiente]=useActionState(socialSeguro,'inicio' as EstadoAccesoCliente);
  if (!proveedores.google&&!proveedores.facebook) return null;
  return <div className="cuenta-social"><form action={accion}>
    <input type="hidden" name="modo" value={registro?'registro':'login'}/><input type="hidden" name="retorno" value={retorno??''}/>
    <input type="hidden" name="acepta" value={aceptado?'si':'no'}/>
    {proveedores.google&&<button className="cuenta-social-boton" name="proveedor" value="google" disabled={pendiente}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.31 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.62-2.41l-3.23-2.51c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 13.92A6 6 0 0 1 6.1 12c0-.67.11-1.31.31-1.92V7.49H3.07A10 10 0 0 0 2 12c0 1.61.38 3.14 1.07 4.51l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.83 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59A5.99 5.99 0 0 1 12 5.96Z"/></svg>{t('continuarGoogle')}</button>}
    {proveedores.facebook&&<button className="cuenta-social-boton" name="proveedor" value="facebook" disabled={pendiente}><Facebook aria-hidden="true" size={20}/>{t('continuarFacebook')}</button>}
  </form>{estado!=='inicio'&&<p role="alert" className="cuenta-error-formulario">{t(estado)}</p>}</div>;
}
export function FormularioCuenta({proveedores={google:false,facebook:false},retorno,inicial='login'}:{proveedores?:{google:boolean;facebook:boolean};retorno?:string;inicial?:'login'|'registro'}) {
  const t=useTranslations('CuentaCliente');
  const [modo,setModo]=useState<Modo>(inicial);
  const [aceptado,setAceptado]=useState(false);
  const registroSocial=modo==='registro'&&(proveedores.google||proveedores.facebook);
  return <div className="cuenta-acceso">
    <h2 className="cuenta-acceso-titulo">{t(modo==='registro'?'crearCuenta':modo==='login'?'iniciarSesion':modo==='recuperar'?'olvidoClave':'reenviarConfirmacion')}</h2>
    {registroSocial&&<div className="cuenta-registro-social">
      <AccesoSocial retorno={retorno} key={modo} proveedores={proveedores} registro aceptado={aceptado}/>
      <div className="cuenta-divisor"><span>{t('o')}</span></div>
    </div>}
    <AccesoFormulario retorno={retorno} key={modo} modo={modo} cambiar={setModo} aceptado={aceptado} cambiarAceptacion={setAceptado}/>
    {modo==='login'&&(proveedores.google||proveedores.facebook)&&<><div className="cuenta-divisor"><span>{t('o')}</span></div><AccesoSocial retorno={retorno} key={modo} proveedores={proveedores} registro={false} aceptado={aceptado}/></>}
    {modo==='login'&&<p className="cuenta-aviso-legal">{t('continuarAcepta')} <a href="/terminos">{t('terminosCorto')}</a> {t('yLa')} <a href="/privacidad">{t('privacidad')}</a> {t('aceptoFin')}</p>}
    {(modo==='login'||modo==='registro')&&<p className="cuenta-cambio">{t(modo==='login'?'sinCuenta':'conCuenta')} <button type="button" className="cuenta-enlace" onClick={()=>setModo(modo==='login'?'registro':'login')}>{t(modo==='login'?'registrarseEnlace':'iniciarSesion')}</button></p>}

  </div>;
}
export function FormularioNuevaClave() {
  const t=useTranslations('CuentaCliente');
  const [estado,accion,pendiente]=useActionState(claveSegura,'inicio' as EstadoAccesoCliente);
  return <form action={accion} className="cuenta-formulario" aria-busy={pendiente}><CampoClave nueva/><CampoClave confirmar nueva/>{estado!=='inicio'&&<p role="alert" className="cuenta-error-formulario">{t(estado)}</p>}{estado==='sesionVencida'&&<a className="cuenta-enlace" href="/cuenta">{t('olvidoClave')}</a>}<button className="boton boton-azul cuenta-enviar" disabled={pendiente}>{t(pendiente?'procesando':'guardarClave')}</button></form>;
}
