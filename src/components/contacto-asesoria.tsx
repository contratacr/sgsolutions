'use client';
import {useState} from 'react';
import {useLocale,useTranslations} from 'next-intl';

export function ContactoAsesoria(){
 const t=useTranslations('Asesoria'),idioma=useLocale();
 const [ocupado,setOcupado]=useState(false),[error,setError]=useState(''),[referencia,setReferencia]=useState('');
 async function enviar(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(ocupado)return;
  const datos=new FormData(e.currentTarget),nombre=String(datos.get('nombre')??'').trim(),telefono=String(datos.get('telefono')??'').replace(/[+\s()-]/g,''),necesidad=String(datos.get('necesidad')??'').trim();
  if(nombre.length<2||!/^[1-9]\d{9,14}$/.test(telefono)||necesidad.length<5||!datos.get('consentimiento')){setError(t('errorContacto'));return;}
  setOcupado(true);setError('');
  try{const r=await fetch('/api/asesoria',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({idioma,articulos:[],contacto:{nombre,telefono,necesidad},consentimiento:true})});const d=await r.json();if(!r.ok||typeof d.referencia!=='string')throw new Error();setReferencia(d.referencia);}catch{setError(t('errorSolicitud'));}finally{setOcupado(false);}
 }
 return <details className="contacto-asesoria"><summary>{t('contactarme')}</summary>{referencia?<p role="status">{t('consultaGuardada',{referencia})}</p>:<form onSubmit={enviar} noValidate><p>{t('contactoTexto')}</p><div className="contacto-asesoria-datos"><label>{t('nombre')}<input name="nombre" autoComplete="name" minLength={2} maxLength={100} required/></label><label>{t('telefono')}<input name="telefono" type="tel" autoComplete="tel" maxLength={25} placeholder={t('telefonoEjemplo')} required/></label></div><label>{t('necesidad')}<textarea name="necesidad" minLength={5} maxLength={1000} rows={3} required/></label><label className="contacto-asesoria-consentimiento"><input type="checkbox" name="consentimiento" required/>{t('consentimiento')}</label>{error&&<p role="alert">{error}</p>}<button className="boton boton-azul" disabled={ocupado}>{t(ocupado?'preparando':'enviarConsulta')}</button></form>}</details>;
}
