export const COSTO_ENVIO_CORREOS = 4000;

export function costoEntrega(modalidad: 'retiro' | 'envio' | 'entrega') {
  return modalidad === 'retiro' ? 0 : COSTO_ENVIO_CORREOS;
}
