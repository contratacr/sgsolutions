import { z } from 'zod';
export const correoCuenta = z.string().trim().toLowerCase().pipe(z.email().max(254));
export const claveCuenta = z.string().min(10).max(128);
export const registroCuenta = z.object({nombre:z.string().trim().min(2).max(150),correo:correoCuenta,clave:claveCuenta,confirmar:z.string().max(128)}).refine(datos=>datos.clave===datos.confirmar,{path:['confirmar']});
