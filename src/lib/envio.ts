export const COSTO_ENVIO_CORREOS = 4000;

export function costoEntrega(modalidad: 'retiro' | 'envio' | 'entrega' | 'express' | 'digital') {
  return modalidad === 'digital' || modalidad === 'retiro' || modalidad === 'express' ? 0 : COSTO_ENVIO_CORREOS;
}
