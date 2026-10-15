'use client';
import {useEffect,useRef,useState} from 'react';
import {useTranslations} from 'next-intl';
import {accederCliente,verificarCodigoCuenta} from './acciones';
export function ConfirmarCodigo({correo,retorno,volver}:{correo:string;retorno?:string;volver:()=>void}){
 const t=useTranslations('CuentaCliente');
 const [codigo,setCodigo]=useState(''),[espera,setEspera]=useState(60),[pendiente,setPendiente]=useState(false),[error,setError]=useState(''),[enviado,setEnviado]=useState(false);
 const input=useRef<HTMLInputElement>(null),disponibleDesde=useRef(0);
 useEffect(()=>{input.current?.focus();disponibleDesde.current=Date.now()+60000;const timer=setInterval(()=>setEspera(Math.max(0,Math.ceil((disponibleDesde.current-Date.now())/1000))),1000);return()=>clearInterval(timer);},[]);
 async function verificar(e:React.FormEvent){
  e.preventDefault();if(pendiente)return;setPendiente(true);setError('');
  try{const resultado=await verificarCodigoCuenta(correo,codigo,retorno);if(resultado.destino){window.location.assign(resultado.destino);return;}setError(resultado.error??'error');}catch{setError('conexion');}
  setPendiente(false);
 }
 async function reenviar(){
  if(espera||pendiente)return;setPendiente(true);setError('');setEnviado(false);
  try{const datos=new FormData();datos.set('modo','reenviar');datos.set('correo',correo);if(retorno)datos.set('retorno',retorno);
   const resultado=await accederCliente('inicio',datos);
   if(resultado==='confirmacionEnviada'){disponibleDesde.current=Date.now()+60000;setEspera(60);setCodigo('');setEnviado(true);input.current?.focus();}else setError(resultado);
  }catch{setError('conexion');}finally{setPendiente(false);}
 }
 return <section className="cuenta-codigo" aria-labelledby="codigo-titulo">
  <h3 id="codigo-titulo">{t('codigoTitulo')}</h3><p>{t('codigoDetalle',{correo})}</p>
  <form onSubmit={verificar} aria-busy={pendiente}>
   <div className="cuenta-codigo-casillas">
    <input ref={input} aria-label={t('codigoEtiqueta')} aria-describedby="codigo-ayuda" aria-invalid={Boolean(error)} value={codigo} onChange={e=>{setCodigo(e.target.value.replace(/\D/g,'').slice(0,6));setError('');}} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required/>
    <div aria-hidden="true">{Array.from({length:6},(_,i)=><span key={i} className={i===Math.min(codigo.length,5)?'activo':''}>{codigo[i]??''}</span>)}</div>
   </div>
   {error&&<p role="alert" className="cuenta-error-formulario">{t(t.has(error)?error:'error')}</p>}
   {enviado&&<p role="status">{t('codigoEnviado')}</p>}
   <button className="boton boton-azul" disabled={pendiente||codigo.length!==6}>{t(pendiente?'procesando':'codigoVerificar')}</button>
  </form>
  <button type="button" className="cuenta-enlace" disabled={espera>0||pendiente} onClick={reenviar}>{espera?t('codigoEspera',{segundos:espera}):t('codigoReenviar')}</button>
  <p id="codigo-ayuda">{t('codigoSpam')}</p><button type="button" className="cuenta-enlace" onClick={volver}>{t('volverLogin')}</button>
 </section>;
}
