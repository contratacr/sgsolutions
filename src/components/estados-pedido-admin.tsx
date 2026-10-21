import {getTranslations} from 'next-intl/server';
import {actualizarEntregaPedido} from '@/app/panel/pedidos/acciones';
import {estadoGestion,siguientesEstadosEntrega,type EstadoEntrega} from '@/lib/estado-entrega';
export async function EstadosPedidoAdmin({pago,entrega}:{pago:string;entrega:EstadoEntrega}) {
 const t=await getTranslations('EntregaAdmin');
 const gestion=estadoGestion(pago,entrega);
 return <div className="pedido-estados"><div><span className="pedido-estado-label">{t('pago')}</span><span className={`pedido-estado-chip ${pago==='pagado'?'estado-confirmado':pago==='cancelado'||pago==='rechazado'||pago==='error'?'estado-problema':'estado-espera'}`}>{t(pago==='iniciado'||pago==='pendiente'?'sinConfirmacion':`pago_${pago}`)}</span></div><div><span className="pedido-estado-label">{t(['iniciado','pendiente','rechazado','error'].includes(pago)?'intentoCompra':'pedido')}</span><span className={`pedido-estado-chip ${gestion==='entregado'?'estado-confirmado':gestion==='cancelado'?'estado-problema':'estado-gestion'}`}>{t(gestion)}</span></div></div>;
}
export async function GestionEntregaPedido({id,tipo,pago,entrega,modalidad}:{id:string;tipo:'manual'|'tarjeta';pago:string;entrega:EstadoEntrega;modalidad?:string}) {
 const t=await getTranslations('EntregaAdmin');
 if(pago!=='pagado')return null;
 return <section className="pedido-gestion-entrega"><h3>{t('pedido')}</h3><p>{t(entrega)}</p>{siguientesEstadosEntrega(entrega,modalidad).map(siguiente=><form key={siguiente} action={actualizarEntregaPedido}><input type="hidden" name="id" value={id}/><input type="hidden" name="tipo" value={tipo}/><input type="hidden" name="actual" value={entrega}/><input type="hidden" name="siguiente" value={siguiente}/><button className="boton boton-azul">{t(`accion_${siguiente}`)}</button></form>)}</section>;
}
