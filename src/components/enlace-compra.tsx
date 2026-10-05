'use client';
import {useEffect,useRef,useState} from 'react';
import {useTranslations} from 'next-intl';
import {Copy,Check,Link2} from 'lucide-react';
export function EnlaceCompra({url,id,referencia,destacar=false}:{url:string;id:string;referencia:string;destacar?:boolean}){
 const t=useTranslations('AsesoriaAdmin'),campo=useRef<HTMLTextAreaElement>(null),tarjeta=useRef<HTMLElement>(null);
 const [copiado,setCopiado]=useState(false),[error,setError]=useState(false);
 useEffect(()=>{
  const ajustar=()=>{if(campo.current){campo.current.style.height='auto';campo.current.style.height=`${campo.current.scrollHeight+2}px`;}};
  ajustar();window.addEventListener('resize',ajustar);
  return()=>window.removeEventListener('resize',ajustar);
 },[url]);
 useEffect(()=>{
  if(!destacar)return;
  const frame=requestAnimationFrame(()=>{tarjeta.current?.focus({preventScroll:true});tarjeta.current?.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
  return()=>cancelAnimationFrame(frame);
 },[destacar,url]);
 async function copiar(){try{await navigator.clipboard.writeText(url);setCopiado(true);setError(false);}catch{setCopiado(false);campo.current?.focus();campo.current?.select();setError(true);}}
 return <section ref={tarjeta} id={`enlace-${id}`} tabIndex={-1} aria-label={t('enlace')} className="asesoria-enlace">
  <div className="asesoria-enlace-resumen"><span className="asesoria-enlace-titulo"><Link2 size={20} aria-hidden="true"/>{t('enlace')}</span><strong>{t('compraReferencia',{referencia})}</strong><span className="asesoria-enlace-listo"><Check size={15} aria-hidden="true"/>{t('listoCompartir')}</span></div>
  <button type="button" className="boton boton-azul" onClick={copiar}>{copiado?<Check size={18} aria-hidden="true"/>:<Copy size={18} aria-hidden="true"/>}{t(copiado?'copiado':'copiar')}</button>
  <label className="asesoria-enlace-completo"><span className="sr-only">{t('enlace')}</span><textarea ref={campo} rows={3} readOnly value={url} onFocus={e=>e.currentTarget.select()}/></label>
  <span className="sr-only" role="status">{copiado?t('copiado'):''}</span>{error&&<p role="status">{t('copiarManual')}</p>}
 </section>;
}
