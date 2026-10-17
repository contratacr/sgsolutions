'use client';
import {useSyncExternalStore} from 'react';
import {useFavoritos} from '@/lib/favoritos';
import {useCarrito} from '@/lib/carrito';
import {FavoritosNav} from './favoritos-nav';
import {Carrito} from './carrito';
const suscribir=()=>()=>{};
const cliente=()=>true;
const servidor=()=>false;
/** Both badges share one client snapshot instead of revealing independently. */
export function ContadoresNavegacion({sesionIniciada}:{sesionIniciada:boolean}){
 const favoritos=useFavoritos(),lineas=useCarrito();
 const hidratado=useSyncExternalStore(suscribir,cliente,servidor);
 const listos=hidratado&&(favoritos.listo||favoritos.error);
 const cantidad=lineas.reduce((total,linea)=>total+linea.cantidad,0);
 return <><FavoritosNav cantidad={listos?favoritos.ids.length:null}/><Carrito sesionIniciada={sesionIniciada} cantidadIndicador={listos?cantidad:null}/></>;
}
