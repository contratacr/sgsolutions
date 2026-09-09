import 'server-only';
import { z } from 'zod';
const correo = z.object({destinatario: z.email(), asunto: z.string().min(1).max(200), texto: z.string().min(1).max(100000)});

// Único punto de salida de correo de NEGOCIO. Auth utiliza su propio SMTP en Supabase.
// Ninguna ruta pública llama esta función. Habilitar con la cola de cotizaciones.
export async function enviarCorreo(entrada: z.infer<typeof correo>) {
  const datos = correo.parse(entrada);
  if (process.env.SG_ENTORNO !== 'produccion') throw new Error('CORREO_REAL_DESHABILITADO_EN_DESARROLLO');
  const llave = process.env.BREVO_API_KEY;
  const remitente = z.email().safeParse(process.env.BREVO_REMITENTE);
  if (!llave || !remitente.success) throw new Error('CORREO_NO_CONFIGURADO');
  const respuesta = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST', headers: {'api-key': llave, 'Content-Type': 'application/json'},
    body: JSON.stringify({sender: {email: remitente.data}, to: [{email: datos.destinatario}], subject: datos.asunto, textContent: datos.texto}),
    signal: AbortSignal.timeout(15000)
  });
  if (!respuesta.ok) throw new Error(`CORREO_PROVEEDOR_${respuesta.status}`);
  const confirmacion = z.object({messageId: z.string()}).parse(await respuesta.json());
  return confirmacion.messageId;
}
