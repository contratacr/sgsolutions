import {z} from 'zod';
export const tiposEvento=['pagina','producto','busqueda_producto','carrito','plan','whatsapp','correo','telefono','mapa','red_social','galeria','pedido_revisado','plan_revisado','scroll','busqueda','busqueda_vacia','filtro','formulario_inicio','formulario_error','formulario_abandono'] as const;
export const rutaPublica=(ruta:string)=>/^\/(?:|tienda(?:\/[a-z0-9-]{1,100})?|soporte|empresas|casos-de-exito|nosotros|contacto|pagar|finalizar-compra|terminos|privacidad)$/.test(ruta);
export const eventoAnalitica=z.object({id:z.uuid(),sesion:z.uuid(),visitante:z.uuid().optional(),tipo:z.enum(tiposEvento),ruta:z.string().refine(rutaPublica),detalle:z.string().max(100).regex(/^[a-zA-Z0-9_.:/-]*$/),dispositivo:z.enum(['movil','escritorio']),idioma:z.enum(['es','en']),campana:z.string().max(80).regex(/^[a-zA-Z0-9_-]*$/)}).strict();
export type EventoAnalitica=z.infer<typeof eventoAnalitica>;
export type ResumenAnalitica={modo?:'agregado';total:number;sesiones:number;visitantes?:number;filas:{tipo:string;detalle:string;cantidad:number}[];diario?:{fecha:string;visitas:number;paginas:number}[];dispositivos?:{detalle:string;cantidad:number}[];idiomas?:{detalle:string;cantidad:number}[];clientes?:{total:number;nuevos:number;activos:number};compras?:{total:number;pagados:number;pendientes:number;ingresos:number;promedio:number}};
export function resumirEventos(eventos:EventoAnalitica[]):ResumenAnalitica{
 const grupos=new Map<string,{tipo:string;detalle:string;cantidad:number}>();
 for(const e of eventos){const detalle=e.tipo==='pagina'?e.ruta:e.detalle;const k=e.tipo+'|'+detalle;const g=grupos.get(k)??{tipo:e.tipo,detalle,cantidad:0};g.cantidad++;grupos.set(k,g);if(e.tipo==='pagina'&&e.campana){const k='campana|'+e.campana;const g=grupos.get(k)??{tipo:'campana',detalle:e.campana,cantidad:0};g.cantidad++;grupos.set(k,g);}}
 return {total:eventos.length,sesiones:new Set(eventos.map(e=>e.sesion)).size,visitantes:new Set(eventos.map(e=>e.visitante??e.sesion)).size,filas:[...grupos.values()].sort((a,b)=>b.cantidad-a.cantidad)};
}
