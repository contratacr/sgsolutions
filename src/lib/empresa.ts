export const empresa = {
  whatsapp: '50624467846',
  telefono: '+50624467846',
  correo: 'lsanchez@sgsolutionscr.com',
  mapa: 'https://www.google.com/maps/search/?api=1&query=SG+Solutions+Plaza+El+Bosque+Atenas+Costa+Rica'
};
export function enlaceWhatsApp(mensaje: string) {
  return `https://wa.me/${empresa.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}
