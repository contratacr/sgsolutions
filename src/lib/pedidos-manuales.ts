import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export type EstadoPedidoManual = 'revision' | 'pendiente_pago' | 'comprobante_recibido' | 'pagado' | 'cancelado';
export type MetodoPedidoManual = 'sinpe' | 'transferencia';

export function configuracionPedidosManuales() {
  if (process.env.PEDIDOS_MANUALES_ACTIVOS !== '1') return null;
  const url = process.env.SUPABASE_URL;
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secreto = process.env.PEDIDOS_ENLACE_SECRET;
  const origen = process.env.PEDIDOS_ORIGEN_PUBLICO;
  if (!url || !llave || !secreto || secreto.length < 32 || !origen) return null;
  try {
    const hostname = new URL(url).hostname;
    if (process.env.SG_ENTORNO === 'local' && !['localhost', '127.0.0.1', '[::1]'].includes(hostname)) return null;
    const sitio = new URL(origen);
    if (sitio.protocol !== 'https:' && !(['local', 'test'].includes(process.env.SG_ENTORNO ?? '') && sitio.origin === 'http://127.0.0.1:3107')) return null;
    return { url, llave, secreto, origen: sitio.origin };
  } catch { return null; }
}

export function basePedidosManuales(config: NonNullable<ReturnType<typeof configuracionPedidosManuales>>) {
  return createClient(config.url, config.llave, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function numeroPedido(id: string) { return `SG-${id.replaceAll('-', '').slice(0, 10).toUpperCase()}`; }
export function accesoPedido(config: NonNullable<ReturnType<typeof configuracionPedidosManuales>>, id: string) {
  return createHmac('sha256', config.secreto).update(`pedido:${id}`).digest('hex');
}
export function accesoValido(config: NonNullable<ReturnType<typeof configuracionPedidosManuales>>, id: string, token: string) {
  if (!/^[0-9a-f-]{36}$/.test(id) || !/^[0-9a-f]{64}$/.test(token)) return false;
  return timingSafeEqual(Buffer.from(accesoPedido(config, id), 'hex'), Buffer.from(token, 'hex'));
}

export function enlacePedido(config: NonNullable<ReturnType<typeof configuracionPedidosManuales>>, id: string, origen: string) {
  const url = new URL('/finalizar-compra/pedido', origen);
  url.searchParams.set('pedido', id);
  url.searchParams.set('acceso', accesoPedido(config, id));
  return url.href;
}

export const estadosPermitidos: Record<EstadoPedidoManual, EstadoPedidoManual[]> = {
  revision: ['pendiente_pago', 'cancelado'],
  pendiente_pago: ['comprobante_recibido', 'pagado', 'cancelado'],
  comprobante_recibido: ['pendiente_pago', 'pagado', 'cancelado'],
  pagado: [],
  cancelado: [],
};
