import 'server-only';
import {crearClienteCuenta} from './supabase/cuenta';
import {esquemaPerfilCompra,contactoGuardado} from './perfil-compra';
export async function leerPerfilCompra(){
 const cliente=await crearClienteCuenta();if(!cliente)return null;
 try{
  const {data:{user},error}=await cliente.auth.getUser();if(error||!user?.email||!user.email_confirmed_at)return null;
  const estado=await cliente.rpc('cuenta_habilitada');if(estado.data===false)return null;
  const respuesta=await cliente.from('perfiles_compra_clientes').select('datos').eq('usuario_id',user.id).maybeSingle();
  const perfil=esquemaPerfilCompra.safeParse(respuesta.data?.datos);
  const nombre=typeof user.user_metadata.nombre_completo==='string'?user.user_metadata.nombre_completo:typeof user.user_metadata.full_name==='string'?user.user_metadata.full_name:'';
  return {datos:contactoGuardado(nombre,user.email,perfil.success?perfil.data:null),error:Boolean(respuesta.error)};
 }catch{return null;}
}
