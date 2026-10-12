'use server';
import {revalidatePath} from 'next/cache';
import {crearClienteCuenta} from '@/lib/supabase/cuenta';
import {esquemaPerfilCompra} from '@/lib/perfil-compra';
export type EstadoDatosCompra='inicio'|'guardado'|'error'|'invalido'|'sinSesion';
export async function guardarDatosCompra(_estado:EstadoDatosCompra,formulario:FormData):Promise<EstadoDatosCompra>{
 try{
  const cliente=await crearClienteCuenta();if(!cliente)return 'sinSesion';
  const {data:{user},error}=await cliente.auth.getUser();if(error||!user?.email_confirmed_at)return 'sinSesion';
  const cuenta=await cliente.rpc('cuenta_habilitada');if(cuenta.data===false)return 'sinSesion';
  const guardados=await cliente.from('perfiles_compra_clientes').select('datos').eq('usuario_id',user.id).maybeSingle();
  if(guardados.error)return 'error';
  const anterior=esquemaPerfilCompra.safeParse(guardados.data?.datos);
  const datos=esquemaPerfilCompra.safeParse({...anterior.success?anterior.data:{},...Object.fromEntries(formulario)});if(!datos.success)return 'invalido';
  const respuesta=await cliente.from('perfiles_compra_clientes').upsert({usuario_id:user.id,datos:datos.data},{onConflict:'usuario_id'});
  if(respuesta.error)return 'error';
  revalidatePath('/cuenta');revalidatePath('/finalizar-compra');return 'guardado';
 }catch{return 'error';}
}
