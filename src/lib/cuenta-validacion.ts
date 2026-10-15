import { z } from 'zod';
export const correoCuenta = z.string().trim().toLowerCase().pipe(z.email().max(254));
export const MINIMO_CLAVE_CUENTA = 8;
export function requisitosClave(valor:string){
 return {longitud:valor.length>=MINIMO_CLAVE_CUENTA&&valor.length<=128,mayuscula:/[A-Z]/.test(valor),minuscula:/[a-z]/.test(valor),numero:/[0-9]/.test(valor),simbolo:/[!@#$%^&*()_+\-=\[\]{};'":|<>?,./`~\\]/.test(valor)};
}
export const claveCuenta = z.string().min(MINIMO_CLAVE_CUENTA).max(128).refine(valor=>Object.values(requisitosClave(valor)).every(Boolean));
export function errorClaveCuenta(valor:unknown):'claveCorta'|'claveDebil'|null{
 if(typeof valor!=='string'||valor.length<MINIMO_CLAVE_CUENTA||valor.length>128)return 'claveCorta';
 return claveCuenta.safeParse(valor).success?null:'claveDebil';
}
export const registroCuenta = z.object({nombre:z.string().trim().min(2).max(150),correo:correoCuenta,clave:claveCuenta,confirmar:z.string().max(128)}).refine(datos=>datos.clave===datos.confirmar,{path:['confirmar']});
