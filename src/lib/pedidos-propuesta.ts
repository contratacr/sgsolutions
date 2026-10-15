/** Ejemplos ficticios para revisar el diseño local, sin conexión a pedidos reales. */
export type MetodoPropuesta='sinpe'|'transferencia'|'tarjeta';
export type EntregaPropuesta='retiro'|'envio'|'express';
export type EstadoPropuesta='comprobante'|'pendiente_pago'|'por_preparar'|'preparando'|'listo_retiro'|'enviado'|'entregado'|'rechazado'|'cancelado';
export type PedidoPropuesta={id:string;cliente:string;fecha:string;metodo:MetodoPropuesta;entrega:EntregaPropuesta;estado:EstadoPropuesta;guia?:string;comprobante?:{nombre:string;tipo:string};total:number;producto:string;cantidad:number;archivado?:boolean;lineas?:{producto:string;cantidad:number;precio:number}[];enlaceToken?:string;venceEn?:string;sinModalidad?:boolean};
const pedidosIniciales:PedidoPropuesta[]=[
 {id:'SG-1048',cliente:'María Solís',fecha:'2026-10-14T16:45:00-06:00',metodo:'sinpe',entrega:'retiro',estado:'comprobante',total:30500,producto:'combo',cantidad:1},
 {id:'SG-1047',cliente:'Carlos Rojas',fecha:'2026-10-14T16:20:00-06:00',metodo:'tarjeta',entrega:'envio',estado:'por_preparar',total:72000,producto:'monitor',cantidad:1},
 {id:'SG-1046',cliente:'Ana Mora',fecha:'2026-10-14T15:55:00-06:00',metodo:'transferencia',entrega:'express',estado:'comprobante',total:17000,producto:'router',cantidad:1},
 {id:'SG-1045',cliente:'Luis Vargas',fecha:'2026-10-14T14:30:00-06:00',metodo:'sinpe',entrega:'envio',estado:'pendiente_pago',total:15000,producto:'mouse',cantidad:1},
 {id:'SG-1044',cliente:'Daniela Castro',fecha:'2026-10-14T14:05:00-06:00',metodo:'tarjeta',entrega:'express',estado:'preparando',total:68000,producto:'monitor',cantidad:1},
 {id:'SG-1043',cliente:'Jorge Jiménez',fecha:'2026-10-14T13:40:00-06:00',metodo:'transferencia',entrega:'retiro',estado:'listo_retiro',total:11000,producto:'mouse',cantidad:1},
 {id:'SG-1042',cliente:'Elena Sánchez',fecha:'2026-10-14T12:10:00-06:00',metodo:'tarjeta',entrega:'retiro',estado:'rechazado',total:30500,producto:'combo',cantidad:1},
 {id:'SG-1041',cliente:'Pablo Araya',fecha:'2026-10-13T16:35:00-06:00',metodo:'sinpe',entrega:'express',estado:'enviado',total:17000,producto:'router',cantidad:1},
 {id:'SG-1040',cliente:'Sofía Chaves',fecha:'2026-10-13T12:15:00-06:00',metodo:'transferencia',entrega:'envio',estado:'entregado',total:34500,producto:'combo',cantidad:1},
 {id:'SG-1039',cliente:'Andrés León',fecha:'2026-10-12T09:20:00-06:00',metodo:'tarjeta',entrega:'retiro',estado:'cancelado',total:11000,producto:'mouse',cantidad:1},
 {id:'SG-1038',cliente:'Laura Campos',fecha:'2026-10-11T11:00:00-06:00',metodo:'sinpe',entrega:'retiro',estado:'entregado',total:17000,producto:'router',cantidad:1,archivado:true},
];
// Matriz completa de escenarios válidos: varios ejemplos por etapa y combinación.
const adicionales:PedidoPropuesta[]=[];
for(const metodo of ['sinpe','transferencia','tarjeta'] as const){
 for(const entrega of ['retiro','envio','express'] as const){
  for(const estado of ['pendiente_pago','comprobante','por_preparar','preparando','listo_retiro','enviado','entregado','rechazado','cancelado'] as const){
   if(estado==='comprobante'&&metodo==='tarjeta'||estado==='listo_retiro'&&entrega!=='retiro'||estado==='enviado'&&entrega==='retiro')continue;
   const i=adicionales.length;
   adicionales.push({id:`SG-${1037-i}`,cliente:['Andrea','Diego','Valeria','Esteban','Natalia','Gabriel'][i%6]+' '+['Ramírez','Vega','Castillo','Arias','Fernández'][i%5],fecha:new Date(Date.UTC(2026,9,10,18)-i*3600000).toISOString(),metodo,entrega,estado,total:30500+(entrega==='envio'?4000:0),producto:'combo',cantidad:1});
  }
 }
}
export const pedidosPropuesta:PedidoPropuesta[]=[...pedidosIniciales,...adicionales,...adicionales.filter(p=>p.estado==='entregado'||p.estado==='cancelado').slice(0,8).map((p,i)=>({...p,id:`SG-ARCH-${i+1}`,archivado:true}))];
export type VistaPropuesta='por_atender'|'preparacion'|'finalizados';
export function vistaPedidoPropuesta(estado:EstadoPropuesta):VistaPropuesta{
 if(['preparando','listo_retiro'].includes(estado))return 'preparacion';
 if(['enviado','entregado','cancelado'].includes(estado))return 'finalizados';
 return 'por_atender';
}
export function pagoPedidoPropuesta(estado:EstadoPropuesta){
 if(estado==='comprobante')return 'por_verificar';
 if(estado==='pendiente_pago')return 'pendiente';
 if(estado==='rechazado')return 'rechazado';
 if(estado==='cancelado')return 'cancelado';
 return 'confirmado';
}
