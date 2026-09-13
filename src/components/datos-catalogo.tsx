'use client';
import {createContext,useContext,useState,useEffect,useCallback} from 'react';
import type {CatalogoPublico} from '@/lib/catalogo-modelo';
import type {ResumenCatalogo} from '@/lib/catalogo-consulta';
import {useCarrito} from '@/lib/carrito';
type Datos=ResumenCatalogo&{productos:CatalogoPublico['productos']};
type ContextoDatos=Datos&{recordar:(p:CatalogoPublico['productos'])=>void;noDisponibles:string[];errorCarrito:boolean;reintentar:()=>void};
const Contexto=createContext<ContextoDatos|null>(null);
export function DatosCatalogo({datos,children}:{datos:Datos;children:React.ReactNode}){
 const [productos,setProductos]=useState(datos.productos),[errorCarrito,setErrorCarrito]=useState(false),[intento,setIntento]=useState(0);
 const [noDisponibles,setNoDisponibles]=useState<string[]>([]);
 const lineas=useCarrito(),ids=lineas.map(l=>l.id).sort().join(',');
 const recordar=useCallback((nuevos:CatalogoPublico['productos'])=>setProductos(prev=>[...new Map([...prev,...nuevos].map(p=>[p.id,p])).values()]),[]);
 useEffect(()=>{
  if(!ids)return;
  const abort=new AbortController();
  fetch(`/api/catalogo?ids=${encodeURIComponent(ids)}`,{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(d=>{recordar(d.productos);setProductos(prev=>prev.filter(p=>!ids.split(',').includes(p.id)||d.productos.some((x:{id:string})=>x.id===p.id)));setNoDisponibles(ids.split(',').filter(id=>!d.productos.some((p:{id:string})=>p.id===id)));setErrorCarrito(false);}).catch(()=>{if(!abort.signal.aborted)setErrorCarrito(true);});
  return ()=>abort.abort();
 },[ids,recordar,intento]);
 return <Contexto.Provider value={{...datos,productos,recordar,noDisponibles,errorCarrito,reintentar:()=>setIntento(i=>i+1)}}>{children}</Contexto.Provider>;
}
export function useCatalogo(){const datos=useContext(Contexto);if(!datos)throw new Error('CATALOGO_NO_DISPONIBLE');return datos;}
