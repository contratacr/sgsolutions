export const empresa = {
  whatsapp: '50664399417',
  telefono: '+50624467846',
  correo: 'soporte@sgsolutionscr.com',
  instagram: 'https://www.instagram.com/sgsolutionscr/?hl=es-la',
  facebook: 'https://www.facebook.com/sgsolutionscr?locale=es_LA',
  mapa: 'https://www.google.com/maps/search/?api=1&query=SG+Solutions+Plaza+El+Bosque+Atenas+Costa+Rica',
  waze: 'https://www.waze.com/ul?q=SG%20Solutions%20Plaza%20El%20Bosque%20Atenas%20Costa%20Rica&navigate=yes'
};
export function enlaceWhatsApp(mensaje: string) {
  return `https://wa.me/${empresa.whatsapp}?text=${encodeURIComponent(mensaje)}`;
}

export function enlaceCorreo(asunto = '', cuerpo = '') {
  const parametros = new URLSearchParams({to: empresa.correo});
  if (asunto) parametros.set('subject', asunto);
  if (cuerpo) parametros.set('body', cuerpo);
  return `https://outlook.office.com/mail/deeplink/compose?${parametros.toString()}`;
}
