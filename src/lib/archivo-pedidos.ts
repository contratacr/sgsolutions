export type TipoRegistroPanel='asesoria'|'manual'|'tarjeta';
export function puedeArchivar(tipo:TipoRegistroPanel,p:{estado:string;estado_entrega?:string;creado_en:string},ahora=Date.now()) {
 if(tipo==='asesoria')return ['utilizada','cancelada'].includes(p.estado);
 if(tipo==='manual')return p.estado==='cancelado'||p.estado==='pagado'&&p.estado_entrega==='entregado';
 return ['rechazado','error'].includes(p.estado)||p.estado==='pagado'&&p.estado_entrega==='entregado'||['iniciado','pendiente'].includes(p.estado)&&Number.isFinite(Date.parse(p.creado_en))&&Date.parse(p.creado_en)<=ahora-24*3600000;
}
