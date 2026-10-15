import {datosClienteCompra,telefonoCompra} from '@/lib/datos-cliente-compra';
import {costoEntrega} from '@/lib/envio';
import {verificarCompraEurocomp} from '@/lib/eurocomp-compra';
import {origenPermitido} from '@/lib/origen-permitido';
import {validarAprobacion,reservarAprobacion,cambiarAsesoria} from '@/lib/asesorias';
import { z } from 'zod';
import { basePedidos, configuracionTilopay, iniciarTilopay, tokenTilopay, tokenSdkTilopay } from '@/lib/tilopay';

const solicitud = z.object({
  sdk:z.boolean().optional(),
  asesoria:z.uuid(),acceso:z.string().regex(/^(?:[0-9a-f]{32}|[0-9a-f]{64})$/),
  nombre: z.string().trim().min(1).max(100),
  apellidos: z.string().trim().min(1).max(100),
  correo: z.email().max(150),
  telefono: telefonoCompra,
  articulos: z.array(z.object({ id: z.string().regex(/^[a-z0-9-]{1,60}$/), cantidad: z.number().int().min(1).max(99) })).min(1).max(30),
  consentimiento: z.literal(true),
  idioma: z.enum(['es','en']).default('es'),
  datos: datosClienteCompra.optional(),
}).superRefine((v,ctx)=>{
  const d=v.datos;
  if(d && (d.nombre!==v.nombre || d.apellidos!==v.apellidos || d.correo!==v.correo || d.telefono!==v.telefono))ctx.addIssue({code:'custom',message:'cliente'});
  if(d&&d.modalidad!=='retiro' && (!d.provincia || !d.canton || !d.distrito || !d.direccion))ctx.addIssue({code:'custom',message:'entrega'});
  if(d?.factura==='electronica' && (!d.identificacion || !d.razonSocial || !d.correoFactura || !d.direccionFiscal))ctx.addIssue({code:'custom',message:'factura'});
});

