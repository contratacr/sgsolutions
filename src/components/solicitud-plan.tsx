'use client';

import * as Dialog from '@radix-ui/react-dialog';
import {useState, type FormEvent} from 'react';
import {useTranslations} from 'next-intl';
import {ArrowRight, ArrowUpRight, Check, X, Mail, Building2} from 'lucide-react';
import {enlaceCorreo,empresa} from '@/lib/empresa';

export function SolicitudPlan({indice}:{indice:number}) {
  const t=useTranslations('SolicitudPlan'), planes=useTranslations('Inicio'), marca=useTranslations('Marca');
  const [revision,setRevision]=useState<{cuerpo:string;nombre:string}|null>(null);
  const nombrePlan=planes(`plan${indice}Nombre`);
  function preparar(evento:FormEvent<HTMLFormElement>){
    evento.preventDefault();
    const datos=new FormData(evento.currentTarget);
    const campos=['empresa','nombre','correo','telefono','equipos','mensaje'];
    const cuerpo=[t('saludo'),'',t('planElegido')+': '+nombrePlan,...campos.map(campo=>`${t(campo)}: ${String(datos.get(campo)||'').trim()}`),'',t('consentimiento')].join('\n');
    setRevision({cuerpo,nombre:String(datos.get('empresa'))});
  }
  return <Dialog.Root onOpenChange={()=>setRevision(null)}><Dialog.Trigger className={`boton ${indice===1?'boton-naranja':'boton-contorno'}`}>{planes('planAccion')}<ArrowRight size={18}/></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="solicitud-overlay"/><Dialog.Content className="solicitud-dialog">
      <Dialog.Close className="solicitud-cerrar" aria-label={t('cerrar')}><X size={20}/></Dialog.Close>
      <aside className="solicitud-resumen"><span className="solicitud-marca">{marca('nombre')}</span><div className="solicitud-plan-icono"><Building2 size={30} strokeWidth={1.4}/></div><p className="solicitud-eyebrow">{t('planElegido')}</p><h2>{nombrePlan}</h2><p className="solicitud-frase">{planes(`plan${indice}Frase`)}</p><ul>{planes(`plan${indice}Detalle`).split(' · ').map(detalle=><li key={detalle}><Check size={15}/>{detalle}</li>)}</ul><div className="solicitud-contacto"><Mail size={17}/><span>{empresa.correo}</span></div></aside>
      <div className="solicitud-contenido"><p className="solicitud-paso">{t(revision?'paso2':'paso1')}</p><Dialog.Title>{t(revision?'revisionTitulo':'titulo')}</Dialog.Title><Dialog.Description>{t(revision?'revisionDescripcion':'descripcion')}</Dialog.Description>
        <form onSubmit={preparar} hidden={!!revision}>
          <div className="solicitud-campos">{(['empresa','nombre','correo','telefono'] as const).map(campo=><label key={campo}>{t(campo)}<input required name={campo} type={campo==='correo'?'email':campo==='telefono'?'tel':'text'} autoComplete={{empresa:'organization',nombre:'name',correo:'email',telefono:'tel'}[campo]} maxLength={campo==='correo'?254:120}/></label>)}
          <label className="solicitud-ancho">{t('equipos')}<select name="equipos" required defaultValue=""><option value="" disabled>{t('seleccionar')}</option>{['1–5','6–15','16–30','31–50','51+'].map(valor=><option key={valor}>{valor}</option>)}</select></label>
          <label className="solicitud-ancho">{t('mensaje')}<textarea name="mensaje" required maxLength={1500} rows={3} placeholder={t('mensajeEjemplo')}/></label></div>
          <label className="solicitud-consentimiento"><input type="checkbox" required/>{t('consentimiento')}</label>
          <button className="boton boton-naranja solicitud-continuar" type="submit">{t('continuar')}<ArrowRight size={18}/></button><p className="solicitud-nota">{t('nota')}</p>
        </form>
        {revision&&<div className="solicitud-revision"><div className="solicitud-revision-cabecera"><span>{t('destinatario')}</span><strong>{empresa.correo}</strong></div><pre>{revision.cuerpo}</pre><a className="boton boton-naranja solicitud-continuar" href={enlaceCorreo(planes('planAsunto',{plan:nombrePlan}),revision.cuerpo)} target="_blank" rel="noopener noreferrer">{t('abrirCorreo')}<ArrowUpRight size={18}/></a><button className="solicitud-editar" onClick={()=>setRevision(null)}>{t('editar')}</button><p className="solicitud-nota">{t('notaRevision')}</p></div>}
      </div>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
