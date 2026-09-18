'use client';
import {useState,useSyncExternalStore} from 'react';
import {EstadoPagina} from '@/components/estado-pagina';
import {cambiarIdioma} from './acciones-idioma';
import es from '../../messages/es.json';
import en from '../../messages/en.json';
import './globals.css';
import './estados.css';
const suscribir=()=>()=>{};
export default function ErrorGlobal({retry}:{error:Error & {digest?:string};retry:()=>void}){
 const original=useSyncExternalStore(suscribir,()=>document.documentElement.lang==='en'?'en':'es',()=> 'es');
 const [elegido,setElegido]=useState<string>();
 const idioma=elegido||original;
 const mensajes=idioma==='en'?en:es;
 const t=mensajes.Error;
 return <html lang={idioma}><body><header style={{background:'#091725',padding:'24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
  {/* A plain image keeps the fallback independent of image optimization. */}
  {/* A full navigation also recovers a failed root layout. */}
  {/* eslint-disable-next-line @next/next/no-img-element, @next/next/no-html-link-for-pages */}
  <a href="/" aria-label={t.volver}><img src="/imagenes/logo-principal.png" width="144" height="61" alt={mensajes.Marca.logo}/></a>
  <form action={async()=>{const siguiente=idioma==='es'?'en':'es';setElegido(siguiente);const datos=new FormData();datos.set('idioma',siguiente);try{await cambiarIdioma(datos);}catch{/* The language can still change while the server recovers. */}}}><button className="boton boton-contorno" style={{color:'white'}} aria-label={mensajes.Navegacion.cambiarIdioma}>{mensajes.Navegacion.otroIdioma}</button></form>
 </header><EstadoPagina codigo="!" reintentar={retry} textos={t}/><footer style={{padding:24,textAlign:'center',background:'#091725',color:'white'}}>
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src="/imagenes/logo-principal.png" width="120" height="51" alt={mensajes.Marca.logo} style={{margin:'auto'}}/></footer></body></html>;
}
