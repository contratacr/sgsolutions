'use client';
import { useSyncExternalStore } from 'react';
import { productos, type ProductoId } from './productos';

type Linea = { id: ProductoId; cantidad: number };
const vacio: Linea[] = [];
let lineas: Linea[] = vacio;
let cargado = false;
const clave = 'sg-carrito-v1';
const observadores = new Set<() => void>();

function leer() {
  try {
    const datos: unknown = JSON.parse(localStorage.getItem(clave) || '[]');
    if (!Array.isArray(datos)) return vacio;
    const unicos = new Map<ProductoId, number>();
    for (const dato of datos.slice(0, 30)) {
      if (dato && productos.some(p => p.id === dato.id) && Number.isInteger(dato.cantidad) && dato.cantidad > 0 && dato.cantidad <= 99) unicos.set(dato.id, dato.cantidad);
    }
    return [...unicos].map(([id, cantidad]) => ({ id, cantidad }));
  } catch { return vacio; }
}
function obtener() {
  if (!cargado) { lineas = leer(); cargado = true; }
  return lineas;
}
function suscribir(observador: () => void) {
  observadores.add(observador);
  const actualizar = (evento: StorageEvent) => {
    if (evento.key === clave || evento.key === null) { lineas = leer(); observadores.forEach(fn => fn()); }
  };
  window.addEventListener('storage', actualizar);
  return () => { observadores.delete(observador); window.removeEventListener('storage', actualizar); };
}
function guardar(nuevas: Linea[]) {
  lineas = nuevas;
  try { localStorage.setItem(clave, JSON.stringify(lineas)); } catch { /* El carrito sigue disponible durante esta visita. */ }
  observadores.forEach(fn => fn());
}
export function cambiarCantidad(id: ProductoId, cantidad: number) {
  if (!Number.isInteger(cantidad) || cantidad < 0 || cantidad > 99) return;
  const actuales = obtener().filter(linea => linea.id !== id);
  guardar(cantidad ? [...actuales, { id, cantidad }] : actuales);
}
export function agregarProducto(id: ProductoId) {
  const cantidad = obtener().find(linea => linea.id === id)?.cantidad ?? 0;
  cambiarCantidad(id, Math.min(cantidad + 1, 99));
}
export function useCarrito() {
  return useSyncExternalStore(suscribir, obtener, () => vacio);
}
