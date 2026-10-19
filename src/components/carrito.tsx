'use client';
import {limiteCantidadProducto} from '@/lib/software';
import {PrecioProducto} from './precio-producto';
import Image from 'next/image';
import {useCallback,useEffect,useId,useState} from 'react';
import {MarcoModal} from '@/components/marco-modal';
import * as Dialog from '@radix-ui/react-dialog';
import {ConfirmacionAccion} from './confirmacion-accion';
import {IndicadorCantidad} from './indicador-cantidad';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import Link from 'next/link';
import {enlaceIngresoCompra} from '@/lib/retorno-compra';
import { cambiarCantidad, useCarrito } from '@/lib/carrito';
import {useCatalogo} from './datos-catalogo';
import {colones,traducir} from '@/lib/catalogo-modelo';
import {ContadorCantidad} from './contador-cantidad';
import {EsqueletoCarrito} from './esqueletos';


export function Carrito({sesionIniciada=false,cantidadIndicador}:{sesionIniciada?:boolean;cantidadIndicador?:number|null}) {
  const acceso=useTranslations('AccesoCompra');
  const t = useTranslations('Carrito');

  const {productos,noDisponibles,errorCarrito,reintentar}=useCatalogo();
  const idioma=useLocale();
  const nombre=(id:string)=>traducir(productos.find(p=>p.id===id)!.nombre,idioma);
  const tienda = useTranslations('Tienda');
  const n = useTranslations('Navegacion');
  const todas = useCarrito();
  const lineas=todas.filter(l=>productos.some(p=>p.id===l.id));
  const faltantes=todas.some(l=>!productos.some(p=>p.id===l.id)&&!noDisponibles.includes(l.id));
  const descripcionCantidad=useId();
  const [abierto,setAbierto]=useState(false),[aviso,setAviso]=useState<{id:string;agregadas:number}|null>(null);
  const cerrarAviso=useCallback(()=>setAviso(null),[]);
  useEffect(()=>{const agregado=(evento:Event)=>setAviso((evento as CustomEvent<{id:string;agregadas:number}>).detail);window.addEventListener('sg-carrito-agregado',agregado);window.addEventListener('sg-favorito-guardado',cerrarAviso);return()=>{window.removeEventListener('sg-carrito-agregado',agregado);window.removeEventListener('sg-favorito-guardado',cerrarAviso);};},[cerrarAviso]);
  const productoAviso=aviso?productos.find(p=>p.id===aviso.id):undefined;
  const cantidad=todas.reduce((total,l)=>total+l.cantidad,0);
  return <><Dialog.Root open={abierto} onOpenChange={valor=>{setAbierto(valor);if(valor)setAviso(null);}}>
    <Dialog.Trigger className="boton-icono carrito-trigger" aria-label={n('carrito')} aria-describedby={descripcionCantidad}><ShoppingCart size={24} strokeWidth={2.2} aria-hidden="true"/><span id={descripcionCantidad} className="sr-only" aria-live="polite">{cantidadIndicador!==null&&t('articulos',{cantidad:cantidadIndicador??cantidad})}</span>{cantidadIndicador!==null&&<IndicadorCantidad cantidad={cantidadIndicador??cantidad} clase="carrito-cantidad"/>}</Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="dialogo-fondo"/><MarcoModal className="carrito-panel">
      <div className="carrito-cabecera"><Dialog.Title>{t('titulo')}</Dialog.Title></div>
      <div className="carrito-contenido">
      <Dialog.Description className="texto-suave">{t('descripcion')}</Dialog.Description>
      {todas.filter(l=>noDisponibles.includes(l.id)).map(l=><p key={l.id}>{tienda('productoNoDisponible')} <button onClick={()=>cambiarCantidad(l.id,0)}>{tienda('quitarProducto')}</button></p>)}
      {errorCarrito?<p role="alert">{tienda('errorCarga')} <button onClick={reintentar}>{tienda('reintentar')}</button></p>:faltantes?<EsqueletoCarrito texto={tienda('cargando')}/>:null}
      {lineas.length === 0 && todas.length>0 ? null : lineas.length === 0 ? <div className="carrito-vacio"><ShoppingCart size={44} aria-hidden="true"/><p>{faltantes?tienda('productoNoDisponible'):t('vacio')}</p><Dialog.Close asChild><Link className="boton boton-azul" href="/tienda">{t('explorar')}</Link></Dialog.Close></div> : <>
        <ul className="carrito-lineas">{lineas.map(linea => {
          const producto = productos.find(p => p.id === linea.id)!;
          return <li key={linea.id}><Image src={producto.imagen} alt={nombre(linea.id)} width={80} height={80}/><div className="carrito-producto"><strong>{nombre(linea.id)}</strong><PrecioProducto producto={producto} pendiente={tienda('precioPendiente')}/><ContadorCantidad maximo={limiteCantidadProducto(linea.id)} cantidad={linea.cantidad} nombre={nombre(linea.id)} cambiar={cantidad=>cambiarCantidad(linea.id,cantidad)}/></div><button className="boton-icono" aria-label={t('quitar', {nombre: nombre(linea.id)})} onClick={() => cambiarCantidad(linea.id, 0)}><Trash2 size={18}/></button></li>;
        })}</ul>

      </>}
      </div>
      {lineas.length>0&&<div className="carrito-resumen"><div><strong>{t('total')}</strong><strong>{lineas.some(l=>productos.find(p=>p.id===l.id)!.precio===null)?t('pendiente'):colones(lineas.reduce((a,l)=>a+productos.find(p=>p.id===l.id)!.precio!*l.cantidad,0))}</strong></div><p>{t('nota')}</p><Dialog.Close asChild><Link className="boton boton-azul" href="/pagar">{t('finalizar')}</Link></Dialog.Close>{!sesionIniciada&&<Dialog.Close asChild><Link className="carrito-ingreso" href={enlaceIngresoCompra()}>{acceso('carrito')}</Link></Dialog.Close>}</div>}
    </MarcoModal></Dialog.Portal>
  </Dialog.Root>{aviso&&<ConfirmacionAccion clase="carrito-confirmacion" titulo={t(aviso.agregadas>0?'productoAgregado':'noAgregado')} icono={<ShoppingCart size={21}/>} reiniciar={aviso} cerrar={cerrarAviso} accion={<button type="button" onClick={()=>{cerrarAviso();setAbierto(true);}}>{t('verCarrito')}</button>}>
   {aviso.agregadas>0&&<><small>{t('resumenAgregado',{cantidad:aviso.agregadas,total:cantidad})}</small><p className="carrito-confirmacion-producto">{productoAviso&&<Image src={productoAviso.imagen} alt="" width={44} height={44}/>}<span>{traducir(productoAviso?.nombre??{es:'',en:''},idioma)}</span></p></>}
  </ConfirmacionAccion>}</>;
}
