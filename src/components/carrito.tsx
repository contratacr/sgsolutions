'use client';
import {useState} from 'react';
import Image from 'next/image';
import * as Dialog from '@radix-ui/react-dialog';
import { ShoppingBag, X, Trash2, ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import Link from 'next/link';
import { cambiarCantidad, useCarrito } from '@/lib/carrito';
import {useCatalogo} from './datos-catalogo';
import {colones,traducir} from '@/lib/catalogo-modelo';
import {SolicitudPedido} from './solicitud-pedido';

export function Carrito() {
  const t = useTranslations('Carrito');
  const [solicitud,setSolicitud]=useState(false);
  const {productos,noDisponibles,errorCarrito,reintentar}=useCatalogo();
  const idioma=useLocale();
  const nombre=(id:string)=>traducir(productos.find(p=>p.id===id)!.nombre,idioma);
  const tienda = useTranslations('Tienda');
  const n = useTranslations('Navegacion');
  const todas = useCarrito();
  const lineas=todas.filter(l=>productos.some(p=>p.id===l.id));
  const faltantes=todas.some(l=>!productos.some(p=>p.id===l.id)&&!noDisponibles.includes(l.id));
  return <Dialog.Root onOpenChange={abierto=>{if(!abierto)setSolicitud(false);}}>
    <Dialog.Trigger className="boton-icono carrito-trigger" aria-label={n('carrito')}><ShoppingBag size={20}/><span aria-live="polite">{lineas.reduce((total, l) => total + l.cantidad, 0)}</span></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="dialogo-fondo"/><Dialog.Content className="carrito-panel">
      <div className="carrito-cabecera"><Dialog.Title>{solicitud?t('solicitudTitulo'):t('titulo')}</Dialog.Title><Dialog.Close className="boton-icono" aria-label={n('cerrar')}><X/></Dialog.Close></div>
      <Dialog.Description className="texto-suave">{solicitud?t('solicitudDescripcion'):t('descripcion')}</Dialog.Description>
      {todas.filter(l=>noDisponibles.includes(l.id)).map(l=><p key={l.id}>{tienda('productoNoDisponible')} <button onClick={()=>cambiarCantidad(l.id,0)}>{tienda('quitarProducto')}</button></p>)}
      {(faltantes||errorCarrito)&&<p role="status">{tienda(errorCarrito?'errorCarga':'cargando')} <button onClick={reintentar}>{tienda('reintentar')}</button></p>}
      {lineas.length === 0 ? <div className="carrito-vacio"><ShoppingBag size={44}/><p>{faltantes?tienda('productoNoDisponible'):t('vacio')}</p><Dialog.Close asChild><Link className="boton boton-azul" href="/tienda">{t('explorar')}</Link></Dialog.Close></div> : solicitud ? <SolicitudPedido lineas={lineas.map(linea=>({cantidad:linea.cantidad,producto:productos.find(producto=>producto.id===linea.id)!}))} regresar={()=>setSolicitud(false)}/> : <>
        <ul className="carrito-lineas">{lineas.map(linea => {
          const producto = productos.find(p => p.id === linea.id)!;
          return <li key={linea.id}><Image src={producto.imagen} alt={nombre(linea.id)} width={80} height={80}/><div className="carrito-producto"><strong>{nombre(linea.id)}</strong><span>{producto.precio===null?tienda('precioPendiente'):colones(producto.precio)}</span><input type="number" min={1} max={99} value={linea.cantidad} aria-label={t('cantidad', {nombre: nombre(linea.id)})} onChange={e => cambiarCantidad(linea.id, Number(e.target.value))}/></div><button className="boton-icono" aria-label={t('quitar', {nombre: nombre(linea.id)})} onClick={() => cambiarCantidad(linea.id, 0)}><Trash2 size={18}/></button></li>;
        })}</ul>
        <div className="carrito-resumen"><div><strong>{t('total')}</strong><strong>{lineas.some(l=>productos.find(p=>p.id===l.id)!.precio===null)?t('pendiente'):colones(lineas.reduce((a,l)=>a+productos.find(p=>p.id===l.id)!.precio!*l.cantidad,0))}</strong></div><p>{t('nota')}</p><Dialog.Close asChild><Link className="boton boton-azul" href="/finalizar-compra">{t('continuar')}<ArrowRight size={18}/></Link></Dialog.Close></div>
      </>}
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
