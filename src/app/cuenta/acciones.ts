'use server';
import { z } from 'zod';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { crearClienteCuenta } from '@/lib/supabase/cuenta';
import { correoCuenta, claveCuenta, registroCuenta } from '@/lib/cuenta-validacion';
import {proveedoresCuenta} from '@/lib/supabase/proveedores-cuenta';

export type EstadoAccesoCliente = 'inicio' | 'invalido' | 'noDisponible' | 'error' | 'credenciales' | 'confirmarCorreo' | 'aceptacionRequerida' | 'clavesDistintas' | 'claveCorta' | 'registroEnviado' | 'recuperacionEnviada' | 'confirmacionEnviada';
async function origenPublico() {
  const origenPeticion = (await headers()).get('origin');
  if (process.env.NODE_ENV === 'development' && origenPeticion === 'http://127.0.0.1:3107') return origenPeticion;
  const valor = process.env.PEDIDOS_ORIGEN_PUBLICO;
  if (!valor) return null;
  try {
    const url = new URL(valor);
    if (url.protocol === 'https:' || (process.env.SG_ENTORNO !== 'produccion' && url.origin === 'http://127.0.0.1:3107')) return url.origin;
  } catch { /* El origen no está configurado. */ }
  return null;
}
export async function accederCliente(_anterior: EstadoAccesoCliente, formulario: FormData): Promise<EstadoAccesoCliente> {
  const modo = formulario.get('modo');
  const datos = Object.fromEntries(formulario);
  if (modo === 'registro') {
    if(formulario.get('acepta')!=='si') return 'aceptacionRequerida';
    if (typeof datos.clave === 'string' && !claveCuenta.safeParse(datos.clave).success) return 'claveCorta';
    if (datos.clave !== datos.confirmar) return 'clavesDistintas';
    const validado = registroCuenta.safeParse(datos);
    if (!validado.success) return 'invalido';
    const cliente = await crearClienteCuenta();
    const origen = await origenPublico();
    if (!cliente || !origen) return 'noDisponible';
    const idioma = (await cookies()).get('sg-idioma')?.value === 'en' ? 'en' : 'es';
    const {error} = await cliente.auth.signUp({email:validado.data.correo,password:validado.data.clave,options:{emailRedirectTo:`${origen}/cuenta/confirmar`,data:{nombre_completo:validado.data.nombre,idioma,aceptacion_terminos_fecha:new Date().toISOString(),aceptacion_terminos_version:'2026-10-11'}}});
    if (error) return 'error';
    return 'registroEnviado';
  }
  const correo = correoCuenta.safeParse(datos.correo);
  if (!correo.success) return 'invalido';
  const cliente = await crearClienteCuenta();
  if (!cliente) return 'noDisponible';
  if (modo === 'recuperar' || modo === 'reenviar') {
    const origen = await origenPublico();
    if (!origen) return 'noDisponible';
    const {error} = modo === 'recuperar'
      ? await cliente.auth.resetPasswordForEmail(correo.data,{redirectTo:`${origen}/cuenta/confirmar?flujo=recuperar`})
      : await cliente.auth.resend({type:'signup',email:correo.data,options:{emailRedirectTo:`${origen}/cuenta/confirmar`}});
    if (error) return 'error';
    return modo === 'recuperar' ? 'recuperacionEnviada' : 'confirmacionEnviada';
  }
  if (modo !== 'login' || !z.string().min(1).max(128).safeParse(datos.clave).success) return 'invalido';
  const {error} = await cliente.auth.signInWithPassword({email:correo.data,password:String(datos.clave)});
  if (error) return error.code === 'email_not_confirmed' ? 'confirmarCorreo' : 'credenciales';
  redirect('/cuenta');
}
export async function actualizarClaveCliente(_anterior: EstadoAccesoCliente, formulario: FormData): Promise<EstadoAccesoCliente> {
  const clave = claveCuenta.safeParse(formulario.get('clave'));
  if (!clave.success) return 'claveCorta';
  if (clave.data !== formulario.get('confirmar')) return 'clavesDistintas';
  const cliente = await crearClienteCuenta();
  const almacen = await cookies();
  const usuario = cliente ? (await cliente.auth.getUser()).data.user : null;
  if (!cliente || !usuario || almacen.get('sg-recuperacion')?.value !== usuario.id) return 'error';
  const {error} = await cliente.auth.updateUser({password:clave.data});
  if (error) return 'error';
  almacen.delete('sg-recuperacion');
  redirect('/cuenta?clave=actualizada');
}
export async function cerrarSesionCliente() {
  const cliente = await crearClienteCuenta();
  if (cliente) await cliente.auth.signOut();
  (await cookies()).delete('sg-recuperacion');
  redirect('/cuenta');
}

export async function accederCuentaSocial(_anterior:EstadoAccesoCliente,formulario:FormData):Promise<EstadoAccesoCliente> {
  if(formulario.get('modo')==='registro'&&formulario.get('acepta')!=='si') return 'aceptacionRequerida';
  const proveedor=formulario.get('proveedor');
  if (proveedor!=='google' && proveedor!=='facebook') return 'invalido';
  const habilitados=await proveedoresCuenta();
  if (!habilitados[proveedor]) return 'noDisponible';
  const cliente=await crearClienteCuenta();
  const origen=await origenPublico();
  if (!cliente || !origen) return 'noDisponible';
  const {data,error}=await cliente.auth.signInWithOAuth({provider:proveedor,options:{redirectTo:`${origen}/cuenta/confirmar`,skipBrowserRedirect:true,...(proveedor==='facebook'?{scopes:'email'}:{})}});
  if (error || !data.url) return 'error';
  if(formulario.get('modo')==='registro') (await cookies()).set('sg-aceptacion-oauth',new Date().toISOString(),{httpOnly:true,secure:origen.startsWith('https:'),sameSite:'lax',path:'/cuenta',maxAge:600});
  redirect(data.url);
}
