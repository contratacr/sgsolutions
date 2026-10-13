'use client';
import { useActionState, useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff, Mail } from 'lucide-react';
import { MINIMO_CLAVE_CUENTA } from '@/lib/cuenta-validacion';
import {IndicadorCampo} from '@/components/indicador-campo';
import {AccesoGoogle} from '@/components/acceso-google';
import {RequisitosClave} from '@/components/requisitos-clave';
import { accederCliente, actualizarClaveCliente, type EstadoAccesoCliente } from './acciones';

// También manejar fallos de transporte de Server Actions sin desmontar el formulario.
function accionSegura(accion:(estado:EstadoAccesoCliente,datos:FormData)=>Promise<EstadoAccesoCliente>) {
  return async (estado:EstadoAccesoCliente,datos:FormData):Promise<EstadoAccesoCliente>=>{
    try{return await accion(estado,datos);}catch{return 'conexion';}
  };
}
const accederSeguro=accionSegura(accederCliente);

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
  return proveedores.google?<div className="cuenta-social"><AccesoGoogle registro={registro} aceptado={aceptado} retorno={retorno}/></div>:null;
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
