'use client';
import {useActionState,useState} from 'react';
import {useTranslations} from 'next-intl';
import {cambiarCorreoCuenta,solicitarCambioClaveCuenta,desactivarCuentaPropia,type EstadoSeguridad} from './seguridad-acciones';
import {IndicadorCampo} from '@/components/indicador-campo';
import {cerrarSesionCliente} from './acciones';

function segura(accion:(estado:EstadoSeguridad,datos:FormData)=>Promise<EstadoSeguridad>){return async(estado:EstadoSeguridad,datos:FormData):Promise<EstadoSeguridad>=>{try{return await accion(estado,datos);}catch{return 'error';}};}
const correoSeguro=segura(cambiarCorreoCuenta),claveSegura=segura(solicitarCambioClaveCuenta),bajaSegura=segura(desactivarCuentaPropia);

function Mensaje({estado}:{estado:EstadoSeguridad}){
 const t=useTranslations('SeguridadCuenta');
 if(estado==='inicio')return null;
 const exito=['correoEnviado','recuperacionEnviada'].includes(estado);
 return <p role={exito?'status':'alert'} className={`cuenta-aviso${exito?'':' cuenta-error'}`}>{t(estado)}</p>;
}
export function SeguridadCuenta({correo,administrador}:{correo:string;administrador:boolean}){
 const t=useTranslations('SeguridadCuenta');
 const [correoNuevo,setCorreoNuevo]=useState(''),[confirmacion,setConfirmacion]=useState(''),[acepta,setAcepta]=useState(false);
 const [estadoCorreo,accionCorreo,enviandoCorreo]=useActionState(correoSeguro,'inicio' as EstadoSeguridad);
 const [estadoClave,accionClave,enviandoClave]=useActionState(claveSegura,'inicio' as EstadoSeguridad);
 const [estadoBaja,accionBaja,enviandoBaja]=useActionState(bajaSegura,'inicio' as EstadoSeguridad);
 return <section className="cuenta-bloque cuenta-seguridad" aria-labelledby="cuenta-seguridad-titulo"><h2 id="cuenta-seguridad-titulo">{t('titulo')}</h2>
  <section><h3>{t('correoTitulo')}</h3><p>{t('correoActual')} <strong>{correo}</strong></p><p>{t('correoDetalle')}</p><form action={accionCorreo} onReset={e=>e.preventDefault()} className="cuenta-formulario" aria-busy={enviandoCorreo}><label htmlFor="seguridad-correo">{t('correoNuevo')}<IndicadorCampo obligatorio/></label><input id="seguridad-correo" name="correo" value={correoNuevo} onChange={e=>setCorreoNuevo(e.target.value)} type="email" autoComplete="email" required maxLength={254}/><Mensaje estado={estadoCorreo}/><button className="boton boton-azul" disabled={enviandoCorreo}>{t(enviandoCorreo?'enviando':'cambiarCorreo')}</button></form></section>
  <section><h3>{t('claveTitulo')}</h3><p>{t('claveDetalle')}</p><form action={accionClave} aria-busy={enviandoClave}><Mensaje estado={estadoClave}/><button className="boton boton-contorno" disabled={enviandoClave||estadoClave==='recuperacionEnviada'}>{t(enviandoClave?'enviando':'cambiarClave')}</button></form></section>
  {!administrador&&<section className="cuenta-desactivar"><details><summary>{t('desactivarTitulo')}</summary><p>{t('desactivarDetalle')}</p><form action={accionBaja} onReset={e=>e.preventDefault()} className="cuenta-formulario" aria-busy={enviandoBaja}><label htmlFor="seguridad-confirmacion">{t('confirmacion')}<IndicadorCampo obligatorio/></label><input id="seguridad-confirmacion" name="confirmacion" value={confirmacion} onChange={e=>setConfirmacion(e.target.value)} type="email" autoComplete="off" required maxLength={254}/><label className="cuenta-aceptacion"><input name="acepta" type="checkbox" value="si" required checked={acepta} onChange={e=>setAcepta(e.target.checked)}/><span>{t('aceptoDesactivar')}<IndicadorCampo obligatorio/></span></label><Mensaje estado={estadoBaja}/><button className="boton cuenta-boton-peligro" disabled={enviandoBaja}>{t('desactivar')}</button></form>{estadoBaja==='reautenticar'&&<form action={cerrarSesionCliente}><button className="boton boton-contorno">{t('salirReautenticar')}</button></form>}</details></section>}
 </section>;
}
