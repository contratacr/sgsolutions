'use client';
import {useId,useState} from 'react';
import {useTranslations} from 'next-intl';
import * as Dialog from '@radix-ui/react-dialog';
import {X} from 'lucide-react';
import {esquemaContactoAsesoria,type ContactoAsesoriaDatos} from '@/lib/contacto-asesoria';

export function DatosAsesoria({abierto,cerrar,enviar,ocupado,error}:{abierto:boolean;cerrar:()=>void;enviar:(datos:ContactoAsesoriaDatos)=>Promise<void>;ocupado:boolean;error:boolean}){
 const t=useTranslations('Asesoria'),n=useTranslations('Navegacion'),prefijo=useId();
 const [errores,setErrores]=useState<Record<string,string>>({});
 async function confirmar(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(ocupado)return;
  const form=new FormData(e.currentTarget),resultado=esquemaContactoAsesoria.safeParse(Object.fromEntries(['nombre','correo','telefono','tipoIdentificacion','identificacion','necesidad'].map(k=>[k,String(form.get(k)??'')])));
  const fallos:Record<string,string>={};
  if(!resultado.success)for(const issue of resultado.error.issues){const key=String(issue.path[0]);fallos[key]=t(key==='nombre'?'errorNombre':key==='telefono'?'errorTelefono':key==='correo'?'errorCorreo':'errorIdentificacion');}
  if(!form.get('consentimiento'))fallos.consentimiento=t('errorConsentimiento');
  setErrores(fallos);
  if(Object.keys(fallos).length){(e.currentTarget.elements.namedItem(Object.keys(fallos)[0]) as HTMLElement)?.focus();return;}
  if(resultado.success)await enviar(resultado.data);
 }
 return <Dialog.Root open={abierto} onOpenChange={v=>{if(!v&&!ocupado)cerrar();}}><Dialog.Portal><Dialog.Overlay className="contacto-asesoria-overlay"/><Dialog.Content className="contacto-asesoria contacto-asesoria-modal"><div className="contacto-asesoria-cabecera"><Dialog.Title>{t('datosTitulo')}</Dialog.Title><Dialog.Close className="boton-icono" disabled={ocupado} aria-label={n('cerrar')}><X size={22} aria-hidden="true"/></Dialog.Close></div><Dialog.Description>{t('datosTexto')}</Dialog.Description><form onSubmit={confirmar} noValidate><div className="contacto-asesoria-datos">
 {(['nombre','correo','telefono'] as const).map(k=><label key={k}>{t(k)}<input name={k} type={k==='correo'?'email':k==='telefono'?'tel':'text'} autoComplete={k==='nombre'?'name':k==='correo'?'email':'tel'} defaultValue={k==='telefono'?'+506 ':undefined} required maxLength={k==='telefono'?25:150} aria-invalid={Boolean(errores[k])} aria-describedby={errores[k]?`${prefijo}-${k}`:undefined}/>{errores[k]&&<span className="contacto-error" id={`${prefijo}-${k}`} role="alert">{errores[k]}</span>}</label>)}
 <label>{t('tipoIdentificacion')}<select name="tipoIdentificacion" defaultValue="fisica"><option value="fisica">{t('fisica')}</option><option value="juridica">{t('juridica')}</option></select></label>
 <label>{t('identificacion')}<input name="identificacion" required maxLength={30} aria-invalid={Boolean(errores.identificacion)} aria-describedby={errores.identificacion?`${prefijo}-identificacion`:undefined}/>{errores.identificacion&&<span className="contacto-error" id={`${prefijo}-identificacion`} role="alert">{errores.identificacion}</span>}</label></div>
 <label>{t('necesidad')}<textarea name="necesidad" rows={2} maxLength={1000}/></label>
 <label className="contacto-asesoria-consentimiento"><input type="checkbox" name="consentimiento" required aria-invalid={Boolean(errores.consentimiento)} aria-describedby={errores.consentimiento?`${prefijo}-consentimiento`:undefined}/>{t('consentimiento')}</label>{errores.consentimiento&&<p id={`${prefijo}-consentimiento`} role="alert">{errores.consentimiento}</p>}
 <p className="asesoria-siguiente-paso">{t('regreso')}</p>{error&&<p role="alert">{t('errorSolicitud')}</p>}
 <button className="boton boton-azul" disabled={ocupado}>{t(ocupado?'preparando':'continuarWhatsapp')}<span className="sr-only">{n('nuevaPestana')}</span></button></form></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
