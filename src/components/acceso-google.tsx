'use client';
import Script from 'next/script';
import {useEffect,useRef,useState} from 'react';
import {useLocale,useTranslations} from 'next-intl';

type GoogleId={initialize:(opciones:{client_id:string;nonce:string;auto_select:boolean;callback:(respuesta:{credential:string})=>void})=>void;renderButton:(elemento:HTMLElement,opciones:{type:string;theme:string;size:string;text:string;shape:string;locale:string;width:number})=>void};
declare global{interface Window{google?:{accounts:{id:GoogleId}}}}
export function AccesoGoogle({registro,aceptado,retorno}:{registro:boolean;aceptado:boolean;retorno?:string}){
 const t=useTranslations('CuentaCliente'),idioma=useLocale();
 const contenedor=useRef<HTMLDivElement>(null);
 const [listo,setListo]=useState(false),[error,setError]=useState(''),[pendiente,setPendiente]=useState(false),[intento,setIntento]=useState(0);
 const [cargado,setCargado]=useState(false);
 const valores=useRef({registro,aceptado,retorno});
 useEffect(()=>{valores.current={registro,aceptado,retorno};},[registro,aceptado,retorno]);
 useEffect(()=>{
  if(!listo||!contenedor.current)return;
  let vigente=true;
  const nodo=contenedor.current;
  async function preparar(){
   try{
    const res=await fetch('/cuenta/google',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accion:'preparar'})});
    const config=await res.json();
    if(!vigente)return;
    if(!res.ok||!config.clientId||!config.nonce)throw new Error();
    const google=window.google?.accounts.id;
    if(!google)throw new Error();
    google.initialize({client_id:config.clientId,nonce:config.nonce,auto_select:false,callback:async({credential})=>{
     if(!vigente)return;
     setPendiente(true);setError('');
     try{
      const resultado=await fetch('/cuenta/google',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accion:'ingresar',credential,...valores.current})});
      const datos=await resultado.json();
      if(!resultado.ok){setError(typeof datos.error==='string'&&t.has(datos.error)?datos.error:'error');setIntento(v=>v+1);return;}
      // Full navigation reads the new SSR cookies; the cart remains in localStorage.
      if(typeof datos.destino!=='string'||!datos.destino.startsWith('/')||datos.destino.startsWith('//'))throw new Error();
      window.location.assign(datos.destino);
     }catch{setError('conexion');setIntento(v=>v+1);}
     finally{if(vigente)setPendiente(false);}
    }});
    nodo.replaceChildren();
    google.renderButton(nodo,{type:'standard',theme:'outline',size:'large',text:'continue_with',shape:'rectangular',locale:idioma,width:Math.min(400,nodo.clientWidth||320)});
    setCargado(true);
   }catch{if(vigente){setError('noDisponible');setCargado(false);}}
  }
  void preparar();
  return()=>{vigente=false;nodo.replaceChildren();};
 },[listo,idioma,intento,t]);
 const faltaConsentimiento=registro&&!aceptado;
 return <div className="cuenta-google" aria-busy={pendiente}>
  <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={()=>setListo(true)} onError={()=>setError('noDisponible')}/>
  {faltaConsentimiento&&<button type="button" className="cuenta-social-boton" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12}} onClick={()=>{setError('aceptacionRequerida');document.querySelector<HTMLInputElement>('#cuenta-correo-registro input[name="acepta"]')?.focus();}}><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{flexShrink:0}}><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96Z"/></svg><span>{t('continuarGoogle')}</span></button>}
  <div ref={contenedor} hidden={faltaConsentimiento||pendiente} className="cuenta-google-boton"/>
  {pendiente&&<p role="status">{t('procesando')}</p>}
  {!cargado&&!error&&!faltaConsentimiento&&<p role="status">{t('procesando')}</p>}
  {error&&!(error==='aceptacionRequerida'&&aceptado)&&<p role="alert" className="cuenta-error-formulario">{t(error)}</p>}
 </div>;
}
