import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {enviarCorreo} from './send';
import {empresa} from '../empresa';
import {numeroPedido} from '../pedidos-manuales';
import {colones} from '../catalogo-modelo';

/** Reintenta correos pendientes; la reserva atómica evita duplicados por callbacks simultáneos. */
export async function notificarPagoTarjeta(db:SupabaseClient,id:string){
 const {data:pedido,error}=await db.from('pedidos_tilopay').select('id,estado,entorno,total,cliente,articulos').eq('id',id).maybeSingle();
 if(error||pedido?.estado!=='pagado')return;
 // Las transacciones ficticias nunca envían correo fuera del laboratorio aislado.
 if(pedido.entorno==='pruebas'&&!(process.env.SG_ENTORNO==='local'&&process.env.SG_QA_LOCAL==='1'))return;
 const numero=numeroPedido(id),ingles=pedido.cliente?.idioma==='en';
 await Promise.all(['cliente','equipo'].map(async destinatario=>{
  const alta=await db.from('correos_pago_tarjeta').upsert({pedido_id:id,destinatario},{onConflict:'pedido_id,destinatario',ignoreDuplicates:true});
  if(alta.error){console.error('PAGO_CORREO_COLA_NO_DISPONIBLE');return;}
  const {data:fila}=await db.from('correos_pago_tarjeta').select('estado,actualizado_en,intentos').eq('pedido_id',id).eq('destinatario',destinatario).single();
  if(!fila||fila.estado==='enviado'||fila.estado==='enviando'&&Date.parse(fila.actualizado_en)>Date.now()-5*60_000)return;
  const reserva=new Date().toISOString();
  const {data:tomada,error:reservaError}=await db.from('correos_pago_tarjeta').update({estado:'enviando',actualizado_en:reserva,intentos:fila.intentos+1}).eq('pedido_id',id).eq('destinatario',destinatario).eq('estado',fila.estado).eq('actualizado_en',fila.actualizado_en).select('pedido_id');
  if(reservaError||!tomada?.length)return;
  const prueba=pedido.entorno==='pruebas'?'[PRUEBA] ':'';
  const productos=(pedido.articulos as {cantidad:number;nombre:string}[]).map(a=>`${a.cantidad} × ${a.nombre}`).join('\n');
  try{
   await enviarCorreo({destinatario:destinatario==='cliente'?pedido.cliente.correo:empresa.correo,
    asunto:prueba+(destinatario==='equipo'?`Pago con tarjeta confirmado · ${numero}`:ingles?`Payment confirmed · ${numero}`:`Pago confirmado · ${numero}`),
    texto:destinatario==='cliente'?(ingles?`We confirmed your card payment for order ${numero}.\nTotal: ${colones(Number(pedido.total))}\n${productos}\nWe will coordinate delivery or pickup with you. ${pedido.cliente?.modalidad==='express'?'Express delivery is quoted and paid separately. ':''}The electronic invoice is issued separately through GTI.`:`Confirmamos su pago con tarjeta del pedido ${numero}.\nTotal: ${colones(Number(pedido.total))}\n${productos}\nCoordinaremos la entrega o el retiro con usted. ${pedido.cliente?.modalidad==='express'?'El servicio de Express se cotiza y paga por separado. ':''}La factura electrónica se emite por separado mediante GTI.`):`Pago verificado con Tilopay.\nPedido: ${numero}\nCliente: ${pedido.cliente.nombre} ${pedido.cliente.apellidos}\nTotal: ${colones(Number(pedido.total))}\n${productos}\n${pedido.cliente?.modalidad==='express'?'Express a cotizar y cobrar por separado según la dirección del cliente.\n':''}Revise el pedido en el panel. Esta notificación no genera una orden al proveedor.`});
   await db.from('correos_pago_tarjeta').update({estado:'enviado',actualizado_en:new Date().toISOString()}).eq('pedido_id',id).eq('destinatario',destinatario).eq('actualizado_en',reserva);
  }catch{
   await db.from('correos_pago_tarjeta').update({estado:'pendiente',actualizado_en:new Date().toISOString()}).eq('pedido_id',id).eq('destinatario',destinatario).eq('actualizado_en',reserva);
   console.error('PAGO_CORREO_ENVIO_PENDIENTE');
  }
 }));
}
