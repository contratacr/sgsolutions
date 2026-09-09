'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { ShoppingBag, X, Trash2, ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { cambiarCantidad, useCarrito } from '@/lib/carrito';
import { productos } from '@/lib/productos';
import { enlaceWhatsApp } from '@/lib/empresa';

export function Carrito() {
  const t = useTranslations('Carrito');
  const tienda = useTranslations('Tienda');
  const n = useTranslations('Navegacion');
  const lineas = useCarrito();
  const mensaje = [t('mensaje'), ...lineas.map(l => `${l.cantidad} × ${tienda(`${l.id}Nombre`)}`)].join('\n');
  return <Dialog.Root>
    <Dialog.Trigger className="boton-icono carrito-trigger" aria-label={n('carrito')}><ShoppingBag size={20}/><span aria-live="polite">{lineas.reduce((total, l) => total + l.cantidad, 0)}</span></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="dialogo-fondo"/><Dialog.Content className="carrito-panel">
      <div className="carrito-cabecera"><Dialog.Title>{t('titulo')}</Dialog.Title><Dialog.Close className="boton-icono" aria-label={n('cerrar')}><X/></Dialog.Close></div>
      <Dialog.Description className="texto-suave">{t('descripcion')}</Dialog.Description>
      {lineas.length === 0 ? <div className="carrito-vacio"><ShoppingBag size={44}/><p>{t('vacio')}</p><Dialog.Close asChild><Link className="boton boton-azul" href="/tienda">{t('explorar')}</Link></Dialog.Close></div> : <>
        <ul className="carrito-lineas">{lineas.map(linea => {
          const producto = productos.find(p => p.id === linea.id)!;
          return <li key={linea.id}><Image src={producto.imagen} alt={tienda(`${linea.id}Alt`)} width={80} height={80}/><div className="carrito-producto"><strong>{tienda(`${linea.id}Nombre`)}</strong><span>{tienda('precioPendiente')}</span><input type="number" min={1} max={99} value={linea.cantidad} aria-label={t('cantidad', {nombre: tienda(`${linea.id}Nombre`)})} onChange={e => cambiarCantidad(linea.id, Number(e.target.value))}/></div><button className="boton-icono" aria-label={t('quitar', {nombre: tienda(`${linea.id}Nombre`)})} onClick={() => cambiarCantidad(linea.id, 0)}><Trash2 size={18}/></button></li>;
        })}</ul>
        <div className="carrito-resumen"><div><strong>{t('total')}</strong><strong>{t('pendiente')}</strong></div><p>{t('nota')}</p><button className="boton boton-azul" disabled>{t('pagar')}</button><a className="boton boton-contorno" href={enlaceWhatsApp(mensaje)} target="_blank" rel="noopener noreferrer">{t('cotizar')}<ArrowUpRight size={18}/></a></div>
      </>}
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
