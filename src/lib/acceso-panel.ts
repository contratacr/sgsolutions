import 'server-only';
import {crearClienteServidor} from './supabase/servidor';
import {sesionLocal} from './admin-local';
import {crearClienteCuenta} from './supabase/cuenta';

export async function leerAccesoPanel():Promise<'administrador'|'sinSesion'|'sinPermiso'|'error'>{
 try{
  if(await sesionLocal())return 'administrador';
  const servidor=await crearClienteServidor();
  const cliente=servidor??await crearClienteCuenta();if(!cliente)return 'sinSesion';
  const {data:{user},error}=await cliente.auth.getUser();
  if(error||!user)return 'sinSesion';
  if(!user.email_confirmed_at)return 'sinPermiso';
  const permiso=await cliente.rpc('es_administrador_activo');
  if(permiso.error)return 'error';
  if(permiso.data!==true)return 'sinPermiso';
  return servidor?'administrador':'error';
 }catch{return 'error';}
}
