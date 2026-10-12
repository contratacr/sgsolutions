'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {crearClienteCuenta} from '@/lib/supabase/cuenta';
import {correoCuenta} from '@/lib/cuenta-validacion';
import {errorCuenta} from '@/lib/cuenta-errores';
import {origenPublico} from './acciones';

export type EstadoSeguridad='inicio'|'correoEnviado'|'recuperacionEnviada'|'correoInvalido'|'mismoCorreo'|'error'|'sinSesion'|'limiteIntentos'|'confirmarDesactivacion'|'adminProtegido'|'noDisponible'|'reautenticar';
async function sesionPropia(){
 const cliente=await crearClienteCuenta();if(!cliente)return null;
 const {data:{user},error}=await cliente.auth.getUser();if(error||!user?.email||!user.email_confirmed_at)return null;
 const estado=await cliente.rpc('cuenta_habilitada');if(estado.error||estado.data!==true)return null;
 return {cliente,user};
}
export async function cambiarCorreoCuenta(_estado:EstadoSeguridad,formulario:FormData):Promise<EstadoSeguridad>{
 try{
  const sesion=await sesionPropia();if(!sesion)return 'sinSesion';
  const correo=correoCuenta.safeParse(formulario.get('correo'));if(!correo.success)return 'correoInvalido';
  if(correo.data===sesion.user.email!.toLowerCase())return 'mismoCorreo';
  const origen=await origenPublico();if(!origen)return 'noDisponible';
  const {error}=await sesion.cliente.auth.updateUser({email:correo.data},{emailRedirectTo:`${origen}/cuenta/confirmar`});
  if(error)return errorCuenta(error)==='limiteIntentos'?'limiteIntentos':'error';
  revalidatePath('/cuenta');return 'correoEnviado';
 }catch{return 'error';}
}
export async function solicitarCambioClaveCuenta():Promise<EstadoSeguridad>{
 try{
  const sesion=await sesionPropia();if(!sesion)return 'sinSesion';
  const origen=await origenPublico();if(!origen)return 'noDisponible';
  const {error}=await sesion.cliente.auth.resetPasswordForEmail(sesion.user.email!,{redirectTo:`${origen}/cuenta/confirmar?flujo=recuperar`});
  if(error)return errorCuenta(error)==='limiteIntentos'?'limiteIntentos':'error';
  return 'recuperacionEnviada';
 }catch{return 'error';}
}
export async function desactivarCuentaPropia(_estado:EstadoSeguridad,formulario:FormData):Promise<EstadoSeguridad>{
 let desactivada=false;
 try{
  const sesion=await sesionPropia();if(!sesion)return 'sinSesion';
  if(formulario.get('acepta')!=='si'||String(formulario.get('confirmacion')??'').trim().toLowerCase()!==sesion.user.email!.toLowerCase())return 'confirmarDesactivacion';
  const {error}=await sesion.cliente.rpc('desactivar_mi_cuenta');
  if(error)return error.message.includes('ADMIN_PROTEGIDO')?'adminProtegido':error.message.includes('REAUTENTICAR')?'reautenticar':error.code==='PGRST202'?'noDisponible':'error';
  desactivada=true;await sesion.cliente.auth.signOut({scope:'global'});
 }catch{if(!desactivada)return 'error';}
 redirect('/cuenta?desactivada=si');
}
