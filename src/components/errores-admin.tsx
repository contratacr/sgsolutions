'use client';
import {useEffect,useRef} from 'react';
import {useTranslations} from 'next-intl';
export type CampoAdmin = (string | number)[];
export function ErroresAdmin({campos,abrir}:{campos:CampoAdmin[];abrir:(campo:CampoAdmin)=>void}){
 const t=useTranslations('AdminValidacion');
 const aviso=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(campos.length){aviso.current?.focus({preventScroll:true});aviso.current?.scrollIntoView({block:'center',behavior:'smooth'});}},[campos]);
 if(!campos.length)return null;
 return <div ref={aviso} tabIndex={-1} role="alert" className="admin-validacion"><p>{t('instruccion')}</p><ul>{campos.map((campo,i)=><li key={i}><button type="button" onClick={()=>abrir(campo)}>{campo.map(k=>typeof k==='number'?String(k+1):t.has(k)?t(k):k).join(' → ')}</button></li>)}</ul></div>;
}
export function enfocarRegistro(id:string){
 requestAnimationFrame(()=>{
 const el=document.getElementById(id);
 if(el instanceof HTMLDetailsElement)el.open=true;
 el?.scrollIntoView({block:'center',behavior:'smooth'});
 el?.querySelector<HTMLElement>('textarea,input,select')?.focus({preventScroll:true});
 });
}
