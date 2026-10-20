'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {useSesionCuenta} from './sesion-cuenta';
import {depurarBorradoresCompra,limpiarBorradoresCompra} from '@/lib/borrador-compra';
const revision='sg-compra-cierre',vista='sg-compra-cierre-visto';
export function LimpiezaCompra(){
 const ruta=usePathname(),iniciada=useSesionCuenta();
 useEffect(()=>{
  let canal:BroadcastChannel|null=null;try{if(typeof BroadcastChannel!=='undefined')canal=new BroadcastChannel('sg-limpieza-compra');}catch{}
  const limpiar=()=>{limpiarBorradoresCompra();window.dispatchEvent(new Event('sg-compra-limpiada'));};
  // A local counter (not an account/device ID) also reaches suspended tabs when
  // they resume. BroadcastChannel alone can miss messages on mobile Safari.
  const sincronizar=()=>{
   try{const actual=localStorage.getItem(revision)??'0',anterior=sessionStorage.getItem(vista)??'0';
    if(actual!==anterior)limpiar();sessionStorage.setItem(vista,actual);
   }catch{}
  };
  if(canal)canal.onmessage=e=>{if(e.data==='limpiar'){limpiar();sincronizar();}};
  const depurar=()=>{
   depurarBorradoresCompra();
   if(document.cookie.split(';').some(c=>c.trim()==='sg-limpiar-compra=1')){
    limpiar();
    try{const anterior=Number(localStorage.getItem(revision)||0);localStorage.setItem(revision,String(Number.isSafeInteger(anterior)&&anterior>=0&&anterior<Number.MAX_SAFE_INTEGER?anterior+1:1));}catch{}
    canal?.postMessage('limpiar');
    document.cookie=`sg-limpiar-compra=; Path=/; Max-Age=0; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
   }
   sincronizar();
  };
  const almacenamiento=(e:StorageEvent)=>{if(e.key===revision)sincronizar();};
  depurar();const reloj=window.setInterval(depurar,60000);
  window.addEventListener('pageshow',depurar);window.addEventListener('focus',depurar);window.addEventListener('storage',almacenamiento);
  document.addEventListener('visibilitychange',depurar);
  return()=>{clearInterval(reloj);canal?.close();window.removeEventListener('pageshow',depurar);window.removeEventListener('focus',depurar);window.removeEventListener('storage',almacenamiento);document.removeEventListener('visibilitychange',depurar);};
 },[ruta,iniciada]);
 return null;
}
