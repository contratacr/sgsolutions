'use server';
import {VERSION_POLITICAS} from '@/lib/politicas';
import {marcarLimpiezaCompra} from '@/lib/limpieza-compra-servidor';
import {conservarExclusionAdministrativa} from '@/lib/exclusion-medicion';
import {retornoCompra} from '@/lib/retorno-compra';
import { z } from 'zod';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { crearClienteCuenta } from '@/lib/supabase/cuenta';
import { correoCuenta, claveCuenta, registroCuenta, errorClaveCuenta } from '@/lib/cuenta-validacion';
import {errorCuenta, solicitudCuenta, type ErrorCuenta} from '@/lib/cuenta-errores';
import {proveedoresCuenta} from '@/lib/supabase/proveedores-cuenta';

export type EstadoAccesoCliente = ErrorCuenta | 'correoInvalido' | 'nombreInvalido' | 'inicio' | 'invalido' | 'noDisponible' | 'error' | 'credenciales' | 'confirmarCorreo' | 'aceptacionRequerida' | 'clavesDistintas' | 'claveCorta' | 'registroEnviado' | 'recuperacionEnviada' | 'confirmacionEnviada';
export async function origenPublico() {
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
async function guardarRetorno(valor:unknown,origen:string){
 const almacen=await cookies(),destino=retornoCompra(valor);
 if(destino)almacen.set('sg-retorno-compra',destino,{httpOnly:true,secure:origen.startsWith('https:'),sameSite:'lax',path:'/cuenta',maxAge:3600});else almacen.set('sg-retorno-compra','',{path:'/cuenta',maxAge:0});
}
export async function accederCliente(_anterior: EstadoAccesoCliente, formulario: FormData): Promise<EstadoAccesoCliente> {
  const modo = formulario.get('modo');
  const datos = Object.fromEntries(formulario);
  if (modo === 'registro') {
    if(formulario.get('acepta')!=='si') return 'aceptacionRequerida';
    if (!correoCuenta.safeParse(datos.correo).success) return 'correoInvalido';
    if (!z.string().trim().min(2).max(150).safeParse(datos.nombre).success) return 'nombreInvalido';
    const errorClave=errorClaveCuenta(datos.clave);if(errorClave)return errorClave;
    if (datos.clave !== datos.confirmar) return 'clavesDistintas';
    const validado = registroCuenta.safeParse(datos);
    if (!validado.success) return 'invalido';
    const cliente = await crearClienteCuenta();
    const origen = await origenPublico();
    if (!cliente || !origen) return 'noDisponible';
    const idioma = (await cookies()).get('sg-idioma')?.value === 'en' ? 'en' : 'es';
    await guardarRetorno(formulario.get('retorno'),origen);
    const {error} = await solicitudCuenta(()=>cliente.auth.signUp({email:validado.data.correo,password:validado.data.clave,options:{emailRedirectTo:`${origen}/cuenta/confirmar`,data:{nombre_completo:validado.data.nombre,idioma,aceptacion_terminos_fecha:new Date().toISOString(),aceptacion_terminos_version:VERSION_POLITICAS}}}));
    if (error && !['email_exists','user_already_exists'].includes('code' in error ? String(error.code):'')) return errorCuenta(error);
    return 'registroEnviado';
  }
  const correo = correoCuenta.safeParse(datos.correo);
  if (!correo.success) return 'correoInvalido';
  const cliente = await crearClienteCuenta();
  if (!cliente) return 'noDisponible';
  if (modo === 'recuperar' || modo === 'reenviar') {
    const origen = await origenPublico();
    if (!origen) return 'noDisponible';
    const {error} = await solicitudCuenta(async()=>{const resultado=await (modo === 'recuperar'
      ? cliente.auth.resetPasswordForEmail(correo.data,{redirectTo:`${origen}/cuenta/confirmar?flujo=recuperar`})
      : cliente.auth.resend({type:'signup',email:correo.data,options:{emailRedirectTo:`${origen}/cuenta/confirmar`}}));return {error:resultado.error};});
    if (error && !['user_not_found','email_not_confirmed'].includes('code' in error ? String(error.code):'')) return errorCuenta(error);
    return modo === 'recuperar' ? 'recuperacionEnviada' : 'confirmacionEnviada';
  }
  if (modo !== 'login' || !z.string().min(1).max(128).safeParse(datos.clave).success) return 'invalido';
  const {error} = await solicitudCuenta(()=>cliente.auth.signInWithPassword({email:correo.data,password:String(datos.clave)}));
  if (error) return errorCuenta(error,true);
  const habilitada=await solicitudCuenta(()=>cliente.rpc('cuenta_habilitada'));
  if('data' in habilitada&&habilitada.data===false){await solicitudCuenta(()=>cliente.auth.signOut());return 'cuentaBloqueada';}
  (await cookies()).set('sg-retorno-compra','',{path:'/cuenta',maxAge:0});
  redirect(retornoCompra(formulario.get('retorno'))??'/cuenta');
}
export async function actualizarClaveCliente(_anterior: EstadoAccesoCliente, formulario: FormData): Promise<EstadoAccesoCliente> {
  const clave = claveCuenta.safeParse(formulario.get('clave'));
  if (!clave.success) return errorClaveCuenta(formulario.get('clave'))??'claveDebil';
  if (clave.data !== formulario.get('confirmar')) return 'clavesDistintas';
  const cliente = await crearClienteCuenta();
  const almacen = await cookies();
  const respuesta = cliente ? await solicitudCuenta(()=>cliente.auth.getUser()) : null;
  const usuario = respuesta && 'data' in respuesta ? respuesta.data.user : null;
  if (!cliente || !usuario || almacen.get('sg-recuperacion')?.value !== usuario.id) return 'sesionVencida';
  const {error} = await solicitudCuenta(()=>cliente.auth.updateUser({password:clave.data}));
  if (error) return errorCuenta(error);
  almacen.delete('sg-recuperacion');
  redirect('/cuenta?clave=actualizada');
}
export async function cerrarSesionCliente() {
  await marcarLimpiezaCompra();
  const cliente = await crearClienteCuenta();
  await conservarExclusionAdministrativa(cliente);
  if (cliente) await cliente.auth.signOut();
  (await cookies()).delete('sg-recuperacion');
  redirect('/cuenta');
}

export async function accederCuentaSocial(_anterior:EstadoAccesoCliente,formulario:FormData):Promise<EstadoAccesoCliente> {
  if(formulario.get('acepta')!=='si') return 'aceptacionRequerida';
  const proveedor=formulario.get('proveedor');
  if (proveedor!=='google' && proveedor!=='facebook') return 'invalido';
  const habilitados=await proveedoresCuenta();
  if (!habilitados[proveedor]) return 'noDisponible';
  const cliente=await crearClienteCuenta();
  const origen=await origenPublico();
  if (!cliente || !origen) return 'noDisponible';
  await guardarRetorno(formulario.get('retorno'),origen);
  const respuesta=await solicitudCuenta(()=>cliente.auth.signInWithOAuth({provider:proveedor,options:{redirectTo:`${origen}/cuenta/confirmar`,skipBrowserRedirect:true,...(proveedor==='facebook'?{scopes:'email'}:{})}}));
  if(respuesta.error) return errorCuenta(respuesta.error);
  const data='data' in respuesta?respuesta.data:null;
  if(!data?.url)return 'error';
  (await cookies()).set('sg-aceptacion-oauth',new Date().toISOString(),{httpOnly:true,secure:origen.startsWith('https:'),sameSite:'lax',path:'/cuenta',maxAge:600});
  redirect(data.url);
}

export async function verificarCodigoCuenta(correo: string, codigo: string, retorno?: string) {
 const email=correoCuenta.safeParse(correo);
 if(!email.success||!/^\d{6}$/.test(codigo))return {error:'codigoInvalido'};
 const cliente=await crearClienteCuenta();
 if(!cliente)return {error:'noDisponible'};
 const {error}=await solicitudCuenta(()=>cliente.auth.verifyOtp({email:email.data,token:codigo,type:'email'}));
 if(error)return {error:('code' in error&&error.code==='otp_expired')?'codigoInvalido':errorCuenta(error)==='limiteIntentos'?'limiteIntentos':'codigoInvalido'};
 const habilitada=await solicitudCuenta(()=>cliente.rpc('cuenta_habilitada'));
 if('data' in habilitada&&habilitada.data===false){await cliente.auth.signOut();return {error:'cuentaBloqueada'};}
 const almacen=await cookies();
 const destino=retornoCompra(retorno)??retornoCompra(almacen.get('sg-retorno-compra')?.value)??'/cuenta';
 almacen.set('sg-retorno-compra','',{path:'/cuenta',maxAge:0});
 return {destino};
}
