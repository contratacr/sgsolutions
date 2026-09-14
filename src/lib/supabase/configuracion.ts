export function configuracionSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !llave) return null;
  const servidor = new URL(url);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(servidor.hostname);
  // Un build de Next puede estar en modo producción y seguir siendo una prueba LOCAL.
  if (!local && !['produccion', 'test'].includes(process.env.SG_ENTORNO ?? 'local')) {
    throw new Error('SUPABASE_REMOTO_BLOQUEADO_EN_LOCAL');
  }
  return {url, llave};
}
