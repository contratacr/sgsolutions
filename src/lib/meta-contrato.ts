import {z} from 'zod';
import {eventosPublicidad,eventoPublicidadNavegador} from './campanas-modelo';
const fila=z.object({id:z.string().regex(/^[A-Za-z0-9_-]{43}$/),evento:z.enum(eventosPublicidad),creado_en:z.string().refine(v=>Number.isFinite(Date.parse(v))),ruta:eventoPublicidadNavegador.shape.ruta,producto:z.string().regex(/^[a-z0-9-]{1,100}$/).nullable(),valor:z.coerce.number().positive().max(100000000).nullable(),fbp:z.string().regex(/^fb\.1\.\d{10,13}\.\d{1,20}$/),fbc:z.string().regex(/^fb\.1\.\d{10,13}\.[A-Za-z0-9_-]{1,300}$/).nullable()});
/** Explicit output contract: never spread requests, customers, URLs or DB records. */
export function construirEventoMeta(entrada:unknown){
 const e=fila.parse(entrada);if(e.evento==='Purchase'&&e.valor===null)throw new Error('IMPORTE_REQUERIDO');
 return {event_name:e.evento,event_time:Math.floor(Date.parse(e.creado_en)/1000),event_id:e.id,action_source:'website',event_source_url:'https://sgsolutionscr.com'+(e.ruta==='/tienda/producto'?'/tienda':e.ruta),user_data:{fbp:e.fbp,...(e.fbc?{fbc:e.fbc}:{})},...(e.producto||e.evento==='Purchase'?{custom_data:{...(e.producto?{content_ids:[e.producto],content_type:'product'}:{}),...(e.evento==='Purchase'?{currency:'CRC',value:e.valor}:{})}}:{})};
}
/** Server-only diagnostic: one PageView, exact ID, expiring configuration. */
export function construirSolicitudMeta(entrada:unknown,prueba?:string,ahora=Date.now()){
 const evento=construirEventoMeta(entrada);
 if(prueba)try{
  const c=z.object({id:z.string().regex(/^[A-Za-z0-9_-]{43}$/),codigo:z.string().regex(/^TEST[0-9]{1,20}$/),vence:z.number().int()}).strict().parse(JSON.parse(prueba));
  if(c.id===evento.event_id&&evento.event_name==='PageView'&&evento.event_source_url==='https://sgsolutionscr.com/'&&c.vence>ahora&&c.vence<=ahora+3600000)return {data:[evento],test_event_code:c.codigo};
 }catch{/* Invalid diagnostic settings never change normal delivery. */}
 return {data:[evento]};
}