export async function POST(request: Request) {
  if(!origenPermitido(request))return Response.json({error:'datos_invalidos'},{status:403});
  let prevalidado;try{const texto=await request.clone().text();if(texto.length>12000)throw new Error("limite");prevalidado=JSON.parse(texto);}catch{return Response.json({error:"datos_invalidos"},{status:400});}
  if(!prevalidado || typeof prevalidado.asesoria!=="string" || typeof prevalidado.acceso!=="string")return Response.json({error:"asesoria_requerida"},{status:403});
  let entrada: z.infer<typeof solicitud>;
  try {
    const cuerpo = await request.text();
    if (cuerpo.length > 10000) throw new Error('CUERPO_EXCESIVO');
    entrada = solicitud.parse(JSON.parse(cuerpo));
  } catch {
    return Response.json({ error: 'datos_invalidos' }, { status: 400 });
  }
  if (new Set(entrada.articulos.map(x => x.id)).size !== entrada.articulos.length) {
    return Response.json({ error: 'datos_invalidos' }, { status: 400 });
  }
  const aprobacion=await validarAprobacion(entrada);
  if(!aprobacion)return Response.json({error:"asesoria_requerida"},{status:403});
  const config = configuracionTilopay();
  if (entrada.sdk && (config?.modo!=='pruebas'||process.env.SG_ENTORNO==='produccion'))return Response.json({error:'sdk_solo_pruebas'},{status:503});
  if (!config) return Response.json({ error: 'no_disponible' }, { status: 503 });
  const retorno = process.env.TILOPAY_RETORNO_URL;
  if (!retorno || !/^https:\/\//.test(retorno) && !/^http:\/\/127\.0\.0\.1:3107\//.test(retorno)) {
    return Response.json({ error: 'no_disponible' }, { status: 503 });
  }
  let total = 0;
  const articulos = [];
  for (const linea of entrada.articulos) {
    const producto = aprobacion.articulos.find(x=>x.producto.id===linea.id)?.producto;
    if (!producto || producto.precio === null || producto.disponibilidad === 'agotado') {
      return Response.json({ error: 'catalogo_actualizado' }, { status: 409 });
    }
    total += producto.precio * linea.cantidad;
    articulos.push({ id: producto.id, codigo: producto.codigoFabricante, nombre: producto.nombre.es, cantidad: linea.cantidad, precio: producto.precio });
  }
  const subtotal=total;
  const envio=costoEntrega(entrada.datos?.modalidad ?? 'retiro');
  total+=envio;
  if (!Number.isSafeInteger(total) || total <= 0 || total > 100000000) {
    return Response.json({ error: 'datos_invalidos' }, { status: 400 });
  }
  try{await verificarCompraEurocomp(aprobacion.articulos);}catch{return Response.json({error:'catalogo_actualizado'},{status:409});}
  if(!await reservarAprobacion(aprobacion))return Response.json({error:"asesoria_requerida"},{status:403});
  const id = crypto.randomUUID();
  const db = basePedidos(config);
  const { error: guardarError } = await db.from('pedidos_tilopay').insert({
    id, estado: 'iniciado', entorno: config.modo, total, moneda: 'CRC',
    cliente: { ...(entrada.datos ?? {nombre:entrada.nombre,apellidos:entrada.apellidos,correo:entrada.correo,telefono:entrada.telefono,modalidad:'retiro'}), idioma:entrada.idioma, total_productos:subtotal, costo_envio:envio, envio_cobro_separado:entrada.datos?.modalidad==='express' },
    articulos,
  });
  if (guardarError) {await cambiarAsesoria(aprobacion.id,'procesando',{estado:'aprobada'});return Response.json({ error: 'no_disponible' }, { status: 503 });}
  try {
    if(entrada.sdk){
      const token=await tokenSdkTilopay(config);
      const opciones={
        token,currency:'CRC',language:entrada.idioma,amount:total,orderNumber:id,
        billToFirstName:entrada.nombre,billToLastName:entrada.apellidos,billToEmail:entrada.correo,
        billToAddress:entrada.datos?.direccionFiscal||entrada.datos?.direccion||'Retiro en tienda',
        billToCountry:'CR',billToTelephone:entrada.telefono,capture:1,subscription:0,
        redirect:retorno,returnData:btoa(id),hashVersion:'V2',
      };
      const actualizado=await db.from('pedidos_tilopay').update({estado:'pendiente',actualizado_en:new Date().toISOString()}).eq('id',id).eq('estado','iniciado');
      if(actualizado.error)throw new Error('SDK_PEDIDO_NO_GUARDADO');
      await cambiarAsesoria(aprobacion.id,'procesando',{estado:'utilizada',pedido_id:id});
      return Response.json({sdk:opciones,metodo:process.env.TILOPAY_SDK_METODO_TARJETA??''},{headers:{'Cache-Control':'no-store'}});
    }
    const token = await tokenTilopay(config);
    const url = await iniciarTilopay(config, token, {
      redirect: retorno, amount: total.toFixed(2), currency: 'CRC', orderNumber: id,
      capture: '1', billToFirstName: entrada.nombre, billToLastName: entrada.apellidos,
      billToAddress: entrada.datos?.direccionFiscal || entrada.datos?.direccion || 'Centro Comercial Plaza El Bosque, local 9', billToAddress2: entrada.datos?.apartamento || 'Mercedes',
      billToCity: entrada.datos?.canton || 'Atenas', billToState: 'CR-A', billToZipPostCode: '20501', billToCountry: 'CR',
      billToTelephone: entrada.telefono, billToEmail: entrada.correo,
      shipToFirstName: entrada.nombre, shipToLastName: entrada.apellidos,
      shipToAddress: entrada.datos?.direccion || 'Centro Comercial Plaza El Bosque, local 9', shipToAddress2: entrada.datos?.apartamento || 'Mercedes',
      shipToCity: entrada.datos?.canton || 'Atenas', shipToState: 'CR-A', shipToZipPostCode: '20501', shipToCountry: 'CR',
      shipToTelephone: entrada.telefono, subscription: '0', platform: 'api',
      returnData: btoa(id), token_version: 'v2',
    });
    await db.from('pedidos_tilopay').update({ estado: 'pendiente', actualizado_en: new Date().toISOString() }).eq('id', id).eq('estado', 'iniciado');
    await cambiarAsesoria(aprobacion.id,'procesando',{estado:'utilizada',pedido_id:id});
    return Response.json({ url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    await cambiarAsesoria(aprobacion.id,'procesando',{estado:'utilizada',pedido_id:id});
    console.error('TILOPAY_INICIO_FALLIDO', error instanceof Error ? error.message : 'DESCONOCIDO');
    await db.from('pedidos_tilopay').update({ estado: 'error', actualizado_en: new Date().toISOString() }).eq('id', id).eq('estado', 'iniciado');
    return Response.json({ error: 'no_disponible' }, { status: 502 });
  }
}
