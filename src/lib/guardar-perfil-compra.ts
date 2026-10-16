import 'server-only';
import {crearClienteCuenta} from './supabase/cuenta';
import {esquemaPerfilCompra} from './perfil-compra';
export type EstadoDatosCompra='inicio'|'guardado'|'error'|'invalido'|'sinSesion';
export async function guardarPerfilCompra(formulario:FormData):Promise<EstadoDatosCompra>{
 try{
  const cliente=await crearClienteCuenta();if(!cliente)return 'sinSesion';
  const {data:{user},error}=await cliente.auth.getUser();if(error||!user?.email_confirmed_at)return 'sinSesion';
  const cuenta=await cliente.rpc('cuenta_habilitada');if(cuenta.error)return 'error';if(cuenta.data!==true)return 'sinSesion';
  const guardados=await cliente.from('perfiles_compra_clientes').select('datos').eq('usuario_id',user.id).maybeSingle();
  if(guardados.error)return 'error';
  const anterior=esquemaPerfilCompra.safeParse(guardados.data?.datos);
  const datos=esquemaPerfilCompra.safeParse({...anterior.success?anterior.data:{},...Object.fromEntries(formulario)});if(!datos.success)return 'invalido';
  const respuesta=await cliente.from('perfiles_compra_clientes').upsert({usuario_id:user.id,datos:datos.data},{onConflict:'usuario_id'});
  if(respuesta.error)return 'error';
  return 'guardado';
 }catch{return 'error';}
}
