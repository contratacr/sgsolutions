'use client';
import {useEffect,useRef,useState} from 'react';
import {useTranslations} from 'next-intl';
import {Heart,X} from 'lucide-react';
import Link from 'next/link';
export function AvisoFavoritos(){
 const t=useTranslations('AccionesProducto'),[visible,setVisible]=useState(false),temporizador=useRef<ReturnType<typeof setTimeout>|null>(null);
 function detener(){if(temporizador.current)clearTimeout(temporizador.current);}
 useEffect(()=>{const mostrar=()=>{setVisible(true);if(temporizador.current)clearTimeout(temporizador.current);temporizador.current=setTimeout(()=>setVisible(false),7000);};window.addEventListener('sg-favorito-guardado',mostrar);return()=>{window.removeEventListener('sg-favorito-guardado',mostrar);if(temporizador.current)clearTimeout(temporizador.current);};},[]);
 if(!visible)return null;
 return <aside className="favoritos-confirmacion" aria-label={t('guardado')} onFocus={detener} onMouseEnter={detener}><button className="favoritos-confirmacion-cerrar" aria-label={t('cerrarAviso')} onClick={()=>{detener();setVisible(false);}}><X size={18}/></button><p role="status"><Heart size={19} aria-hidden="true" fill="currentColor"/>{t('guardado')}</p><Link className="favoritos-confirmacion-ver" href="/favoritos" onClick={()=>setVisible(false)}>{t('verFavoritos')}</Link></aside>;
}
