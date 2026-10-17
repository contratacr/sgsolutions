import {z} from 'zod';
import {tiposEvento} from './analitica-modelo';
const rutas=['/','/tienda','/tienda/producto','/soporte','/empresas','/casos-de-exito','/nosotros','/contacto','/pagar','/finalizar-compra','/terminos','/privacidad'] as const;
export const conteoAnonimo=z.object({tipo:z.enum(tiposEvento),ruta:z.enum(rutas),detalle:z.string().max(100),dispositivo:z.enum(['movil','escritorio']),idioma:z.enum(['es','en'])}).strict().refine(e=>{
 if(['producto','carrito','busqueda_producto'].includes(e.tipo))return /^[a-z0-9-]{1,100}$/.test(e.detalle);
 if(['plan','plan_revisado'].includes(e.tipo))return ['1','2','3'].includes(e.detalle);
 if(e.tipo==='scroll')return ['25','50','75','100'].includes(e.detalle);
 if(e.tipo==='whatsapp')return ['','footer','flotante','contenido'].includes(e.detalle);
 if(e.tipo==='red_social')return ['www.instagram.com','www.facebook.com'].includes(e.detalle);
 return e.detalle==='';
});
export type ConteoAnonimo=z.infer<typeof conteoAnonimo>;
