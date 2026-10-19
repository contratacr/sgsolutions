'use client';
import {limiteCantidadProducto} from '@/lib/software';
import {medir} from './analitica-cliente';
import { useSyncExternalStore } from 'react';
type ProductoId = string;

type Linea = { id: ProductoId; cantidad: number };
const vacio: Linea[] = [];
let lineas: Linea[] = vacio;
let cargado = false;
const clave = 'sg-carrito-v1';
const observadores = new Set<() => void>();

function leer(): Linea[] | null {
  try {
    const datos: unknown = JSON.parse(localStorage.getItem(clave) || '[]');
    if (!Array.isArray(datos)) return vacio;
    const unicos = new Map<ProductoId, number>();
    for (const dato of datos.slice(0, 30)) {
      if (dato && typeof dato.id === 'string' && !dato.id.startsWith('empresa-intcomex-') && /^[a-z0-9][a-z0-9-]{0,59}$/.test(dato.id) && Number.isInteger(dato.cantidad) && dato.cantidad > 0 && dato.cantidad <= limiteCantidadProducto(dato.id)) unicos.set(dato.id, dato.cantidad);
    }
    return [...unicos].map(([id, cantidad]) => ({ id, cantidad }));
  } catch { return null; }
}
function obtener() {
  if (!cargado) { const guardadas=leer(); if(guardadas!==null){lineas=guardadas;cargado=true;} }
  return lineas;
}
function suscribir(observador: () => void) {
  observadores.add(observador);
  const recuperar = () => {
    const guardadas=leer();
    if(guardadas===null)return;
    cargado=true;
    if(JSON.stringify(guardadas)===JSON.stringify(lineas))return;
    lineas=guardadas;observadores.forEach(fn=>fn());
  };
  const actualizar = (evento: StorageEvent) => {
    if (evento.key === clave || evento.key === null) recuperar();
  };
  const visible=()=>{if(document.visibilityState==='visible')recuperar();};
  window.addEventListener('storage', actualizar);
  window.addEventListener('pageshow', recuperar);
  window.addEventListener('focus', recuperar);
  window.addEventListener('sg-app-resume', recuperar);
  document.addEventListener('visibilitychange', visible);
  return () => {
    observadores.delete(observador);
    window.removeEventListener('storage', actualizar);
    window.removeEventListener('pageshow', recuperar);
    window.removeEventListener('focus', recuperar);
    window.removeEventListener('sg-app-resume', recuperar);
    document.removeEventListener('visibilitychange', visible);
  };
}
function guardar(nuevas: Linea[]) {
  lineas = nuevas;
  try { localStorage.setItem(clave, JSON.stringify(lineas)); } catch { /* El carrito sigue disponible durante esta visita. */ }
  observadores.forEach(fn => fn());
}
export function cambiarCantidad(id: ProductoId, cantidad: number) {
  if (id.startsWith('empresa-intcomex-') || !Number.isInteger(cantidad) || cantidad < 0 || cantidad > limiteCantidadProducto(id)) return;
  if(cantidad>0&&!obtener().some(l=>l.id===id)&&obtener().length>=30)return;
  const actuales = obtener().filter(linea => linea.id !== id);
  guardar(cantidad ? [...actuales, { id, cantidad }] : actuales);
}
export function agregarProducto(id: ProductoId, unidades=1, avisar=true) {
  if(id.startsWith('empresa-intcomex-')||!Number.isInteger(unidades)||unidades<1||unidades>limiteCantidadProducto(id))return;
  const cantidad = obtener().find(linea => linea.id === id)?.cantidad ?? 0;
  cambiarCantidad(id, Math.min(cantidad + unidades, limiteCantidadProducto(id)));
  const agregadas=(obtener().find(l=>l.id===id)?.cantidad??0)-cantidad;
  if(agregadas>0)medir('carrito',id);
  if(avisar)window.dispatchEvent(new CustomEvent('sg-carrito-agregado',{detail:{id,agregadas}}));
}
export function useCarrito() {
  return useSyncExternalStore(suscribir, obtener, () => vacio);
}

// Retira únicamente las unidades del pedido, conservando otras compras en curso.
export function retirarArticulosPedido(articulos: readonly Linea[]) {
  const cantidades = new Map(articulos.map(x => [x.id, x.cantidad]));
  guardar(obtener().flatMap(linea => {
    const cantidad = Math.max(0, linea.cantidad - (cantidades.get(linea.id) ?? 0));
    return cantidad ? [{...linea, cantidad}] : [];
  }));
}
