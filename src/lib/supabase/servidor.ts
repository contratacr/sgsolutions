import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { configuracionSupabase } from './configuracion';
export async function crearClienteServidor() {
  const configuracion = configuracionSupabase();
  if (!configuracion) return null;
  const almacen = await cookies();
  return createServerClient(configuracion.url, configuracion.llave, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: nuevas => {
        try { nuevas.forEach(({name, value, options}) => almacen.set(name, value, options)); }
        catch { /* El proxy renueva cookies cuando el componente solo puede leerlas. */ }
      }
    }
  });
}
