import {z} from 'zod';
export const etapasContacto=['recibido','calificado','cotizado','cerrado'] as const;
export const fuentesContacto=['sin_confirmar','sitio','sg_video_20261023','sg_ventas_tienda_20261028','sg_lenovo_82xm_20261105','otro'] as const;
export const contactoComercial=z.object({
 id:z.uuid(),revision:z.number().int().min(0),
 referencia:z.string().trim().regex(/^[A-Za-z0-9_-]{3,40}$/).transform(v=>v.toUpperCase()),
 fecha:z.iso.date(),canal:z.enum(['whatsapp','formulario','telefono','correo']),
 fuente:z.enum(fuentesContacto),etapa:z.enum(etapasContacto),
 prueba:z.boolean(),confirmado:z.literal(true)
}).strict();
export type ContactoComercial=z.infer<typeof contactoComercial>;
export type ContactoGuardado=Omit<ContactoComercial,'confirmado'>&{actualizado_en:string};
/** A short business reference, never a person/click identifier. */
export function referenciaConsulta(ruta:string,campana=''){
 const area=ruta==='/tienda'||ruta.startsWith('/tienda/')?'TIENDA':ruta==='/empresas'?'EMPRESAS':ruta==='/soporte'?'SOPORTE':'WEB';
 const origen=campana==='sg_lenovo_82xm_20261105'?'LENOVO-0511':campana==='sg_ventas_tienda_20261028'?'VENTAS-2810':campana==='sg_video_20261023'?'VIDEO-2310':'';
 return `SG-${area}${origen?'-'+origen:''}`;
}
export function agregarReferenciaWhatsApp(href:string,ruta:string,campana:string,idioma:string){
 const url=new URL(href);if(url.hostname!=='wa.me')return href;
 const texto=(url.searchParams.get('text')??'').replace(/\n\n(?:Referencia|Reference): SG-(?:TIENDA|EMPRESAS|SOPORTE|WEB)(?:-(?:VENTAS-2810|VIDEO-2310|LENOVO-0511))?$/,'');
 url.searchParams.set('text',`${texto}\n\n${idioma==='en'?'Reference':'Referencia'}: ${referenciaConsulta(ruta,campana)}`);return url.toString();
}
