'use client';
import {CampoTelefono} from './campo-telefono';
import {useConfiguracionSitio} from '@/components/configuracion-sitio';

import {medir} from '@/lib/analitica-cliente';
import {MarcoModal} from '@/components/marco-modal';
import * as Dialog from '@radix-ui/react-dialog';
import {useState, useRef, type FormEvent} from 'react';
import {useLocale,useTranslations} from 'next-intl';
import {ClipboardList, Check,  Mail, Building2} from 'lucide-react';

export function SolicitudPlan({indice}:{indice:number}) {
 const {empresa}=useConfiguracionSitio();
  const idioma=useLocale(),t=useTranslations('SolicitudPlan'), planes=useTranslations('Inicio'), marca=useTranslations('Marca');
  const [enviando,setEnviando]=useState(false),[enviado,setEnviado]=useState(false),[error,setError]=useState('');
  const pendiente=useRef(false);
  const nombrePlan=planes(`plan${indice}Nombre`);
  async function enviar(evento:FormEvent<HTMLFormElement>){
    evento.preventDefault();if(pendiente.current)return;pendiente.current=true;setEnviando(true);setError('');
    const datos=new FormData(evento.currentTarget);
    try{const respuesta=await fetch('/api/empresas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...Object.fromEntries(datos),idioma,plan:indice,consentimiento:datos.get('consentimiento')==='on'})});
     if(!respuesta.ok){setError(respuesta.status===429?'errorLimite':'errorEnvio');return;}
     const resultado=await respuesta.json();if(resultado.enviado!==true)throw new Error('envio');
     setEnviado(true);medir('plan_revisado',String(indice+1));
    }catch{setError('errorEnvio');}finally{pendiente.current=false;setEnviando(false);}
  }
  return <Dialog.Root onOpenChange={()=>{if(!pendiente.current){setEnviado(false);setError('');}}}><Dialog.Trigger onClick={()=>medir('plan',String(indice+1))} className={`boton ${indice===1?'boton-naranja':'boton-contorno'}`}>{planes('planAccion')}<ClipboardList size={18} aria-hidden="true"/></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="solicitud-overlay"/><MarcoModal className="solicitud-dialog">

      <aside className="solicitud-resumen"><span className="solicitud-marca">{marca('nombre')}</span><div className="solicitud-plan-icono"><Building2 size={30} strokeWidth={1.4}/></div><p className="solicitud-eyebrow">{t('planElegido')}</p><h2>{nombrePlan}</h2><p className="solicitud-frase">{planes(`plan${indice}Frase`)}</p><ul>{planes(`plan${indice}Detalle`).split(' · ').map(detalle=><li key={detalle}><Check size={15}/>{detalle}</li>)}</ul><div className="solicitud-contacto"><Mail size={17}/><span>{empresa.correo}</span></div></aside>
      <div className="solicitud-contenido"><p className="solicitud-paso">{t('paso1')}</p><Dialog.Title>{t(enviado?'enviadoTitulo':'titulo')}</Dialog.Title><Dialog.Description>{t(enviado?'enviadoDescripcion':'descripcion')}</Dialog.Description>
        <form onSubmit={enviar} hidden={enviado} aria-busy={enviando}><fieldset disabled={enviando} style={{border:0,padding:0,margin:0,minWidth:0}}>
          <div className="solicitud-campos">{(['empresa','nombre','correo','telefono'] as const).map(campo=><label key={campo}>{t(campo)}{campo==='telefono'?<CampoTelefono required name={campo}/>:<input required name={campo}  type={campo==='correo'?'email':'text'} autoComplete={{empresa:'organization',nombre:'name',correo:'email',telefono:'tel'}[campo]} maxLength={campo==='correo'?254:120}/>}</label>)}
          <label className="solicitud-ancho">{t('equipos')}<select name="equipos" required defaultValue=""><option value="" disabled>{t('seleccionar')}</option>{['1–5','6–15','16–30','31–50','51+'].map(valor=><option key={valor}>{valor}</option>)}</select></label>
          <label className="solicitud-ancho">{t('mensaje')}<textarea name="mensaje" required maxLength={1500} rows={3} placeholder={t('mensajeEjemplo')}/></label></div>
          <label className="solicitud-consentimiento"><input type="checkbox" name="consentimiento" required/>{t('consentimiento')}</label>
          <button className="boton boton-naranja solicitud-continuar" type="submit">{t(enviando?'enviando':'enviar')}<Mail size={18} aria-hidden="true"/></button>
          <div hidden aria-hidden="true"><label>{t('sitio')}<input name="sitio" tabIndex={-1} autoComplete="off"/></label></div>
          </fieldset>{error&&<p role="alert">{t(error)}</p>}
        </form>
        {enviado&&<div className="solicitud-revision" role="status"><Check size={32} aria-hidden="true"/><p>{t('enviadoAyuda')}</p><Dialog.Close className="boton boton-naranja">{t('cerrar')}</Dialog.Close></div>}
      </div>
    </MarcoModal></Dialog.Portal>
  </Dialog.Root>;
}
