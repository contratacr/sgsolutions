'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { sesionLocal } from '@/lib/admin-local';
import { accesoPedido, basePedidosManuales, configuracionPedidosManuales, estadosPermitidos, numeroPedido, type EstadoPedidoManual } from '@/lib/pedidos-manuales';
import { enviarCorreo } from '@/lib/email/send';
import { leerContenido } from '@/lib/contenido-servidor';
import { colones } from '@/lib/catalogo-modelo';
import {costoEntrega} from '@/lib/envio';

async function autorizado() {
  if (await sesionLocal()) return true;
  const cliente = await crearClienteServidor();
  if (!cliente) return false;
  const { data: { user } } = await cliente.auth.getUser();
  if (!user) return false;
  const { data } = await cliente.from('perfiles').select('rol,activo').eq('id', user.id).maybeSingle();
  return data?.activo === true && data.rol === 'administrador';
}

export async function actualizarPedidoManual(form: FormData) {
  if (!await autorizado()) redirect('/admin');
  const config = configuracionPedidosManuales();
  if (!config) redirect('/panel/pedidos?resultado=no_disponible');
  const id = String(form.get('id') ?? '');
  const nuevo = String(form.get('estado') ?? '') as EstadoPedidoManual;
  if (!/^[0-9a-f-]{36}$/.test(id) || !['pendiente_pago', 'pagado', 'cancelado'].includes(nuevo)) redirect('/panel/pedidos?resultado=invalido');
  const db = basePedidosManuales(config);
  const { data: pedido } = await db.from('pedidos_manuales').select('id,estado,metodo,total_productos,cliente').eq('id', id).maybeSingle();
  if (!pedido || !estadosPermitidos[pedido.estado as EstadoPedidoManual]?.includes(nuevo)) redirect('/panel/pedidos?resultado=invalido');
  const cambios: Record<string, unknown> = { estado: nuevo, actualizado_en: new Date().toISOString() };
  if (nuevo === 'pendiente_pago') {
    if (!['retiro', 'envio'].includes(pedido.cliente?.modalidad)) redirect('/panel/pedidos?resultado=invalido');
    const envio = costoEntrega(pedido.cliente.modalidad as 'retiro' | 'envio');
    cambios.costo_envio = envio;
    const totalDefinitivo = Number(pedido.total_productos) + envio;
    cambios.total_cobrar = totalDefinitivo;
    if (totalDefinitivo > 100000000) redirect('/panel/pedidos?resultado=invalido');
  }
  if (nuevo === 'pagado') cambios.verificado_en = new Date().toISOString();
  const { data, error } = await db.from('pedidos_manuales').update(cambios).eq('id', id).eq('estado', pedido.estado).select('id').maybeSingle();
  if (error || !data) redirect('/panel/pedidos?resultado=error');
  const ingles = pedido.cliente?.idioma === 'en';
  let correoEnviado = false;
  const numero = numeroPedido(id);
  if (nuevo === 'pendiente_pago') {
    const pagos = (await leerContenido()).pagos;
    const destino = new URL('/finalizar-compra/pedido', config.origen);
    destino.searchParams.set('pedido', id); destino.searchParams.set('acceso', accesoPedido(config, id));
    const cuenta = pedido.metodo === 'sinpe' ? pagos.sinpe : pagos.cuentas.map(c => `${c.banco}: ${c.iban}`).join('\n');
    try {
      await enviarCorreo({ destinatario: pedido.cliente.correo,
        asunto: ingles ? `Payment details for order ${numero}` : `Datos de pago del pedido ${numero}`,
        texto: ingles
          ? `Your order ${numero} is ready for payment. Final total: ${colones(Number(cambios.total_cobrar))}. Pay to ${pagos.titular}: ${cuenta}. Use ${numero} as reference. You may upload the receipt here: ${destino.href}. We will verify the funds in our bank before preparing the order.`
          : `Su pedido ${numero} está listo para pago. Total definitivo: ${colones(Number(cambios.total_cobrar))}. Pague a ${pagos.titular}: ${cuenta}. Use ${numero} como referencia. Puede adjuntar el comprobante aquí: ${destino.href}. Verificaremos el ingreso en el banco antes de preparar el pedido.`,
      });
      correoEnviado = true;
      await db.from('pedidos_manuales').update({ correo_pago_en: new Date().toISOString() }).eq('id', id);
    } catch { /* El panel señala que se debe compartir el enlace manualmente. */ }
  } else if (nuevo === 'pagado') {
    try {
      await enviarCorreo({ destinatario: pedido.cliente.correo,
        asunto: ingles ? `Payment confirmed for ${numero}` : `Pago confirmado para ${numero}`,
        texto: ingles ? `We verified payment for order ${numero}. Our team will coordinate the next step with you.` : `Verificamos el pago del pedido ${numero}. Nuestro equipo coordinará el siguiente paso con usted.`,
      }); correoEnviado = true;
    } catch { /* El pedido conserva el estado; avisar desde el panel. */ }
  }
  revalidatePath('/panel/pedidos');
  redirect(`/panel/pedidos?resultado=${nuevo === 'cancelado' || correoEnviado ? 'guardado' : 'sin_correo'}`);
}

export async function reenviarCorreoPedido(form:FormData){
 if(!await autorizado())redirect('/admin');
 const config=configuracionPedidosManuales();
 if(!config)redirect('/panel/pedidos?resultado=no_disponible');
 const id=String(form.get('id')??'');
 if(!/^[0-9a-f-]{36}$/.test(id))redirect('/panel/pedidos?resultado=invalido');
 const db=basePedidosManuales(config);
 const {data:p}=await db.from('pedidos_manuales').select('id,estado,total_cobrar,cliente').eq('id',id).maybeSingle();
 if(!p||!['pendiente_pago','comprobante_recibido','pagado'].includes(p.estado))redirect('/panel/pedidos?resultado=invalido');
 const enlace=new URL('/finalizar-compra/pedido',config.origen);enlace.searchParams.set('pedido',id);enlace.searchParams.set('acceso',accesoPedido(config,id));
 const ingles=p.cliente?.idioma==='en',numero=numeroPedido(id);
 const estado=ingles?{pendiente_pago:'Pending payment',comprobante_recibido:'Receipt received, awaiting bank verification',pagado:'Payment verified'}:{pendiente_pago:'Pendiente de pago',comprobante_recibido:'Comprobante recibido, pendiente de verificación bancaria',pagado:'Pago verificado'};
 let enviado=false;
 try{await enviarCorreo({destinatario:p.cliente.correo,asunto:ingles?`Your SG Solutions order ${numero}`:`Su pedido ${numero} de SG Solutions`,texto:[`${ingles?'Order':'Pedido'}: ${numero}`,`${ingles?'Status':'Estado'}: ${estado[p.estado as keyof typeof estado]}`,`Total: ${colones(Number(p.total_cobrar))}`,`${ingles?'Order details and payment receipt':'Detalle del pedido y comprobante'}: ${enlace.href}`,p.estado==='pagado'?(ingles?'The invoice is issued separately through GTI.':'La factura se emite por separado mediante GTI.'):''].filter(Boolean).join('\n\n')});enviado=true;await db.from('pedidos_manuales').update({correo_cliente_en:new Date().toISOString(),...(p.estado==='pendiente_pago'?{correo_pago_en:new Date().toISOString()}:{})}).eq('id',id);}catch{/* The order remains intact and can be shared through its private link. */}
 revalidatePath('/panel/pedidos');redirect(`/panel/pedidos?resultado=${enviado?'guardado':'sin_correo'}`);
}
