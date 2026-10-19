export const estadosEntrega = ['pendiente_preparar', 'preparando', 'listo_retiro', 'enviado', 'entregado'] as const;
export type EstadoEntrega = typeof estadosEntrega[number];
export function siguientesEstadosEntrega(actual: EstadoEntrega, modalidad: string | undefined): EstadoEntrega[] {
  if (actual === 'pendiente_preparar') return ['preparando'];
  if (actual === 'preparando') return [modalidad === 'digital' ? 'entregado' : modalidad === 'envio' || modalidad === 'express' ? 'enviado' : 'listo_retiro'];
  if (actual === 'enviado' || actual === 'listo_retiro') return ['entregado'];
  return [];
}
export function estadoGestion(pago: string, entrega: EstadoEntrega): string {
  if (pago === 'cancelado') return 'cancelado';
  if (pago !== 'pagado') return 'sin_pago';
  return entrega;
}
