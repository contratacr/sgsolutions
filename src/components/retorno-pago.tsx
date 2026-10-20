'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useTranslations} from 'next-intl';
import {huellaBorrador} from '@/lib/borrador-compra';
import {retirarArticulosPedido} from '@/lib/carrito';

/** Solo el estado confirmado por el servidor autoriza retirar artículos. */
export function RetornoPago({pedido,pagado}:{pedido?:string;pagado:boolean}){
 const t=useTranslations('ResultadoPago');
 const [ruta,setRuta]=useState('/pagar');
 useEffect(()=>{
  let vigente=true;
  void (async()=>{try{
   for(const clave of Object.keys(sessionStorage).filter(k=>k.startsWith('sg-pago-pendiente-v1:'))){
    const pendiente=JSON.parse(sessionStorage.getItem(clave)||'null');
    if(!pedido||pendiente?.pedido!==pedido)continue;
    if(pagado){
     // Consumir una vez: recargar la confirmación no debe descontar otra compra.
     sessionStorage.removeItem(clave);
     retirarArticulosPedido(pendiente.articulos??[]);
     if(await huellaBorrador(sessionStorage.getItem(pendiente.claveBorrador))===pendiente.borrador)sessionStorage.removeItem(pendiente.claveBorrador);
    }else if(typeof pendiente.ruta==='string'&&/^\/(?:pagar|finalizar-compra|compra\/)[^#]*$/.test(pendiente.ruta)){
     if(vigente)setRuta(pendiente.ruta);
    }
   }
  }catch{/* El retorno sigue disponible si el almacenamiento está restringido. */}})();
  return()=>{vigente=false;};
 },[pedido,pagado]);
 return pagado?null:<Link className="boton boton-contorno" href={ruta}>{t('volverCompra')}</Link>;
}
