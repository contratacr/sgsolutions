'use client';
import {useId,useState} from 'react';
import {useLocale,useTranslations} from 'next-intl';

import {normalizarTelefonoWhatsApp} from '@/lib/telefono-whatsapp';

export function ContactoAsesoria(){
 const t=useTranslations('Asesoria'),idioma=useLocale();
 const prefijo=useId();
 const [errores,setErrores]=useState<Record<string,string>>({});
 const [ocupado,setOcupado]=useState(false),[error,setError]=useState(''),[referencia,setReferencia]=useState('');
 async function enviar(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(ocupado)return;
  const datos=new FormData(e.currentTarget),nombre=String(datos.get('nombre')??'').trim(),telefono=normalizarTelefonoWhatsApp(String(datos.get('telefono')??'')),necesidad=String(datos.get('necesidad')??'').trim();
  const fallos:Record<string,string>={};
  if(nombre.length<2)fallos.nombre=t('errorNombre');
  if(!telefono)fallos.telefono=t('errorTelefono');
  if(!datos.get('consentimiento'))fallos.consentimiento=t('errorConsentimiento');
  setErrores(fallos);setError('');
  if(Object.keys(fallos).length){(e.currentTarget.elements.namedItem(Object.keys(fallos)[0]) as HTMLElement)?.focus();return;}
  setOcupado(true);setError('');
  try{const r=await fetch('/api/asesoria',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idioma,articulos:[],contacto:{nombre,telefono,necesidad},consentimiento:true})});const d=await r.json();if(!r.ok||typeof d.referencia!=='string')throw new Error();setReferencia(d.referencia);}catch{setError(t('errorSolicitud'));}finally{setOcupado(false);}
 }
 return <details className="contacto-asesoria"><summary>{t('contactarme')}</summary>{referencia?<p role="status">{t('consultaGuardada',{referencia})}</p>:<form onSubmit={enviar} noValidate><p>{t('contactoTexto')}</p><div className="contacto-asesoria-datos"><label>{t('nombre')}<input name="nombre" autoComplete="name" minLength={2} maxLength={100} required aria-invalid={Boolean(errores.nombre)} aria-describedby={errores.nombre?`${prefijo}-nombre`:undefined}/>{errores.nombre&&<span className="contacto-error" id={`${prefijo}-nombre`} role="alert">{errores.nombre}</span>}</label><label>{t('telefono')}<input name="telefono" type="tel" autoComplete="tel" inputMode="tel" defaultValue="+506 " maxLength={25} required aria-invalid={Boolean(errores.telefono)} aria-describedby={`${prefijo}-ayuda${errores.telefono?` ${prefijo}-telefono`:''}`}/><small id={`${prefijo}-ayuda`}>{t('telefonoAyuda')}</small>{errores.telefono&&<span className="contacto-error" id={`${prefijo}-telefono`} role="alert">{errores.telefono}</span>}</label></div><label>{t('necesidad')}<textarea name="necesidad" maxLength={1000} rows={2}/></label><label className="contacto-asesoria-consentimiento"><input type="checkbox" name="consentimiento" required aria-invalid={Boolean(errores.consentimiento)} aria-describedby={errores.consentimiento?`${prefijo}-consentimiento`:undefined}/>{t('consentimiento')}</label>{errores.consentimiento&&<p className="contacto-error" id={`${prefijo}-consentimiento`} role="alert">{errores.consentimiento}</p>}{error&&<p role="alert">{error}</p>}<button className="boton boton-azul" disabled={ocupado}>{t(ocupado?'preparando':'enviarConsulta')}</button></form>}</details>;
}
