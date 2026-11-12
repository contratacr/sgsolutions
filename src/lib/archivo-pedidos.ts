export type TipoRegistroPanel='asesoria'|'manual'|'tarjeta';
export function motivoArchivoValido(motivo:string){return motivo.trim().length>=3&&motivo.trim().length<=1000;}
/** An approved purchase link whose expiry passed can no longer be used, so archiving it also cancels it. */
export const enlaceVencido=(p:{estado:string;vence_en?:string|null},ahora=Date.now())=>p.estado==='aprobada'&&Boolean(p.vence_en)&&Date.parse(p.vence_en!)<=ahora;
export function puedeArchivar(tipo:TipoRegistroPanel,p:{estado:string;estado_entrega?:string;creado_en:string;vence_en?:string|null}) {
 if(tipo==='asesoria')return ['utilizada','cancelada'].includes(p.estado)||enlaceVencido(p);
 // Active manual orders (availability review, awaiting payment or receipt) must be cancelled first so the customer never loses a live order silently.
 if(tipo==='manual')return p.estado==='cancelado'||p.estado==='pagado'&&p.estado_entrega==='entregado';
 return ['iniciado','pendiente','rechazado','error'].includes(p.estado)||p.estado==='pagado'&&p.estado_entrega==='entregado';
}
/** Why an active record cannot be archived yet, for the panel explanation. */
export function motivoNoArchivable(tipo:TipoRegistroPanel,p:{estado:string;estado_entrega?:string}):'cancelarPrimero'|'entregarPrimero'|null{
 if(tipo==='manual'&&['revision','pendiente_pago','comprobante_recibido'].includes(p.estado))return 'cancelarPrimero';
 if(tipo!=='asesoria'&&p.estado==='pagado'&&p.estado_entrega!=='entregado')return 'entregarPrimero';
 return null;
}
