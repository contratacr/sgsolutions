type Linea = {cantidad: number; nombre: string; codigo?: string; precio: string};
type Datos = {
  lineas: Linea[];
  subtotal: string;
  costoEnvio?: string;
  total?: string;
  nombre: string;
  telefono: string;
  correo?: string;
  contacto?: string;
  entrega: string;
  direccion?: string;
  receptor?: string;
  pago?: string;
  comprobante?: string;
  datosFactura?: string[];
  notas?: string;
  enlaceProducto?: string;
};
type Textos = {
  titulo: string; productos: string; codigo: string; subtotal: string; costoEnvio: string; total: string;
  entrega: string; direccion: string; receptor: string; pago: string;
  comprobante: string; cliente: string; correo: string;
  contacto: string; notas: string; ficha: string; confirmacion: string;
};

function limpiar(valor: string) {
  return valor.replace(/[\u0000-\u001f\u007f\u202a-\u202e*~`]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function mensajePedidoWhatsApp(datos: Datos, t: Textos) {
  const lineas = datos.lineas.map(linea => [
    `• ${linea.cantidad} × ${limpiar(linea.nombre)} — ${limpiar(linea.precio)}`,
    linea.codigo ? `  ${t.codigo}: ${limpiar(linea.codigo)}` : '',
  ].filter(Boolean).join('\n'));
  const detalles = [
    `${t.entrega}: ${limpiar(datos.entrega)}`,
    datos.direccion ? `${t.direccion}: ${limpiar(datos.direccion)}` : '',
    datos.receptor ? `${t.receptor}: ${limpiar(datos.receptor)}` : '',
    datos.pago ? `${t.pago}: ${limpiar(datos.pago)}` : '',
    datos.comprobante ? `${t.comprobante}: ${limpiar(datos.comprobante)}` : '',
    ...(datos.datosFactura ?? []).map(limpiar),
  ].filter(Boolean);
  const contacto = [
    `${limpiar(datos.nombre)} · ${limpiar(datos.telefono)}`,
    datos.correo ? `${t.correo}: ${limpiar(datos.correo)}` : '',
    datos.contacto ? `${t.contacto}: ${limpiar(datos.contacto)}` : '',
    datos.notas ? `${t.notas}: ${limpiar(datos.notas)}` : '',
  ].filter(Boolean);
  return [
    `*${t.titulo}*`,
    '',
    `*${t.productos}*`,
    ...lineas,
    datos.enlaceProducto ? `${t.ficha}: ${datos.enlaceProducto}` : '',
    '',
    `*${t.subtotal}: ${limpiar(datos.subtotal)}*`,
    datos.costoEnvio ? `${t.costoEnvio}: ${limpiar(datos.costoEnvio)}` : '',
    datos.total ? `*${t.total}: ${limpiar(datos.total)}*` : '',
    '',
    ...detalles,
    '',
    `*${t.cliente}*`,
    ...contacto,
    '',
    `_${t.confirmacion}_`,
  ].filter((linea, indice, todas) => linea !== '' || (indice > 0 && todas[indice - 1] !== '')).join('\n').trim();
}

export function enlaceProductoParaWhatsApp(id: string) {
  if (typeof window === 'undefined' || window.location.protocol !== 'https:') return undefined;
  return new URL(`/tienda/${encodeURIComponent(id)}`, window.location.origin).href;
}
