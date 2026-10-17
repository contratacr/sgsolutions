'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {useTranslations} from 'next-intl';
import {X} from 'lucide-react';
export function ConfirmacionAccion({clase,titulo,icono,children,accion,cerrar,reiniciar}:{clase:string;titulo:string;icono:ReactNode;children?:ReactNode;accion:ReactNode;cerrar:()=>void;reiniciar:unknown}){
 const t=useTranslations('Navegacion'),[pausado,setPausado]=useState(false);
 useEffect(()=>{if(pausado)return;const timer=setTimeout(cerrar,5000);return()=>clearTimeout(timer);},[pausado,cerrar,reiniciar]);
 return <aside className={`accion-confirmacion ${clase}`} aria-label={titulo}
  onPointerEnter={e=>{if(e.pointerType==='mouse')setPausado(true);}}
  onPointerLeave={e=>{if(!e.currentTarget.contains(document.activeElement))setPausado(false);}}
  onFocusCapture={()=>setPausado(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setPausado(false);}}>
  <div role="status" aria-atomic="true" className="accion-confirmacion-mensaje"><span className="accion-confirmacion-icono" aria-hidden="true">{icono}</span><div><strong>{titulo}</strong>{children}</div></div>
  <div className="accion-confirmacion-accion">{accion}</div>
  <button type="button" className="accion-confirmacion-cerrar" aria-label={t('cerrar')} onClick={cerrar}><X size={18} aria-hidden="true"/></button>
 </aside>;
}
