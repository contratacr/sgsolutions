'use client';
import {useMemo,useSyncExternalStore,useEffect,useState} from 'react';
import {claveEnlacesPrueba,lineasValidasPrueba,type EnlacePrueba} from '@/lib/disponibilidad-prueba';
const evento='sg-enlaces-prueba';
function suscribir(callback:()=>void){window.addEventListener('storage',callback);window.addEventListener(evento,callback);return()=>{window.removeEventListener('storage',callback);window.removeEventListener(evento,callback);};}
function snapshot(){try{return localStorage.getItem(claveEnlacesPrueba)??'[]';}catch{return '[]';}}
function servidor(){return '[]';}
export function guardarEnlacesPrueba(enlaces:EnlacePrueba[]){localStorage.setItem(claveEnlacesPrueba,JSON.stringify(enlaces));window.dispatchEvent(new Event(evento));}
export function useEnlacesPrueba(){
 const listo=useSyncExternalStore(suscribir,()=>true,()=>false);
 const datos=useSyncExternalStore(suscribir,snapshot,servidor);
 const enlaces=useMemo(()=>{try{const lista=JSON.parse(datos);return (Array.isArray(lista)?lista:[]).filter((e:EnlacePrueba)=>e&&typeof e.token==='string'&&typeof e.cliente==='string'&&Number.isFinite(Date.parse(e.vence))&&Array.isArray(e.lineas)&&lineasValidasPrueba(e.lineas)) as EnlacePrueba[];}catch{return [];}},[datos]);
 return {enlaces,guardar:guardarEnlacesPrueba,listo};
}
export function useRelojPrueba(){const [ahora,setAhora]=useState(()=>Date.now());useEffect(()=>{const reloj=setInterval(()=>setAhora(Date.now()),1000);return()=>clearInterval(reloj);},[]);return ahora;}
