'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useTranslations} from 'next-intl';
import {retirarArticulosPedido} from '@/lib/carrito';

function mismoBorrador(a:string|null,b:string|null){
 if(!a||!b)return a===b;
 const actual=JSON.parse(a),guardado=JSON.parse(b);
 delete actual.fecha;delete guardado.fecha;
 return JSON.stringify(actual)===JSON.stringify(guardado);
}

/** Solo el estado confirmado por el servidor autoriza retirar artículos. */
export function RetornoPago({pedido,pagado}:{pedido?:string;pagado:boolean}){
 const t=useTranslations('ResultadoPago');
 const [ruta,setRuta]=useState('/pagar');
 useEffect(()=>{
  try{
   for(const clave of Object.keys(localStorage).filter(k=>k.startsWith('sg-pago-pendiente-v1:'))){
    const pendiente=JSON.parse(localStorage.getItem(clave)||'null');
    if(!pedido||pendiente?.pedido!==pedido)continue;
    if(pagado){
     // Consumir una vez: recargar la confirmación no debe descontar otra compra.
     localStorage.removeItem(clave);
     retirarArticulosPedido(pendiente.articulos??[]);
     if(mismoBorrador(localStorage.getItem(pendiente.claveBorrador),pendiente.borrador))localStorage.removeItem(pendiente.claveBorrador);
    }else if(typeof pendiente.ruta==='string'&&/^\/(?:pagar|finalizar-compra|compra\/)[^#]*$/.test(pendiente.ruta)){
     queueMicrotask(()=>setRuta(pendiente.ruta));
    }
   }
  }catch{/* El retorno sigue disponible si el almacenamiento está restringido. */}
 },[pedido,pagado]);
 return pagado?null:<Link className="boton boton-contorno" href={ruta}>{t('volverCompra')}</Link>;
}
