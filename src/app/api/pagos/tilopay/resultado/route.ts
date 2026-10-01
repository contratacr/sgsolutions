import { basePedidos, configuracionTilopay, consultarTilopay, tokenTilopay } from '@/lib/tilopay';

export async function GET(request: Request) {
  const config = configuracionTilopay(false);
  const parametros = new URL(request.url).searchParams;
  let id = '';
  try { id = atob(parametros.get('returnData') ?? ''); } catch { /* Callback incompleto. */ }
  if (!config || !/^[0-9a-f-]{36}$/.test(id)) return Response.redirect(new URL('/finalizar-compra/resultado?estado=pendiente', request.url));
  const db = basePedidos(config);
  const { data: pedido } = await db.from('pedidos_tilopay').select('id,total,moneda,estado').eq('id', id).maybeSingle();
  if (!pedido) return Response.redirect(new URL('/finalizar-compra/resultado?estado=pendiente', request.url));
  if (pedido.estado === 'pagado') return Response.redirect(new URL(`/finalizar-compra/resultado?estado=pagado&pedido=${id}`, request.url));
  let estado = 'pendiente';
  try {
    const respuesta = await consultarTilopay(config, await tokenTilopay(config), id);
    const filas = Array.isArray(respuesta.response) ? respuesta.response : [];
    // Tilopay antepone el código del comercio al orderNumber enviado.
    const transaccion = filas.find((fila): fila is Record<string, unknown> => {
      if (typeof fila !== 'object' || fila === null) return false;
      const numero = (fila as Record<string, unknown>).orderNumber;
      return typeof numero === 'string' && (numero === id || numero.endsWith(`-${id}`));
    });
    if (respuesta.type === '200' && transaccion && Number(transaccion.amount) === Number(pedido.total) && transaccion.currency === pedido.moneda && transaccion.environment === 'Test') {
      estado = transaccion.code === '1' ? 'pagado' : 'rechazado';
      await db.from('pedidos_tilopay').update({ estado, transaccion_tilopay: String(transaccion.id_tilopay ?? ''), resultado_tilopay: String(transaccion.response ?? '').slice(0, 200), actualizado_en: new Date().toISOString() }).eq('id', id).eq('estado', 'pendiente');
    }
  } catch { /* Nunca declarar pagado si la consulta al proveedor falla. */ }
  return Response.redirect(new URL(`/finalizar-compra/resultado?estado=${estado}&pedido=${id}`, request.url));
}
