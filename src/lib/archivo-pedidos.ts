export type TipoRegistroPanel='asesoria'|'manual'|'tarjeta';
export function motivoArchivoValido(motivo:string){return motivo.trim().length>=3&&motivo.trim().length<=1000;}
export function puedeArchivar(tipo:TipoRegistroPanel,p:{estado:string;estado_entrega?:string;creado_en:string}) {
 if(tipo==='asesoria')return ['utilizada','cancelada'].includes(p.estado);
 if(tipo==='manual')return ['revision','pendiente_pago','cancelado'].includes(p.estado)||p.estado==='pagado'&&p.estado_entrega==='entregado';
 return ['iniciado','pendiente','rechazado','error'].includes(p.estado)||p.estado==='pagado'&&p.estado_entrega==='entregado';
}
