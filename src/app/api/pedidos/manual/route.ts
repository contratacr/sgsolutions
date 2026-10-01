import { z } from 'zod';
import { leerCatalogoPublico } from '@/lib/catalogo-servidor';
import { basePedidosManuales, configuracionPedidosManuales, enlacePedido, numeroPedido } from '@/lib/pedidos-manuales';
import { enviarCorreo } from '@/lib/email/send';
import { empresa } from '@/lib/empresa';

const telefono = z.string().trim().regex(/^\+?[0-9\s-]{8,20}$/);
const entrada = z.object({
  idioma: z.enum(['es', 'en']),
  datos: z.object({
    nombre: z.string().trim().min(1).max(100), apellidos: z.string().trim().min(1).max(100),
    correo: z.email().max(150), telefono,
    contacto: z.enum(['whatsapp', 'llamada', 'email']),
    modalidad: z.enum(['retiro', 'envio']),
    provincia: z.string().trim().max(80).optional(), canton: z.string().trim().max(80).optional(),
    distrito: z.string().trim().max(80).optional(), direccion: z.string().trim().max(350).optional(),
    apartamento: z.string().trim().max(150).optional(), postal: z.string().trim().max(30).optional(),
    receptor: z.string().trim().max(150).optional(), telefonoReceptor: z.union([telefono, z.literal('')]).optional(),
    factura: z.enum(['tiquete', 'electronica']), identificacion: z.string().trim().max(150).optional(),
    razonSocial: z.string().trim().max(150).optional(), actividad: z.string().trim().max(150).optional(),
    correoFactura: z.union([z.email().max(150), z.literal('')]).optional(), direccionFiscal: z.string().trim().max(150).optional(),
    notas: z.string().trim().max(600).optional(), consentimiento: z.literal('on'),
  }),
  metodo: z.enum(['sinpe', 'transferencia']),
  articulos: z.array(z.object({ id: z.string().regex(/^[a-z0-9-]{1,60}$/), cantidad: z.number().int().min(1).max(20) })).min(1).max(30),
}).superRefine((v, ctx) => {
  if (v.datos.modalidad === 'envio' && (!v.datos.provincia || !v.datos.canton || !v.datos.distrito || !v.datos.direccion)) ctx.addIssue({ code: 'custom', message: 'entrega' });
  if (v.datos.factura === 'electronica' && (!v.datos.identificacion || !v.datos.razonSocial || !v.datos.correoFactura || !v.datos.direccionFiscal)) ctx.addIssue({ code: 'custom', message: 'factura' });
  if (new Set(v.articulos.map(x => x.id)).size !== v.articulos.length) ctx.addIssue({ code: 'custom', message: 'duplicado' });
});

export async function POST(request: Request) {
  const config = configuracionPedidosManuales();
  if (!config) return Response.json({ error: 'no_disponible' }, { status: 503 });
  if (request.headers.get('origin') && request.headers.get('origin') !== config.origen) return Response.json({ error: 'datos_invalidos' }, { status: 403 });
  let datos: z.infer<typeof entrada>;
  try {
    const cuerpo = await request.text();
    if (cuerpo.length > 12000) throw new Error('limite');
    datos = entrada.parse(JSON.parse(cuerpo));
  } catch { return Response.json({ error: 'datos_invalidos' }, { status: 400 }); }
  const catalogo = await leerCatalogoPublico();
  const articulos: { id: string; codigo: string; nombre: string; cantidad: number; precio: number }[] = [];
  let total = 0;
  for (const linea of datos.articulos) {
    const producto = catalogo.productos.find(p => p.id === linea.id);
    if (!producto || producto.precio === null || producto.disponibilidad === 'agotado') return Response.json({ error: 'catalogo_actualizado' }, { status: 409 });
    total += producto.precio * linea.cantidad;
    articulos.push({ id: producto.id, codigo: producto.codigoFabricante, nombre: producto.nombre.es, cantidad: linea.cantidad, precio: producto.precio });
  }
  if (!Number.isSafeInteger(total) || total <= 0 || total > 100000000) return Response.json({ error: 'datos_invalidos' }, { status: 400 });
  const id = crypto.randomUUID();
  const db = basePedidosManuales(config);
  const { error } = await db.from('pedidos_manuales').insert({ id, metodo: datos.metodo, total_productos: total, cliente: { ...datos.datos, idioma: datos.idioma }, articulos });
  if (error) return Response.json({ error: 'no_disponible' }, { status: 503 });
  const numero = numeroPedido(id);
  const enlace = enlacePedido(config, id, config.origen);
  const ingles = datos.idioma === 'en';
  const cliente = enviarCorreo({ destinatario: datos.datos.correo,
    asunto: ingles ? `SG Solutions order ${numero} received` : `Recibimos su pedido ${numero} de SG Solutions`,
    texto: ingles
      ? `We received your order ${numero}. Please wait for our team to confirm availability, delivery cost and final total before paying. Follow its status here: ${enlace}`
      : `Recibimos su pedido ${numero}. Espere a que nuestro equipo confirme disponibilidad, costo de entrega y total definitivo antes de pagar. Consulte su estado aquí: ${enlace}`,
  });
  const equipo = enviarCorreo({ destinatario: empresa.correo, asunto: `Nuevo pedido ${numero} · ${datos.metodo.toUpperCase()}`,
    texto: `Pedido ${numero}\nCliente: ${datos.datos.nombre} ${datos.datos.apellidos}\nCorreo: ${datos.datos.correo}\nTeléfono: ${datos.datos.telefono}\nProductos: ${articulos.map(x => `${x.cantidad} × ${x.nombre}`).join(', ')}\nSubtotal: ₡${total}\nRevisar y confirmar disponibilidad en el panel.`,
  });
  const [correoCliente, correoEquipo] = await Promise.allSettled([cliente, equipo]);
  if (correoCliente.status === 'fulfilled' || correoEquipo.status === 'fulfilled') await db.from('pedidos_manuales').update({
    ...(correoCliente.status === 'fulfilled' ? { correo_cliente_en: new Date().toISOString() } : {}),
    ...(correoEquipo.status === 'fulfilled' ? { correo_equipo_en: new Date().toISOString() } : {}),
  }).eq('id', id);
  return Response.json({ numero, url: new URL(enlace).pathname + new URL(enlace).search, correoEnviado: correoCliente.status === 'fulfilled' }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
