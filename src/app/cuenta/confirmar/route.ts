import {solicitudCuenta,errorCuenta} from '@/lib/cuenta-errores';
import { NextRequest, NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { crearClienteCuenta } from '@/lib/supabase/cuenta';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  // Next dev puede construir request.url con localhost aunque la petición use 127.0.0.1.
  const host=request.headers.get('host')??'';
  const origen = process.env.NODE_ENV === 'development' && /^(127\.0\.0\.1|localhost):\d{1,5}$/.test(host)
    ? `http://${host}` : new URL(request.url).origin;
  const destino = new URL('/cuenta', origen);
  const fallo=request.nextUrl.searchParams.get('error');
  if(fallo){
    destino.searchParams.set('error',request.nextUrl.searchParams.get('error_code')==='user_banned'?'bloqueada':fallo==='access_denied'?'cancelado':'oauth');
    (await cookies()).delete('sg-aceptacion-oauth');
    return NextResponse.redirect(destino);
  }
  const codigo = request.nextUrl.searchParams.get('code');
  const hash = request.nextUrl.searchParams.get('token_hash');
  const tipo = request.nextUrl.searchParams.get('type');
  if ((codigo && codigo.length > 2048) || (!codigo && (!hash || hash.length > 2048 || !['email', 'magiclink', 'signup', 'recovery', 'email_change'].includes(tipo ?? '')))) {
    destino.searchParams.set('error', 'acceso');
    return NextResponse.redirect(destino);
  }
  const cliente = await crearClienteCuenta();
  if (!cliente) {
    destino.searchParams.set('error', 'configuracion');
    return NextResponse.redirect(destino);
  }
  const { error } = await solicitudCuenta(()=>codigo
    ? cliente.auth.exchangeCodeForSession(codigo)
    : cliente.auth.verifyOtp({ token_hash: hash!, type: tipo as EmailOtpType }));
  if(!error && codigo){
    const almacen=await cookies();
    const aceptacion=almacen.get('sg-aceptacion-oauth')?.value;
    if(aceptacion){
      const guardado=await solicitudCuenta(()=>cliente.auth.updateUser({data:{aceptacion_terminos_fecha:aceptacion,aceptacion_terminos_version:'2026-10-11'}}));
      if(guardado.error){
        await solicitudCuenta(()=>cliente.auth.signOut());
        destino.searchParams.set('error','conexion');
        return NextResponse.redirect(destino);
      }
      almacen.delete('sg-aceptacion-oauth');
    }
  }
  if (error) {
    (await cookies()).delete('sg-aceptacion-oauth');
    destino.searchParams.set('error',errorCuenta(error)==='cuentaBloqueada'?'bloqueada':errorCuenta(error)==='conexion'?'conexion':codigo?'oauth':'acceso');
  }
  else if (tipo === 'recovery' || request.nextUrl.searchParams.get('flujo') === 'recuperar') {
    const respuesta=await solicitudCuenta(()=>cliente.auth.getUser());
    const usuario='data' in respuesta?respuesta.data.user:null;
    if (usuario) {
      (await cookies()).set('sg-recuperacion', usuario.id, {httpOnly:true,secure:request.nextUrl.protocol==='https:',sameSite:'lax',path:'/cuenta',maxAge:600});
      return NextResponse.redirect(new URL('/cuenta/recuperar',origen));
    } else destino.searchParams.set('error','acceso');
  }
  if(!error&&tipo==='email_change')destino.searchParams.set('seccion','seguridad');
  return NextResponse.redirect(destino);
}
