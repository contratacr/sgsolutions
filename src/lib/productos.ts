export const productos = [
  { id: 'portatil', categoria: 'computo', imagen: '/imagenes/portatil.webp', posicion: '50% 60%' },
  { id: 'gamer', categoria: 'computo', imagen: '/imagenes/gamer.webp', posicion: '50% 60%' },
  { id: 'camaras', categoria: 'seguridad', imagen: '/imagenes/camaras.webp', posicion: '50% 48%' },
  { id: 'red', categoria: 'redes', imagen: '/imagenes/red.webp', posicion: '50% 50%' },
  { id: 'pos', categoria: 'negocio', imagen: '/imagenes/pos.webp', posicion: '50% 55%' }
] as const;
export type ProductoId = typeof productos[number]['id'];
// No inferir precios, modelos exactos ni inventario a partir de fotografías.
// La pasarela recibirá importes calculados por el servidor cuando exista catálogo vendible.
