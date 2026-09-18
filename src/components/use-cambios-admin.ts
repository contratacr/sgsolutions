'use client';
import {useEffect,useState} from 'react';
import {useTranslations} from 'next-intl';
export function useCambiosAdmin<T>(datos:T){
 const [guardado,setGuardado]=useState(datos);const t=useTranslations('AdminImagenes');
 const pendientes=datos!==guardado;
 useEffect(()=>{
  if(!pendientes)return;
  const salir=(e:BeforeUnloadEvent)=>{e.preventDefault();};
  const navegar=(e:MouseEvent)=>{const enlace=(e.target as Element).closest?.('a[href]');if(!enlace||enlace.getAttribute('target')==='_blank'||enlace.getAttribute('href')?.startsWith('#'))return;if(!window.confirm(t('salirSinGuardar'))){e.preventDefault();e.stopPropagation();}};
  const cerrar=(e:SubmitEvent)=>{if((e.target as Element).matches('[data-cerrar-sesion]')&&!window.confirm(t('salirSinGuardar'))){e.preventDefault();e.stopPropagation();}};
  window.addEventListener('beforeunload',salir);document.addEventListener('click',navegar,true);
  document.addEventListener('submit',cerrar,true);
  return ()=>{window.removeEventListener('beforeunload',salir);document.removeEventListener('click',navegar,true);document.removeEventListener('submit',cerrar,true);};
 },[pendientes,t]);
 return {pendientes,confirmarGuardado:()=>setGuardado(datos)};
}
