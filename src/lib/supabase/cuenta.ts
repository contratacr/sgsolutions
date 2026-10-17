import {cookiesSesion} from './cookies-sesion';
import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { configuracionCuenta } from './configuracion-cuenta';

export async function crearClienteCuenta() {
  const configuracion = configuracionCuenta();
  if (!configuracion) return null;
  const almacen = await cookies();
  return createServerClient(configuracion.url, configuracion.llave, {cookieOptions:cookiesSesion(configuracion.url),cookies:{
    getAll: () => almacen.getAll(),
    setAll: nuevas => {
      try { nuevas.forEach(({name,value,options}) => almacen.set(name,value,options)); }
      catch { /* El proxy renueva la sesión fuera de Server Components. */ }
    },
  }});
}
