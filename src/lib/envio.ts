export const COSTO_ENVIO_CORREOS = 3500;

export function costoEntrega(modalidad: 'retiro' | 'envio' | 'entrega') {
  return modalidad === 'retiro' ? 0 : COSTO_ENVIO_CORREOS;
}
