/** Preserve previous acceptances; use this version only for a new explicit action. */
export const VERSION_POLITICAS='2026-10-19';
export const PLAZO_ENTREGA_DIAS_HABILES=7;
export function textoPlazoEntrega(ingles=false){return ingles?'Delivery within 7 business days after payment confirmation.':'Entrega en un máximo de 7 días hábiles desde la confirmación del pago.';}
export function aceptacionPedido(){return {aceptacion_terminos_version:VERSION_POLITICAS,aceptacion_terminos_fecha:new Date().toISOString(),aceptacion_finalidad:'tramitar_pedido',plazo_entrega_dias_habiles:PLAZO_ENTREGA_DIAS_HABILES,plazo_entrega_desde:'pago_confirmado'};}
