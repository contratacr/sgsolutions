'use client';
import {useCallback,useEffect,useState} from 'react';
import {useTranslations} from 'next-intl';
import {Heart} from 'lucide-react';
import Link from 'next/link';
import {ConfirmacionAccion} from './confirmacion-accion';
export function AvisoFavoritos(){
 const t=useTranslations('AccionesProducto'),[aviso,setAviso]=useState(0);
 const cerrar=useCallback(()=>setAviso(0),[]);
 useEffect(()=>{let secuencia=0;const mostrar=()=>setAviso(++secuencia);window.addEventListener('sg-favorito-guardado',mostrar);window.addEventListener('sg-carrito-agregado',cerrar);return()=>{window.removeEventListener('sg-favorito-guardado',mostrar);window.removeEventListener('sg-carrito-agregado',cerrar);};},[cerrar]);
 if(!aviso)return null;
 return <ConfirmacionAccion clase="favoritos-confirmacion" titulo={t('guardado')} icono={<Heart size={21}/>} reiniciar={aviso} cerrar={cerrar} accion={<Link className="favoritos-confirmacion-ver" href="/favoritos" onClick={cerrar}>{t('verFavoritos')}</Link>}/>;
}
