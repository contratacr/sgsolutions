import { NextRequest, NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { crearClienteCuenta } from '@/lib/supabase/cuenta';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  // Next dev puede construir request.url con localhost aunque la petición use 127.0.0.1.
  const origen = process.env.NODE_ENV === 'development' && request.headers.get('host') === '127.0.0.1:3107'
    ? 'http://127.0.0.1:3107' : new URL(request.url).origin;
  const destino = new URL('/cuenta', origen);
  const codigo = request.nextUrl.searchParams.get('code');
  const hash = request.nextUrl.searchParams.get('token_hash');
  const tipo = request.nextUrl.searchParams.get('type');
  if ((codigo && codigo.length > 2048) || (!codigo && (!hash || hash.length > 2048 || !['email', 'magiclink', 'signup', 'recovery'].includes(tipo ?? '')))) {
    destino.searchParams.set('error', 'acceso');
    return NextResponse.redirect(destino);
  }
  const cliente = await crearClienteCuenta();
  if (!cliente) {
    destino.searchParams.set('error', 'configuracion');
    return NextResponse.redirect(destino);
  }
  const { error } = codigo
    ? await cliente.auth.exchangeCodeForSession(codigo)
    : await cliente.auth.verifyOtp({ token_hash: hash!, type: tipo as EmailOtpType });
  if(!error && codigo){
    const almacen=await cookies();
    const aceptacion=almacen.get('sg-aceptacion-oauth')?.value;
    if(aceptacion){
      await cliente.auth.updateUser({data:{aceptacion_terminos_fecha:aceptacion,aceptacion_terminos_version:'2026-10-11'}});
      almacen.delete('sg-aceptacion-oauth');
    }
  }
  if (error) destino.searchParams.set('error', 'acceso');
  else if (tipo === 'recovery' || request.nextUrl.searchParams.get('flujo') === 'recuperar') {
    const usuario = (await cliente.auth.getUser()).data.user;
    if (usuario) {
      (await cookies()).set('sg-recuperacion', usuario.id, {httpOnly:true,secure:request.nextUrl.protocol==='https:',sameSite:'lax',path:'/cuenta',maxAge:600});
      return NextResponse.redirect(new URL('/cuenta/recuperar',origen));
    }
  }
  return NextResponse.redirect(destino);
}
