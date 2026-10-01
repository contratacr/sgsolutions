import { accesoValido, basePedidosManuales, configuracionPedidosManuales, numeroPedido } from '@/lib/pedidos-manuales';
import { enviarCorreo } from '@/lib/email/send';
import { empresa } from '@/lib/empresa';

const tipos: Record<string, { extension: string; firma: number[] }> = {
  'image/jpeg': { extension: 'jpg', firma: [0xff, 0xd8, 0xff] },
  'image/png': { extension: 'png', firma: [0x89, 0x50, 0x4e, 0x47] },
  'application/pdf': { extension: 'pdf', firma: [0x25, 0x50, 0x44, 0x46] },
};

export async function POST(request: Request) {
  const config = configuracionPedidosManuales();
  if (!config) return Response.json({ error: 'no_disponible' }, { status: 503 });
  if (request.headers.get('origin') && request.headers.get('origin') !== config.origen) return Response.json({ error: 'datos_invalidos' }, { status: 403 });
  if (Number(request.headers.get('content-length') ?? 0) > 6 * 1024 * 1024) return Response.json({ error: 'archivo_invalido' }, { status: 413 });
  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: 'archivo_invalido' }, { status: 400 }); }
  const id = String(form.get('pedido') ?? ''), token = String(form.get('acceso') ?? '');
  const archivo = form.get('archivo');
  if (!accesoValido(config, id, token)) return Response.json({ error: 'no_encontrado' }, { status: 404 });
  if (!(archivo instanceof File) || archivo.size < 100 || archivo.size > 5 * 1024 * 1024 || !tipos[archivo.type]) return Response.json({ error: 'archivo_invalido' }, { status: 400 });
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const tipo = tipos[archivo.type];
  if (!tipo.firma.every((v, i) => bytes[i] === v)) return Response.json({ error: 'archivo_invalido' }, { status: 400 });
  const db = basePedidosManuales(config);
  const { data: pedido } = await db.from('pedidos_manuales').select('estado,comprobante_path').eq('id', id).maybeSingle();
  if (pedido?.estado !== 'pendiente_pago' || pedido.comprobante_path) return Response.json({ error: 'estado_invalido' }, { status: 409 });
  const ruta = `${id}/${crypto.randomUUID()}.${tipo.extension}`;
  const { error: archivoError } = await db.storage.from('comprobantes-pedidos').upload(ruta, bytes, { contentType: archivo.type, upsert: false });
  if (archivoError) return Response.json({ error: 'no_disponible' }, { status: 503 });
  const { data, error } = await db.from('pedidos_manuales').update({ comprobante_path: ruta, comprobante_en: new Date().toISOString(), estado: 'comprobante_recibido', actualizado_en: new Date().toISOString() }).eq('id', id).eq('estado', 'pendiente_pago').is('comprobante_path', null).select('id').maybeSingle();
  if (error || !data) {
    await db.storage.from('comprobantes-pedidos').remove([ruta]);
    return Response.json({ error: 'estado_invalido' }, { status: 409 });
  }
  try {
    await enviarCorreo({ destinatario: empresa.correo, asunto: `Comprobante recibido · ${numeroPedido(id)}`, texto: `El cliente adjuntó un comprobante al pedido ${numeroPedido(id)}. Revíselo en el panel y verifique el ingreso en el banco antes de marcarlo como pagado.` });
  } catch { /* El comprobante y su estado permanecen disponibles en el panel. */ }
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
