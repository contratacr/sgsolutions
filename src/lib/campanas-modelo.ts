import {z} from 'zod';
export const VERSION_PUBLICIDAD='2026-10-20-campanas-v1';
export const canales=['directo','facebook','instagram','google','whatsapp','tiktok','externo'] as const;
export const adquisicion=z.object({canal:z.enum(canales),medio:z.enum(['directo','organico','referido','pago','desconocido']),campana:z.string().max(60).regex(/^[a-z0-9_-]*$/)}).strict();
export type Adquisicion=z.infer<typeof adquisicion>;
export function origenCampana(busqueda:string,referencia:string):Adquisicion{
 const q=new URLSearchParams(busqueda),fuente=(q.get('utm_source')??'').toLowerCase();
 const conocidas:Record<string,Adquisicion['canal']>={facebook:'facebook',fb:'facebook',instagram:'instagram',ig:'instagram',google:'google',whatsapp:'whatsapp',tiktok:'tiktok'};
 let canal=conocidas[fuente];
 if(!canal)try{const h=new URL(referencia).hostname;canal=/(^|\.)facebook\.com$|(^|\.)fb\.com$/.test(h)?'facebook':/(^|\.)instagram\.com$/.test(h)?'instagram':/(^|\.)google\.[a-z.]+$/.test(h)?'google':h==='wa.me'||h==='api.whatsapp.com'?'whatsapp':/(^|\.)tiktok\.com$/.test(h)?'tiktok':'externo';}catch{canal='directo';}
 const m=(q.get('utm_medium')??'').toLowerCase(),c=(q.get('utm_campaign')??'').toLowerCase();
 return {canal,medio:canal==='directo'?'directo':['cpc','ppc','paid','paid_social','paid_search'].includes(m)?'pago':m==='organic'?'organico':'referido',campana:/^[a-z0-9_-]{1,60}$/.test(c)?c:''};
}
export const eventosPublicidad=['PageView','ViewContent','AddToCart','Search','WhatsAppClick','ContactClick','InitiateCheckout','Lead','Purchase'] as const;
export type EventoPublicidad=typeof eventosPublicidad[number];
export const eventoPublicidadNavegador=z.object({id:z.uuid(),evento:z.enum(['PageView','ViewContent','AddToCart','Search','WhatsAppClick','ContactClick','InitiateCheckout']),ruta:z.enum(['/','/tienda','/tienda/producto','/soporte','/empresas','/casos-de-exito','/nosotros','/contacto','/pagar','/finalizar-compra','/terminos','/privacidad']),producto:z.string().regex(/^[a-z0-9-]{1,100}$/).optional()}).strict();
export const contextoPublicidad=z.object({id:z.uuid(),creado:z.number().int(),vence:z.number().int(),primero:adquisicion,reciente:adquisicion,fbp:z.string().regex(/^fb\.1\.\d{10,13}\.\d{1,20}$/),fbc:z.string().regex(/^fb\.1\.\d{10,13}\.[A-Za-z0-9_-]{1,300}$/).optional()}).strict();
export type ContextoPublicidad=z.infer<typeof contextoPublicidad>;
export const hitosNegocio=['solicitud_recibida','pedido_creado','pago_confirmado','cotizacion_preparada'] as const;
export type HitoNegocio=typeof hitosNegocio[number];
