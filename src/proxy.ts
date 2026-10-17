import {cookiesSesion} from '@/lib/supabase/cookies-sesion';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { configuracionSupabase } from '@/lib/supabase/configuracion';
import { configuracionCuenta } from '@/lib/supabase/configuracion-cuenta';
export async function proxy(solicitud: NextRequest) {
  let respuesta = NextResponse.next({request: solicitud});
  respuesta.headers.set('Cache-Control', 'private, no-store');
  const configuracion = solicitud.nextUrl.pathname.startsWith('/cuenta') ? configuracionCuenta() : configuracionSupabase();
  if (!configuracion) return respuesta;
  const cliente = createServerClient(configuracion.url, configuracion.llave, {cookieOptions:cookiesSesion(configuracion.url),cookies: {
    getAll: () => solicitud.cookies.getAll(),
    setAll: nuevas => {
      nuevas.forEach(({name, value}) => solicitud.cookies.set(name, value));
      respuesta = NextResponse.next({request: solicitud});
      nuevas.forEach(({name, value, options}) => respuesta.cookies.set(name, value, options));
    }
  }});
  await cliente.auth.getUser();
  respuesta.headers.set('Cache-Control', 'private, no-store');
  return respuesta;
}
export const config = {matcher: ['/panel/:path*', '/acceso', '/admin/:path*', '/cuenta/:path*']};
