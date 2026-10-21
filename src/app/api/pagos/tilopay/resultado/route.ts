import {confirmarTarjeta} from '@/lib/conciliacion-tarjeta';
import {notificarPagoTarjeta} from '@/lib/email/pago-tarjeta';
import { basePedidos, configuracionTilopay } from '@/lib/tilopay';

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
    const confirmado=await confirmarTarjeta(db,config,pedido);
    if(confirmado==='pagado'||confirmado==='rechazado')estado=confirmado;
  } catch { /* Nunca declarar pagado si la consulta al proveedor falla. */ }
  return Response.redirect(new URL(`/pago/resultado?estado=${estado}&pedido=${id}`, origen));
}
