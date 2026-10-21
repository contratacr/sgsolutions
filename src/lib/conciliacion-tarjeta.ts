import 'server-only';
import {basePedidos,configuracionTilopay,consultarTilopay,tokenTilopay} from './tilopay';
import {notificarPagoTarjeta} from './email/pago-tarjeta';
import {enviarCorreo} from './email/send';
import {empresa} from './empresa';
import {numeroPedido} from './pedidos-manuales';
import type {SupabaseClient} from '@supabase/supabase-js';
type Config=NonNullable<ReturnType<typeof configuracionTilopay>>;
type Pedido={id:string;total:number;moneda:string;estado:string;entorno:string};
/** No browser or webhook payload is proof of payment. Always consult the provider. */
export async function confirmarTarjeta(db:SupabaseClient,config:Config,pedido:Pedido,token?:string){
 if(pedido.estado==='pagado'){await notificarPagoTarjeta(db,pedido.id);return 'pagado' as const;}
 const respuesta=await consultarTilopay(config,token??await tokenTilopay(config),pedido.id);
 if(respuesta.type!=='200'||!Array.isArray(respuesta.response))throw new Error('CONSULTA_TARJETA_INDETERMINADA');
 const filas=respuesta.response.filter((f):f is Record<string,unknown>=>typeof f==='object'&&f!==null&&typeof f.orderNumber==='string'&&(f.orderNumber===pedido.id||f.orderNumber.endsWith('-'+pedido.id)));
 // Prefer an approval when a gateway returns multiple attempts for one reference.
 const transaccion=filas.find(f=>String(f.code)==='1')??filas[0];
 if(!transaccion){if(respuesta.response.length)throw new Error('CONSULTA_TARJETA_REFERENCIA_INVALIDA');return 'sin_confirmacion' as const;}
 if(Number(transaccion.amount)!==Number(pedido.total)||transaccion.currency!==pedido.moneda||pedido.entorno!==config.modo||transaccion.environment!==config.entornoRespuesta)throw new Error('CONSULTA_TARJETA_NO_COINCIDE');
 if(String(transaccion.code)!=='1'){
  if(String(transaccion.code)==='2'){
   const {error}=await db.from('pedidos_tilopay').update({estado:'rechazado',resultado_tilopay:typeof transaccion.response==='string'?transaccion.response.slice(0,200):'',actualizado_en:new Date().toISOString()}).eq('id',pedido.id).in('estado',['iniciado','pendiente']);
   if(error)throw new Error('RECHAZO_TARJETA_NO_GUARDADO');
   const {data:actual}=await db.from('pedidos_tilopay').select('estado').eq('id',pedido.id).single();
   if(actual?.estado==='pagado'){await notificarPagoTarjeta(db,pedido.id);return 'pagado' as const;}
   return 'rechazado' as const;
  }
  return 'sin_confirmacion' as const;
 }
 if(transaccion.type!==undefined&&transaccion.type!=='Payment')throw new Error('CONSULTA_TARJETA_TIPO_INVALIDO');
 if(transaccion.capture!==undefined&&transaccion.capture!=='Capture')throw new Error('CONSULTA_TARJETA_SIN_CAPTURA');
 const {error}=await db.from('pedidos_tilopay').update({estado:'pagado',transaccion_tilopay:String(transaccion.id_tilopay??''),resultado_tilopay:typeof transaccion.response==='string'?transaccion.response.slice(0,200):'',actualizado_en:new Date().toISOString()}).eq('id',pedido.id).in('estado',['iniciado','pendiente','rechazado','error']);
 if(error)throw new Error('CONFIRMACION_TARJETA_NO_GUARDADA');
 const {data:guardado,error:lectura}=await db.from('pedidos_tilopay').select('estado').eq('id',pedido.id).single();
 if(lectura||guardado?.estado!=='pagado')throw new Error('CONFIRMACION_TARJETA_NO_GUARDADA');
 await notificarPagoTarjeta(db,pedido.id);
 return 'pagado' as const;
}
export async function conciliarTarjetas(){
 if(process.env.SG_ENTORNO!=='produccion')return;
 const config=configuracionTilopay(false);if(!config)return;
 await procesarConciliacionTarjetas(basePedidos(config),config);
}
export async function procesarConciliacionTarjetas(db:SupabaseClient,config:Config){
 const {data:pedidos,error}=await db.rpc('reservar_conciliacion_tarjeta');if(error)throw new Error('CONCILIACION_TARJETA_NO_DISPONIBLE');
 let fallos=false;const limite=Date.now()+70_000;
 if(pedidos?.length){
 const token=await tokenTilopay(config).catch(()=>{fallos=true;return undefined;});
 for(const pedido of pedidos){
  if(Date.now()>limite)break;
  if(!token&&pedido.estado!=='pagado')continue;
  try{
   const estado=await confirmarTarjeta(db,config,pedido,token);
   if(estado==='pagado'||!pedido.aviso_intento_elegible||pedido.aviso_intento_en||pedido.aviso_intento_estado!=='pendiente'||pedido.archivado_en||Date.now()-Date.parse(pedido.creado_en)<30*60_000)continue;
   // Re-read after provider consultation; a concurrent return may have confirmed payment.
   const {data:actual,error:lectura}=await db.from('pedidos_tilopay').select('estado').eq('id',pedido.id).single();
   if(lectura||actual?.estado==='pagado')continue;
   const {data:reserva,error:reservar}=await db.from('pedidos_tilopay').update({aviso_intento_estado:'enviando'}).eq('id',pedido.id).eq('conciliacion_reserva',pedido.conciliacion_reserva).eq('aviso_intento_estado','pendiente').neq('estado','pagado').select('id');
   if(reservar||!reserva?.length)continue;
   const numero=numeroPedido(pedido.id,pedido.referencia_numero);
   try{await enviarCorreo({destinatario:empresa.correo,asunto:`Compra no completada · ${numero}`,diseno:{titulo:'Intento de compra',etiqueta:'SIN PAGO CONFIRMADO',referencia:numero},texto:'Este intento no tiene un pago confirmado tras consultar Tilopay. No es una compra pagada. Verifique su estado actualizado antes de preparar productos o contactar al cliente.',accion:{texto:'Revisar intento de compra',url:`https://sgsolutionscr.com/panel/pedidos?pedido=${pedido.id}`}});
   const {error:guardar}=await db.from('pedidos_tilopay').update({aviso_intento_en:new Date().toISOString(),aviso_intento_estado:'enviado'}).eq('id',pedido.id).eq('conciliacion_reserva',pedido.conciliacion_reserva);
   if(guardar)throw new Error('AVISO_INTENTO_NO_GUARDADO');
   }catch(error){
    // An uncertain outcome must never resend automatically: avoid duplicate alerts.
    const rechazoExplicito=error instanceof Error&&/^CORREO_PROVEEDOR_(?:400|401|403|429|500|502|503|504)$/.test(error.message);
    await db.from('pedidos_tilopay').update({aviso_intento_estado:rechazoExplicito?'pendiente':'incierto'}).eq('id',pedido.id).eq('conciliacion_reserva',pedido.conciliacion_reserva);
    throw error;
   }
  }catch{fallos=true;console.error('CONCILIACION_TARJETA_PENDIENTE');}
 }
 }
 // Retry confirmed-payment email jobs even when the customer never returns again.
 const {data:pendientes}=await db.from('correos_pago_tarjeta').select('pedido_id').eq('estado','pendiente').limit(20);
 for(const id of new Set((pendientes??[]).map(p=>p.pedido_id))){if(Date.now()>limite)break;await notificarPagoTarjeta(db,id);}
 if(fallos)throw new Error('CONCILIACION_TARJETA_PENDIENTE');
}
