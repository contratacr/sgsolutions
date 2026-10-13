'use client';
import {useEffect,useRef,useState} from 'react';
import {useProteccionPanel} from './proteger-cambios-panel';
export function useCambiosAdmin<T>(datos:T){
 const [guardado,setGuardado]=useState(datos),id=useRef(Symbol('formulario'));const registrar=useProteccionPanel()?.registrar;
 const pendientes=JSON.stringify(datos)!==JSON.stringify(guardado);
 useEffect(()=>{const clave=id.current;registrar?.(clave,pendientes);return()=>registrar?.(clave,false);},[pendientes,registrar]);
 return {pendientes,confirmarGuardado:()=>setGuardado(datos)};
}
