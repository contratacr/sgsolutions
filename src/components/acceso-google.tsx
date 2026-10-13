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
  {faltaConsentimiento&&<button type="button" className="cuenta-social-boton" onClick={()=>{setError('aceptacionRequerida');document.querySelector<HTMLInputElement>('#cuenta-correo-registro input[name="acepta"]')?.focus();}}>{t('continuarGoogle')}</button>}
  <div ref={contenedor} hidden={faltaConsentimiento||pendiente} className="cuenta-google-boton"/>
  {pendiente&&<p role="status">{t('procesando')}</p>}
  {!cargado&&!error&&!faltaConsentimiento&&<p role="status">{t('procesando')}</p>}
  {error&&!(error==='aceptacionRequerida'&&aceptado)&&<p role="alert" className="cuenta-error-formulario">{t(error)}</p>}
 </div>;
}
