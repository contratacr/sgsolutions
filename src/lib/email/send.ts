import 'server-only';
import {plantillaCorreo} from './plantilla';
import {servicioPruebas} from '../servicio-pruebas';
import { z } from 'zod';
const correo = z.object({destinatario: z.email(), asunto: z.string().min(1).max(200), texto: z.string().min(1).max(100000), accion: z.object({texto:z.string().min(1),url:z.url().refine(v=>['https:','http:'].includes(new URL(v).protocol))}).optional()});

// Único punto de salida de correo de NEGOCIO. Auth utiliza su propio SMTP en Supabase.
// La confirmación de pedidos puede usar esta función desde el servidor cuando Brevo esté configurado.
export async function enviarCorreo(entrada: z.infer<typeof correo>) {
  const datos = correo.parse(entrada);
  const prueba=servicioPruebas('brevo');
  if (!prueba && process.env.SG_ENTORNO !== 'produccion') throw new Error('CORREO_REAL_DESHABILITADO_EN_DESARROLLO');
  const llave = process.env.BREVO_API_KEY;
  const remitente = z.email().safeParse(process.env.BREVO_REMITENTE);
  if (!llave || !remitente.success) throw new Error('CORREO_NO_CONFIGURADO');
  const respuesta = await fetch(prueba??'https://api.brevo.com/v3/smtp/email', {
    method: 'POST', headers: {'api-key': llave, 'Content-Type': 'application/json'},
    body: JSON.stringify({sender: {email: remitente.data, name: 'SG Solutions'}, to: [{email: datos.destinatario}], subject: datos.asunto, textContent: datos.texto, htmlContent: plantillaCorreo(datos.asunto, datos.texto, datos.accion)}),
    signal: AbortSignal.timeout(15000)
  });
  if (!respuesta.ok) throw new Error(`CORREO_PROVEEDOR_${respuesta.status}`);
  const confirmacion = z.object({messageId: z.string()}).parse(await respuesta.json());
  return confirmacion.messageId;
}
