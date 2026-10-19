import 'server-only';
import {cache} from 'react';
import {redirect} from 'next/navigation';
import {crearClienteServidor} from './supabase/servidor';
import {sesionLocal} from './admin-local';
import {crearClienteCuenta} from './supabase/cuenta';

export const leerAccesoPanel=cache(async():Promise<'administrador'|'sinSesion'|'sinPermiso'|'error'|'mfa'>=>{
 try{
  if(await sesionLocal())return 'administrador';
  const servidor=await crearClienteServidor();
  const cliente=servidor??await crearClienteCuenta();if(!cliente)return 'sinSesion';
  const {data:{user},error}=await cliente.auth.getUser();
  if(error||!user)return 'sinSesion';
  if(!user.email_confirmed_at)return 'sinPermiso';
  const permiso=await cliente.rpc('es_administrador_identificado');
  if(permiso.error)return 'error';
  if(permiso.data!==true)return 'sinPermiso';
  if(!servidor)return 'error';
  const segundo=await cliente.rpc('es_administrador_activo');
  if(segundo.error)return 'error';
  return segundo.data===true?'administrador':'mfa';
 }catch{return 'error';}
});

/** Runs inside every administrative entry point; layouts alone do not protect actions. */
export async function exigirAdminMfa(){
 const acceso=await leerAccesoPanel();
 if(acceso==='mfa')redirect('/admin/doble-factor');
 if(acceso!=='administrador')redirect('/admin');
}
