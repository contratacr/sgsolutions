'use client';
import {useEffect,useId,useSyncExternalStore} from 'react';
import {usePathname} from 'next/navigation';

let activa:string|null=null;
const oyentes=new Set<()=>void>();
function suscribir(oyente:()=>void){oyentes.add(oyente);return()=>{oyentes.delete(oyente);};}
function cambiar(id:string,abierta:boolean){
 const siguiente=abierta?id:activa===id?null:activa;
 if(siguiente===activa)return;
 activa=siguiente;oyentes.forEach(oyente=>oyente());
}
export function useVistaPrevia(){
 const id=useId(),ruta=usePathname();
 const abierta=useSyncExternalStore(suscribir,()=>activa===id,()=>false);
 useEffect(()=>()=>cambiar(id,false),[id,ruta]);
 return [abierta,(valor:boolean)=>cambiar(id,valor)] as const;
}
