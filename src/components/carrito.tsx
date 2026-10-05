'use client';
import Image from 'next/image';
import {useEffect,useId,useState} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {AnimatePresence,motion,useReducedMotion} from 'motion/react';
import { ShoppingCart, X, Trash2, CheckCircle2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import Link from 'next/link';
import { cambiarCantidad, useCarrito } from '@/lib/carrito';
import {useCatalogo} from './datos-catalogo';
import {colones,traducir} from '@/lib/catalogo-modelo';
import {ContadorCantidad} from './contador-cantidad';
import {AsesoriaWhatsApp} from './asesoria-whatsapp';

export function Carrito() {
  const t = useTranslations('Carrito');
  const a=useTranslations('Asesoria');
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
  const [pausado,setPausado]=useState(false);
  const reducirMovimiento=useReducedMotion();
  useEffect(()=>{const agregado=(evento:Event)=>{setAviso((evento as CustomEvent<{id:string;agregadas:number}>).detail);setPausado(false);};window.addEventListener('sg-carrito-agregado',agregado);return()=>window.removeEventListener('sg-carrito-agregado',agregado);},[]);
  useEffect(()=>{if(!aviso||pausado)return;const temporizador=setTimeout(()=>setAviso(null),6000);return()=>clearTimeout(temporizador);},[aviso,pausado]);
  const cantidad=lineas.reduce((total,l)=>total+l.cantidad,0);
  return <><Dialog.Root open={abierto} onOpenChange={valor=>{setAbierto(valor);if(valor)setAviso(null);}}>
    <Dialog.Trigger className="boton-icono carrito-trigger" aria-label={n('carrito')} aria-describedby={descripcionCantidad}><ShoppingCart size={24} strokeWidth={2.2} aria-hidden="true"/><span id={descripcionCantidad} className="sr-only" aria-live="polite">{t('articulos',{cantidad})}</span>{cantidad>0&&<span className="carrito-cantidad" aria-hidden="true">{cantidad>99?'99+':cantidad}</span>}</Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="dialogo-fondo"/><Dialog.Content className="carrito-panel">
      <div className="carrito-cabecera"><Dialog.Title>{t('titulo')}</Dialog.Title><Dialog.Close className="boton-icono" aria-label={n('cerrar')}><X/></Dialog.Close></div>
      <Dialog.Description className="texto-suave">{t('descripcion')}</Dialog.Description>
      {todas.filter(l=>noDisponibles.includes(l.id)).map(l=><p key={l.id}>{tienda('productoNoDisponible')} <button onClick={()=>cambiarCantidad(l.id,0)}>{tienda('quitarProducto')}</button></p>)}
      {(faltantes||errorCarrito)&&<p role="status">{tienda(errorCarrito?'errorCarga':'cargando')} <button onClick={reintentar}>{tienda('reintentar')}</button></p>}
      {lineas.length === 0 ? <div className="carrito-vacio"><ShoppingCart size={44} aria-hidden="true"/><p>{faltantes?tienda('productoNoDisponible'):t('vacio')}</p><Dialog.Close asChild><Link className="boton boton-azul" href="/soluciones">{t('explorar')}</Link></Dialog.Close></div> : <>
        <ul className="carrito-lineas">{lineas.map(linea => {
          const producto = productos.find(p => p.id === linea.id)!;
          return <li key={linea.id}><Image src={producto.imagen} alt={nombre(linea.id)} width={80} height={80}/><div className="carrito-producto"><strong>{nombre(linea.id)}</strong><span>{producto.precio===null?tienda('precioPendiente'):colones(producto.precio)}</span><ContadorCantidad cantidad={linea.cantidad} nombre={nombre(linea.id)} cambiar={cantidad=>cambiarCantidad(linea.id,cantidad)}/></div><button className="boton-icono" aria-label={t('quitar', {nombre: nombre(linea.id)})} onClick={() => cambiarCantidad(linea.id, 0)}><Trash2 size={18}/></button></li>;
        })}</ul>
        <div className="carrito-resumen"><div><strong>{t('total')}</strong><strong>{lineas.some(l=>productos.find(p=>p.id===l.id)!.precio===null)?t('pendiente'):colones(lineas.reduce((a,l)=>a+productos.find(p=>p.id===l.id)!.precio!*l.cantidad,0))}</strong></div><p>{t('nota')}</p><AsesoriaWhatsApp etiqueta="consultarSeleccion" lineas={lineas.map(l=>({producto:productos.find(p=>p.id===l.id)!,cantidad:l.cantidad}))}/><p className="carrito-asesoria-nota">{a('regreso')}</p></div>
      </>}
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root><AnimatePresence>{aviso&&<motion.aside className="carrito-confirmacion" aria-label={t('avisoTitulo')} initial={{opacity:0,y:reducirMovimiento?0:-12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:reducirMovimiento?0:-8}} transition={{duration:reducirMovimiento?0:.2}} onPointerEnter={()=>setPausado(true)} onPointerLeave={e=>{if(!e.currentTarget.contains(document.activeElement))setPausado(false);}} onFocusCapture={()=>setPausado(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setPausado(false);}}><div role="status" aria-atomic="true"><CheckCircle2 size={22} aria-hidden="true"/><div><strong>{t(aviso.agregadas>0?'productoAgregado':'noAgregado')}</strong>{aviso.agregadas>0&&<p>{traducir(productos.find(p=>p.id===aviso.id)?.nombre??{es:'',en:''},idioma)}</p>}</div></div><button type="button" className="boton boton-azul" onClick={()=>{setAviso(null);setAbierto(true);}}><ShoppingCart size={17} aria-hidden="true"/>{t('verCarrito')}</button><button type="button" className="boton-icono carrito-confirmacion-cerrar" aria-label={n('cerrar')} onClick={()=>setAviso(null)}><X size={18}/></button></motion.aside>}</AnimatePresence></>;
}
