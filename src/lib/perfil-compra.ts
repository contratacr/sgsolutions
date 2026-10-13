import {telefonoCompra} from './datos-cliente-compra';
import {z} from 'zod';
export const esquemaPerfilCompra=z.object({
 nombre:z.string().trim().min(1).max(100),apellidos:z.string().trim().min(1).max(100),
 telefono:z.preprocess(v=>typeof v==='string'&&v.trim()==='+506'?'':v,z.union([z.string().trim().refine(v=>telefonoCompra.safeParse(v).success),z.literal('')]).default('')),
 tipoIdentificacion:z.enum(['fisica','juridica']).default('fisica'),identificacion:z.string().trim().max(150).default(''),
 razonSocial:z.string().trim().max(150).default(''),correoFactura:z.union([z.email().max(150),z.literal('')]).default(''),
 direccionFiscal:z.string().trim().max(150).default(''),
 provincia:z.string().trim().max(80).default(''),canton:z.string().trim().max(80).default(''),distrito:z.string().trim().max(80).default(''),direccion:z.string().trim().max(350).default(''),
});
export type PerfilCompra=z.infer<typeof esquemaPerfilCompra>;
export function contactoGuardado(nombreCompleto:string,correo:string,perfil?:PerfilCompra|null){
 const partes=nombreCompleto.trim().split(/\s+/);
 return {...(perfil??{nombre:partes.slice(0,-1).join(' ')||nombreCompleto,apellidos:partes.length>1?partes.at(-1)!:'',telefono:'+506 '}),correo};
}
export function combinarDatosCompra(guardados:Record<string,string>,contacto:Record<string,string>){
 return {...guardados,...Object.fromEntries(Object.entries(contacto).filter(([,valor])=>valor.trim()))};
}
