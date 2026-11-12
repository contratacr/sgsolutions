import {getTranslations} from 'next-intl/server';
import {actualizarEntregaPedido} from '@/app/panel/pedidos/acciones';
import {estadoGestion,siguientesEstadosEntrega,type EstadoEntrega} from '@/lib/estado-entrega';
export type TonoEstado='exito'|'aviso'|'peligro'|'info'|'neutro';
/** Paid = success, waiting on the customer = warning, a receipt or availability to review = info, failures = danger. */
export function tonoPago(pago:string):TonoEstado{return pago==='pagado'?'exito':['revision','comprobante_recibido'].includes(pago)?'info':['rechazado','error'].includes(pago)?'peligro':pago==='cancelado'?'neutro':'aviso';}
export function tonoEntrega(gestion:string):TonoEstado{return gestion==='entregado'?'exito':gestion==='pendiente_preparar'?'aviso':['preparando','listo_retiro','enviado'].includes(gestion)?'info':'neutro';}
export async function EstadosPedidoAdmin({pago,entrega}:{pago:string;entrega:EstadoEntrega}) {
 const t=await getTranslations('EntregaAdmin');
 const gestion=estadoGestion(pago,entrega);
 return <div className="pedido-estados"><div><span className="pedido-estado-label">{t('pago')}</span><span className="panel-chip" data-tono={tonoPago(pago)}>{t(pago==='iniciado'||pago==='pendiente'?'sinConfirmacion':`pago_${pago}`)}</span></div><div><span className="pedido-estado-label">{t(['iniciado','pendiente','rechazado','error'].includes(pago)?'intentoCompra':'pedido')}</span><span className="panel-chip" data-tono={tonoEntrega(gestion)}>{t(gestion)}</span></div></div>;
}
export async function GestionEntregaPedido({id,tipo,pago,entrega,modalidad}:{id:string;tipo:'manual'|'tarjeta';pago:string;entrega:EstadoEntrega;modalidad?:string}) {
 const t=await getTranslations('EntregaAdmin');
 if(pago!=='pagado')return null;
 return <section className="pedido-gestion-entrega"><h3>{t('pedido')}</h3><p>{t(entrega)}</p>{siguientesEstadosEntrega(entrega,modalidad).map(siguiente=><form key={siguiente} action={actualizarEntregaPedido}><input type="hidden" name="id" value={id}/><input type="hidden" name="tipo" value={tipo}/><input type="hidden" name="actual" value={entrega}/><input type="hidden" name="siguiente" value={siguiente}/><button className="boton boton-azul">{t(`accion_${siguiente}`)}</button></form>)}</section>;
}
