import {expect, test} from '@playwright/test';
import es from '../messages/es.json';
import en from '../messages/en.json';
import {mensajePedidoWhatsApp} from '../src/lib/mensaje-pedido-whatsapp';

for (const [idioma, textos] of [['es', es.MensajePedido], ['en', en.MensajePedido]] as const) {
  test(`solicitud de WhatsApp clara en ${idioma}`, () => {
    const mensaje = mensajePedidoWhatsApp({
      lineas: [{cantidad: 1, nombre: 'Lenovo ThinkPad L14', codigo: '21H2S1NH00', precio: '₡619.000'}],
      subtotal: '₡619.000', nombre: 'Isaac Sanchez', telefono: '86162043',
      costoEnvio: '₡3.500', total: '₡622.500',
      correo: 'isaac_sanchez@example.com', contacto: 'WhatsApp', entrega: 'Correos de Costa Rica',
      pago: 'SINPE Móvil', comprobante: idioma === 'es' ? 'Tiquete electrónico' : 'Electronic receipt',
      enlaceProducto: 'https://sgsolutions.soportecontratacr.workers.dev/tienda/portatil',
    }, textos);
    expect(mensaje).toContain(`*${textos.titulo}*\n\n*${textos.productos}*`);
    expect(mensaje).toContain('• 1 × Lenovo ThinkPad L14 — ₡619.000\n');
    expect(mensaje).toContain('21H2S1NH00');
    expect(mensaje).toContain('isaac_sanchez@example.com');
    expect(mensaje).toContain(`*${textos.subtotal}: ₡619.000*`);
    expect(mensaje).toContain(`${textos.costoEnvio}: ₡3.500`);
    expect(mensaje).toContain(`*${textos.total}: ₡622.500*`);
    expect(mensaje).toContain(`_${textos.confirmacion}_`);
    expect(mensaje).not.toContain('\n\n\n');
  });
}
