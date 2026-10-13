function escapar(valor: string) {
  return valor.replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]!));
}
export function plantillaCorreo(asunto: string, texto: string, accion?: {texto: string; url: string}) {
  const contenido = accion ? texto.replaceAll(accion.url, '').replace(/:\s*$/, '.') : texto;
  return '<!doctype html><html><body style="margin:0;background:#f3f6f8;font-family:Arial,sans-serif;color:#183044"><main style="max-width:560px;margin:24px auto;background:#fff;padding:32px;border-radius:16px">' +
    '<img src="https://sgsolutionscr.com/imagenes/logo-principal.png" alt="SG Solutions" width="150" style="background:#102330;padding:16px;border-radius:8px">' +
    '<h1 style="font-size:22px;line-height:1.4">' + escapar(asunto) + '</h1>' +
    '<p style="font-size:16px;line-height:1.7;white-space:pre-line">' + escapar(contenido) + '</p>' +
    (accion ? '<p style="margin:28px 0"><a href="' + escapar(accion.url) + '" style="display:inline-block;background:#304e70;color:white;text-decoration:none;padding:16px 24px;border-radius:8px;font-weight:bold">' + escapar(accion.texto) + '</a></p>' : '') +
    '<p style="color:#5b7182;font-size:13px">SG Solutions · sgsolutionscr.com</p></main></body></html>';
}
