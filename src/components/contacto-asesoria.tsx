'use client';
import {useId,useState} from 'react';
import {useLocale,useTranslations} from 'next-intl';
import * as Dialog from '@radix-ui/react-dialog';
import {X} from 'lucide-react';

import {normalizarTelefonoWhatsApp} from '@/lib/telefono-whatsapp';

export function ContactoAsesoria(){
 const t=useTranslations('Asesoria'),n=useTranslations('Nav'),idioma=useLocale();
 const prefijo=useId();
 const [abierto,setAbierto]=useState(false);
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
 return <Dialog.Root open={abierto} onOpenChange={setAbierto}><Dialog.Trigger className="contacto-asesoria-trigger">{t('contactarme')}</Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="contacto-asesoria-overlay" onClick={()=>setAbierto(false)}/><Dialog.Content className="contacto-asesoria contacto-asesoria-modal"><div className="contacto-asesoria-cabecera"><Dialog.Title>{t('contactarme')}</Dialog.Title><Dialog.Close className="boton-icono" aria-label={n('cerrar')}><X size={22} aria-hidden="true"/></Dialog.Close></div><Dialog.Description>{t('contactoTexto')}</Dialog.Description>{referencia?<p role="status">{t('consultaGuardada',{referencia})}</p>:<form onSubmit={enviar} noValidate><div className="contacto-asesoria-datos"><label>{t('nombre')}<input name="nombre" autoComplete="name" minLength={2} maxLength={100} required aria-invalid={Boolean(errores.nombre)} aria-describedby={errores.nombre?`${prefijo}-nombre`:undefined}/>{errores.nombre&&<span className="contacto-error" id={`${prefijo}-nombre`} role="alert">{errores.nombre}</span>}</label><label>{t('telefono')}<input name="telefono" type="tel" autoComplete="tel" inputMode="tel" defaultValue="+506 " maxLength={25} required aria-invalid={Boolean(errores.telefono)} aria-describedby={errores.telefono?`${prefijo}-telefono`:undefined}/>{errores.telefono&&<span className="contacto-error" id={`${prefijo}-telefono`} role="alert">{errores.telefono}</span>}</label></div><label>{t('necesidad')}<textarea name="necesidad" maxLength={1000} rows={2}/></label><label className="contacto-asesoria-consentimiento"><input type="checkbox" name="consentimiento" required aria-invalid={Boolean(errores.consentimiento)} aria-describedby={errores.consentimiento?`${prefijo}-consentimiento`:undefined}/>{t('consentimiento')}</label>{errores.consentimiento&&<p className="contacto-error" id={`${prefijo}-consentimiento`} role="alert">{errores.consentimiento}</p>}{error&&<p role="alert">{error}</p>}<button className="boton boton-azul" disabled={ocupado}>{t(ocupado?'preparando':'enviarConsulta')}</button></form>}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}
