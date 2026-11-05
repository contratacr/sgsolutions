'use client';
import {useEffect,useRef} from 'react';
import {fechaOfertaLocal,fechaOfertaUtc} from '@/lib/ofertas-fechas';

/** Native date editors expose an empty value while a date/time segment is incomplete.
 * Keep their draft in the DOM so React does not erase each partially typed segment.
 */
export function CampoFechaOferta({valor,cambiar}:{valor?:string|null;cambiar:(valor:string|null)=>void}){
 const campo=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  if(campo.current&&document.activeElement!==campo.current)campo.current.value=fechaOfertaLocal(valor);
 },[valor]);
 return <input ref={campo} type="datetime-local" defaultValue={fechaOfertaLocal(valor)} onChange={e=>{
  if(!e.currentTarget.validity.badInput)cambiar(fechaOfertaUtc(e.currentTarget.value));
 }}/>
}
