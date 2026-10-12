import { configuracionSupabase } from './configuracion';

// La conexión de clientes puede probarse sin habilitar pagos ni administración remota.
export function configuracionCuenta() {
  const url = process.env.CUENTAS_SUPABASE_URL;
  const llave = process.env.CUENTAS_SUPABASE_ANON_KEY;
  if (!url || !llave) return configuracionSupabase();
  try {
    const servidor = new URL(url);
    if (servidor.protocol !== 'https:' && !['127.0.0.1', 'localhost', '[::1]'].includes(servidor.hostname)) return null;
    return {url, llave};
  } catch { return null; }
}
