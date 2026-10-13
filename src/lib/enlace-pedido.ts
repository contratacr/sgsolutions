/** Compact encoding only; authorization still verifies the full HMAC on the server. */
export function rutaPedido(id: string, acceso: string) {
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id) || !/^[0-9a-f]{64}$/.test(acceso)) throw new Error('ENLACE_PEDIDO_INVALIDO');
  const hex = id.replaceAll('-', '') + acceso;
  const bytes = hex.match(/../g)!.map(par => String.fromCharCode(parseInt(par, 16))).join('');
  return '/pedido/' + btoa(bytes).replaceAll('+', '-').replaceAll('/', '_');
}

export function datosEnlacePedido(url: URL): { pedido: string; acceso: string } {
  if (url.pathname === '/finalizar-compra/pedido') return { pedido: url.searchParams.get('pedido') ?? '', acceso: url.searchParams.get('acceso') ?? '' };
  const token = /^\/pedido\/([A-Za-z0-9_-]{64})$/.exec(url.pathname)?.[1];
  if (!token) return { pedido: '', acceso: '' };
  const hex = Array.from(atob(token.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  const id = hex.slice(0, 32);
  return { pedido: [id.slice(0, 8), id.slice(8, 12), id.slice(12, 16), id.slice(16, 20), id.slice(20)].join('-'), acceso: hex.slice(32) };
}
