import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {enviarCorreo} from './send';
import {empresa} from '../empresa';
import {numeroPedido} from '../pedidos-manuales';
import {colones} from '../catalogo-modelo';

/** Reintenta correos pendientes; la reserva atómica evita duplicados por callbacks simultáneos. */
export async function notificarPagoTarjeta(db:SupabaseClient,id:string){
 const {data:pedido,error}=await db.from('pedidos_tilopay').select('id,referencia_numero,estado,entorno,total,cliente,articulos').eq('id',id).maybeSingle();
 if(error||pedido?.estado!=='pagado')return;
 // Las transacciones ficticias nunca envían correo fuera del laboratorio aislado.
 if(pedido.entorno==='pruebas'&&!(process.env.SG_ENTORNO==='local'&&process.env.SG_QA_LOCAL==='1'))return;
 const numero=numeroPedido(id,pedido.referencia_numero),ingles=pedido.cliente?.idioma==='en';
 await Promise.all(['cliente','equipo'].map(async destinatario=>{
  const alta=await db.from('correos_pago_tarjeta').upsert({pedido_id:id,destinatario},{onConflict:'pedido_id,destinatario',ignoreDuplicates:true});
  if(alta.error){console.error('PAGO_CORREO_COLA_NO_DISPONIBLE');return;}
  const {data:fila}=await db.from('correos_pago_tarjeta').select('estado,actualizado_en,intentos').eq('pedido_id',id).eq('destinatario',destinatario).single();
  if(!fila||fila.estado==='enviado'||fila.estado==='enviando'&&Date.parse(fila.actualizado_en)>Date.now()-5*60_000)return;
  const reserva=new Date().toISOString();
  const {data:tomada,error:reservaError}=await db.from('correos_pago_tarjeta').update({estado:'enviando',actualizado_en:reserva,intentos:fila.intentos+1}).eq('pedido_id',id).eq('destinatario',destinatario).eq('estado',fila.estado).eq('actualizado_en',fila.actualizado_en).select('pedido_id');
  if(reservaError||!tomada?.length)return;
  const prueba=pedido.entorno==='pruebas'?'[PRUEBA] ':'';
  try{
   const en=destinatario==='cliente'&&ingles;
   const modalidad=pedido.cliente?.modalidad;
   await enviarCorreo({destinatario:destinatario==='cliente'?pedido.cliente.correo:empresa.correo,idioma:en?'en':'es',
    asunto:prueba+(destinatario==='equipo'?`Pago con tarjeta confirmado · ${numero}`:en?`Payment confirmed · ${numero}`:`Pago confirmado · ${numero}`),
    diseno:{titulo:prueba+(en?'Payment confirmed':'Pago confirmado'),etiqueta:destinatario==='equipo'?'NOTIFICACIÓN AL EQUIPO':en?'THANK YOU FOR YOUR PURCHASE':'GRACIAS POR SU COMPRA',referencia:numero,
     total:{etiqueta:en?'Total paid':'Total pagado',valor:colones(Number(pedido.total))},productos:pedido.articulos,
     detalles:[{etiqueta:en?'Payment':'Pago',valor:en?'Card · Confirmed':'Tarjeta · Confirmado'},...(modalidad?[{etiqueta:en?'Delivery':'Entrega',valor:modalidad==='express'?(en?'Express · Quoted separately':'Express · Se cotiza por separado'):modalidad==='envio'?(en?'Correos de Costa Rica':'Correos de Costa Rica'):(en?'Store pickup':'Retiro en tienda')}]:[]),...(destinatario==='equipo'?[{etiqueta:'Cliente',valor:`${pedido.cliente.nombre} ${pedido.cliente.apellidos??''}`.trim()}]:[])]},
    texto:destinatario==='cliente'?(en?`Your card payment has been confirmed. Thank you for choosing SG Solutions.\n\nOur team will coordinate delivery or pickup with you.${modalidad==='express'?' Express delivery is quoted according to your location and paid separately.':''}`:`Su pago con tarjeta fue confirmado. Gracias por elegir SG Solutions.\n\nNuestro equipo coordinará la entrega o el retiro con usted.${modalidad==='express'?' El servicio de Express se cotiza según su ubicación y se paga por separado.':''}`):`El pago fue verificado con Tilopay. Revise el pedido en el panel para coordinar su preparación y entrega.\n\n${modalidad==='express'?'El envío Express se cotiza y cobra por separado.\n\n':''}Esta notificación no genera una orden al proveedor.`,
    ...(destinatario==='equipo'?{accion:{texto:'Ver pedido en el panel',url:'https://sgsolutionscr.com/panel/pedidos?seccion=tarjeta'}}:{})});
   await db.from('correos_pago_tarjeta').update({estado:'enviado',actualizado_en:new Date().toISOString()}).eq('pedido_id',id).eq('destinatario',destinatario).eq('actualizado_en',reserva);
  }catch{
   await db.from('correos_pago_tarjeta').update({estado:'pendiente',actualizado_en:new Date().toISOString()}).eq('pedido_id',id).eq('destinatario',destinatario).eq('actualizado_en',reserva);
   console.error('PAGO_CORREO_ENVIO_PENDIENTE');
  }
 }));
}
