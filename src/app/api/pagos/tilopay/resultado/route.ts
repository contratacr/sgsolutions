import {notificarPagoTarjeta} from '@/lib/email/pago-tarjeta';
import { basePedidos, configuracionTilopay, consultarTilopay, tokenTilopay } from '@/lib/tilopay';

export async function GET(request: Request) {
  const config = configuracionTilopay(false);
  // Usar el retorno configurado preserva el host y sus cookies (127.0.0.1 ≠ localhost).
  const origen = process.env.TILOPAY_RETORNO_URL || request.url;
  const parametros = new URL(request.url).searchParams;
  let id = '';
  try { id = atob(parametros.get('returnData') ?? ''); } catch { /* Callback incompleto. */ }
  if (!config || !/^[0-9a-f-]{36}$/.test(id)) return Response.redirect(new URL('/pago/resultado?estado=pendiente', origen));
  const db = basePedidos(config);
  const { data: pedido } = await db.from('pedidos_tilopay').select('id,total,moneda,estado,entorno').eq('id', id).maybeSingle();
  if (!pedido) return Response.redirect(new URL('/pago/resultado?estado=pendiente', origen));
  if (pedido.estado === 'pagado') {await notificarPagoTarjeta(db,id);return Response.redirect(new URL(`/pago/resultado?estado=pagado&pedido=${id}`, origen));}
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
    if (respuesta.type === '200' && transaccion && Number(transaccion.amount) === Number(pedido.total) && transaccion.currency === pedido.moneda && pedido.entorno === config.modo && transaccion.environment === config.entornoRespuesta) {
      estado = transaccion.code === '1' ? 'pagado' : 'rechazado';
      await db.from('pedidos_tilopay').update({ estado, transaccion_tilopay: String(transaccion.id_tilopay ?? ''), resultado_tilopay: typeof transaccion.response === 'string' ? transaccion.response.trim().slice(0, 200) : '', actualizado_en: new Date().toISOString() }).eq('id', id).eq('estado', 'pendiente');
    }
  } catch { /* Nunca declarar pagado si la consulta al proveedor falla. */ }
  if(estado==='pagado')await notificarPagoTarjeta(db,id);
  return Response.redirect(new URL(`/pago/resultado?estado=${estado}&pedido=${id}`, origen));
}
