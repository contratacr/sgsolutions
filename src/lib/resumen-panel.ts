import 'server-only';
import {basePedidosAdministracion} from './tilopay';
import {basePedidosManuales,configuracionPedidosManuales} from './pedidos-manuales';
import {resumenAnalitica} from './analitica-servidor';
import {leerSoporte} from './soporte-servidor';

/** A count is `null` when its source is unavailable, so the home never shows a zero in place of an error. */
export type ResumenPanel={
 porVerificar:number|null;porPreparar:number|null;enCamino:number|null;esperandoPago:number|null;
 ticketsAbiertos:number|null;visitas7:number|null;pagados30:number|null;ingresos30:number|null;
};

type Consulta=PromiseLike<{count:number|null;error:unknown}>;
const contar=async(consulta:Consulta|null)=>{if(!consulta)return null;try{const {count,error}=await consulta;return error?null:count??0;}catch{return null;}};
const sumar=(...valores:(number|null)[])=>valores.some(v=>v===null)?null:valores.reduce<number>((s,v)=>s+(v??0),0);

export async function leerResumenPanel():Promise<ResumenPanel>{
 const tarjeta=basePedidosAdministracion();
 const config=configuracionPedidosManuales();const manual=config?basePedidosManuales(config):null;
 const m=()=>manual!.from('pedidos_manuales').select('id',{count:'exact',head:true}).is('archivado_en',null);
 const c=()=>tarjeta!.from('pedidos_tilopay').select('id',{count:'exact',head:true}).is('archivado_en',null).eq('entorno','produccion');
 const [verificar,prepararManual,prepararTarjeta,caminoManual,caminoTarjeta,esperando,tickets,semana,mes]=await Promise.all([
  contar(manual?m().in('estado',['comprobante_recibido','revision']):null),
  contar(manual?m().eq('estado','pagado').in('estado_entrega',['pendiente_preparar','preparando']):null),
  contar(tarjeta?c().eq('estado','pagado').in('estado_entrega',['pendiente_preparar','preparando']):null),
  contar(manual?m().eq('estado','pagado').in('estado_entrega',['listo_retiro','enviado']):null),
  contar(tarjeta?c().eq('estado','pagado').in('estado_entrega',['listo_retiro','enviado']):null),
  contar(manual?m().eq('estado','pendiente_pago'):null),
  leerSoporte('tickets','',false,1).then(d=>d.total).catch(()=>null),
  resumenAnalitica(7).catch(()=>null),
  resumenAnalitica(30).catch(()=>null),
 ]);
 const visitas=semana?.diario?semana.diario.reduce((s,d)=>s+d.paginas,0):semana?semana.filas.filter(f=>f.tipo==='pagina').reduce((s,f)=>s+f.cantidad,0):null;
 return {
  porVerificar:verificar,porPreparar:sumar(prepararManual,prepararTarjeta),enCamino:sumar(caminoManual,caminoTarjeta),esperandoPago:esperando,
  ticketsAbiertos:tickets,visitas7:visitas,pagados30:mes?.compras?.pagados??null,ingresos30:mes?.compras?.ingresos??null,
 };
}
