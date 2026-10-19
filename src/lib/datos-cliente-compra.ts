import {tiposIdentificacion} from './identificacion-compra';
import {telefonoPosible} from './telefono-pais';
import {z} from 'zod';
import {identificacionCompraValida} from './identificacion-compra';
export const telefonoCompra = z.string().trim().regex(/^\+?[0-9\s().-]+$/).transform(v=>v.replace(/[\s().-]/g,'' )).pipe(z.string().regex(/^\+?[0-9]{8,15}$/).refine(telefonoPosible));
const telefono = telefonoCompra;
export const datosClienteCompra = z.object({
    nombre: z.string().trim().min(1).max(100), apellidos: z.string().trim().min(1).max(100),
    correo: z.string().trim().pipe(z.email().max(150)), telefono,
    whatsapp:z.union([telefono,z.literal('')]).optional(),
    pais:z.literal('CR').optional(),
    tipoCliente:z.enum(['fisica','juridica']).optional(),
    contacto: z.enum(['whatsapp', 'llamada', 'email']).default('whatsapp'),
    modalidad: z.enum(['retiro', 'envio', 'express', 'digital']),
    provincia: z.string().trim().max(80).optional(), canton: z.string().trim().max(80).optional(),
    distrito: z.string().trim().max(80).optional(), direccion: z.string().trim().max(350).optional(),
    apartamento: z.string().trim().max(150).optional(), postal: z.string().trim().max(30).optional(),
    receptor: z.string().trim().max(150).optional(), telefonoReceptor: z.union([telefono, z.literal('')]).optional(),
    factura: z.enum(['tiquete', 'electronica']), tipoIdentificacion:z.enum(tiposIdentificacion).optional(), identificacion: z.string().trim().max(150).optional(),
    razonSocial: z.string().trim().max(150).optional(), actividad: z.string().trim().max(150).optional(),
    correoFactura: z.union([z.string().trim().pipe(z.email().max(150)), z.literal('')]).optional(), direccionFiscal: z.string().trim().max(150).optional(),
    notas: z.string().trim().max(600).optional(), consentimiento: z.literal('on'),
  }).superRefine((datos,ctx)=>{
    if(datos.tipoCliente==='juridica'&&!datos.razonSocial?.trim())ctx.addIssue({code:'custom',path:['razonSocial'],message:'empresa'});
    if(['envio','express'].includes(datos.modalidad))for(const campo of ['provincia','canton','distrito','direccion'] as const)if(!datos[campo]?.trim())ctx.addIssue({code:'custom',path:[campo],message:'entrega'});
    if((datos.factura==='electronica'||datos.identificacion?.trim())&&!identificacionCompraValida(datos.tipoIdentificacion,datos.identificacion??''))ctx.addIssue({code:'custom',path:['identificacion'],message:'identificacion'});
  });
