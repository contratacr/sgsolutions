'use client';
import {useActionState} from 'react';
import {useTranslations} from 'next-intl';
import {guardarContactoComercial} from '@/app/panel/estadisticas/contactos-acciones';
import {etapasContacto,fuentesContacto,type ContactoGuardado} from '@/lib/contactos-comerciales-modelo';
export function ContactoComercialFormulario({contacto,hoy,id}:{contacto?:ContactoGuardado;hoy:string;id:string}){
 const t=useTranslations('ContactosComerciales');const [resultado,accion,pendiente]=useActionState(guardarContactoComercial,'');
 return <form action={accion} className="contacto-comercial-form">
  <input type="hidden" name="id" value={contacto?.id??id}/><input type="hidden" name="revision" value={contacto?.revision??0}/>
  <label>{t('referencia')}<input name="referencia" required minLength={3} maxLength={40} pattern="[A-Za-z0-9_-]{3,40}" defaultValue={contacto?.referencia??''}/><small>{t('referenciaAyuda')}</small></label>
  <label>{t('fecha')}<input type="date" name="fecha" required min="2026-01-01" max={hoy} defaultValue={contacto?.fecha??hoy}/></label>
  <label>{t('canal')}<select name="canal" defaultValue={contacto?.canal??'whatsapp'}>{['whatsapp','formulario','telefono','correo'].map(v=><option key={v} value={v}>{t(v)}</option>)}</select></label>
  <label>{t('fuente')}<select name="fuente" defaultValue={contacto?.fuente??'sin_confirmar'}>{fuentesContacto.map(v=><option key={v} value={v}>{t(v)}</option>)}</select><small>{t('fuenteAyuda')}</small></label>
  <label>{t('etapa')}<select name="etapa" defaultValue={contacto?.etapa??'recibido'}>{etapasContacto.map(v=><option key={v} value={v}>{t(v)}</option>)}</select></label>
  <label className="contacto-check"><input name="prueba" type="checkbox" defaultChecked={contacto?.prueba??false}/>{t('prueba')}</label>
  <label className="contacto-check"><input name="confirmado" type="checkbox" required/>{t('confirmado')}</label>
  <button disabled={pendiente||(!contacto&&resultado==='guardado')} className="boton boton-azul">{t(pendiente?'guardando':'guardar')}</button>
  {!contacto&&resultado==='guardado'&&<button type="button" onClick={()=>location.reload()}>{t('otroContacto')}</button>}
  {resultado&&<p role={resultado==='guardado'?'status':'alert'}>{t(resultado)}</p>}
 </form>;
}
