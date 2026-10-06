import {z} from 'zod';
import {normalizarTelefonoWhatsApp} from './telefono-whatsapp';
export const esquemaContactoAsesoria=z.object({
 nombre:z.string().trim().min(2).max(100),
 correo:z.email().max(150),
 telefono:z.string().max(25).transform(normalizarTelefonoWhatsApp).pipe(z.string()),
 tipoIdentificacion:z.enum(['fisica','juridica']),
 identificacion:z.string().trim().min(5).max(30).regex(/^(?=.*[\p{L}\p{N}])[\p{L}\p{N} -]+$/u),
 necesidad:z.string().trim().max(1000).default(''),
}).strict();
export type ContactoAsesoriaDatos=z.infer<typeof esquemaContactoAsesoria>;
