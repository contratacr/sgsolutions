'use server';
import {archivarAsesoriaPanel} from '@/lib/asesorias';
import {puedeArchivar,type TipoRegistroPanel} from '@/lib/archivo-pedidos';
import {cuentaCorta} from '@/lib/cuentas-bancarias';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { crearClienteServidor } from '@/lib/supabase/servidor';
import { sesionLocal } from '@/lib/admin-local';
import { enlacePedido, basePedidosManuales, configuracionPedidosManuales, estadosPermitidos, numeroPedido, type EstadoPedidoManual } from '@/lib/pedidos-manuales';
import { enviarCorreo } from '@/lib/email/send';
import { leerContenido } from '@/lib/contenido-servidor';
import { colones } from '@/lib/catalogo-modelo';
import {costoEntrega} from '@/lib/envio';
import {basePedidosAdministracion} from '@/lib/tilopay';
import {estadosEntrega,siguientesEstadosEntrega,type EstadoEntrega} from '@/lib/estado-entrega';

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
    if (!['retiro', 'envio', 'express'].includes(pedido.cliente?.modalidad)) redirect('/panel/pedidos?resultado=invalido');
    const envio = costoEntrega(pedido.cliente.modalidad as 'retiro' | 'envio' | 'express');
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
    const destino = new URL(enlacePedido(config, id, config.origen));
    const cuenta = pedido.metodo === 'sinpe' ? pagos.sinpe : pagos.cuentas.map(c => `${c.banco}: ${cuentaCorta(c) ? cuentaCorta(c) + " · " : ""}IBAN ${c.iban}`).join('\n');
    try {
      await enviarCorreo({ destinatario: pedido.cliente.correo,idioma:ingles?'en':'es',diseno:{referencia:numero},
        accion: {texto: ingles ? 'View my order' : 'Ver mi pedido', url: destino.href},
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
      await enviarCorreo({ destinatario: pedido.cliente.correo,idioma:ingles?'en':'es',diseno:{referencia:numero},
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
 const enlace=new URL(enlacePedido(config,id,config.origen));
 const ingles=p.cliente?.idioma==='en',numero=numeroPedido(id);
 const estado=ingles?{pendiente_pago:'Pending payment',comprobante_recibido:'Receipt received, awaiting bank verification',pagado:'Payment verified'}:{pendiente_pago:'Pendiente de pago',comprobante_recibido:'Comprobante recibido, pendiente de verificación bancaria',pagado:'Pago verificado'};
 let enviado=false;
 try{await enviarCorreo({destinatario:p.cliente.correo,idioma:ingles?'en':'es',diseno:{referencia:numero},accion:{texto:ingles?'View my order':'Ver mi pedido',url:enlace.href},asunto:ingles?`Your SG Solutions order ${numero}`:`Su pedido ${numero} de SG Solutions`,texto:[`${ingles?'Order':'Pedido'}: ${numero}`,`${ingles?'Status':'Estado'}: ${estado[p.estado as keyof typeof estado]}`,`Total: ${colones(Number(p.total_cobrar))}`,`${ingles?'Order details and payment receipt':'Detalle del pedido y comprobante'}: ${enlace.href}`].filter(Boolean).join('\n\n')});enviado=true;await db.from('pedidos_manuales').update({correo_cliente_en:new Date().toISOString(),...(p.estado==='pendiente_pago'?{correo_pago_en:new Date().toISOString()}:{})}).eq('id',id);}catch{/* The order remains intact and can be shared through its private link. */}
 revalidatePath('/panel/pedidos');redirect(`/panel/pedidos?resultado=${enviado?'guardado':'sin_correo'}`);
}

export async function actualizarEntregaPedido(form:FormData) {
 if(!await autorizado())redirect('/admin');
 const id=String(form.get('id')??''),tipo=String(form.get('tipo')??'');
 const actual=String(form.get('actual')??'') as EstadoEntrega,siguiente=String(form.get('siguiente')??'') as EstadoEntrega;
 const destino=tipo==='tarjeta'?'tarjeta':'manuales';
 const fallo=`/panel/pedidos?seccion=${destino}&resultado=entrega_conflicto`;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||!['manual','tarjeta'].includes(tipo)||!estadosEntrega.includes(actual)||!estadosEntrega.includes(siguiente))redirect(fallo);
 const config=configuracionPedidosManuales();
 const db=tipo==='tarjeta'?basePedidosAdministracion():config?basePedidosManuales(config):null;
 if(!db)redirect(fallo);
 const tabla=tipo==='tarjeta'?'pedidos_tilopay':'pedidos_manuales';
 const {data:pedido,error:lectura}=await db.from(tabla).select('estado,estado_entrega,cliente').eq('id',id).maybeSingle();
 if(lectura||!pedido||pedido.estado!=='pagado'||pedido.estado_entrega!==actual||!siguientesEstadosEntrega(actual,pedido.cliente?.modalidad).includes(siguiente))redirect(fallo);
 const {data,error}=await db.from(tabla).update({estado_entrega:siguiente}).eq('id',id).eq('estado','pagado').eq('estado_entrega',actual).select('id').maybeSingle();
 if(error||!data)redirect(fallo);
 revalidatePath('/panel/pedidos');
 redirect(`/panel/pedidos?seccion=${destino}&resultado=entrega_guardada`);
}

export async function cambiarArchivoPanel(form:FormData){
 if(!await autorizado())redirect('/admin');
 const id=String(form.get('id')??''),tipo=String(form.get('tipo')??'') as TipoRegistroPanel,operacion=String(form.get('operacion')??'');
 const destino=tipo==='asesoria'?'asesorias':tipo==='tarjeta'?'tarjeta':'manuales';
 const fallo=`/panel/pedidos?seccion=${destino}&resultado=archivo_conflicto`;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||!['asesoria','manual','tarjeta'].includes(tipo)||!['archivar','restaurar'].includes(operacion)||form.get('confirmar')!=='on')redirect(fallo);
 const archivar=operacion==='archivar';
 if(tipo==='asesoria'){
  if(!await archivarAsesoriaPanel(id,archivar))redirect(fallo);
 }else{
  const config=configuracionPedidosManuales();const db=tipo==='tarjeta'?basePedidosAdministracion():config?basePedidosManuales(config):null;if(!db)redirect(fallo);
  const tabla=tipo==='tarjeta'?'pedidos_tilopay':'pedidos_manuales';
  const {data:p,error}=await db.from(tabla).select('estado,estado_entrega,creado_en,archivado_en').eq('id',id).maybeSingle();
  if(error||!p||Boolean(p.archivado_en)===archivar||archivar&&!puedeArchivar(tipo,p))redirect(fallo);
  let q=db.from(tabla).update({archivado_en:archivar?new Date().toISOString():null}).eq('id',id).eq('estado',p.estado).eq('estado_entrega',p.estado_entrega);
  q=archivar?q.is('archivado_en',null):q.eq('archivado_en',p.archivado_en);
  const actualizado=await q.select('id').maybeSingle();if(actualizado.error||!actualizado.data)redirect(fallo);
 }
 revalidatePath('/panel/pedidos');
 redirect(`/panel/pedidos?seccion=${destino}&resultado=${archivar?'archivado':'restaurado'}`);
}
