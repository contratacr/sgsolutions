'use server';
import {revalidatePath} from 'next/cache';
import {crearClienteServidor} from '@/lib/supabase/servidor';
import {esquemaCatalogo,publicarCatalogo} from '@/lib/catalogo-modelo';
export async function guardarCatalogo(datos:unknown,revision:number){
 const cliente=await crearClienteServidor();
 if(!cliente) return {error:'noDisponible'};
 const {data:{user}}=await cliente.auth.getUser();
 if(!user)return {error:'sinPermiso'};
 const {data:perfil}=await cliente.from('perfiles').select('rol').eq('id',user.id).eq('activo',true).maybeSingle();
 if(perfil?.rol!=='administrador')return {error:'sinPermiso'};
 const validado=esquemaCatalogo.safeParse(datos);
 if(!validado.success||!Number.isInteger(revision)||revision<0)return {error:'validacion'};
 const {data,error}=await cliente.rpc('guardar_catalogo',{privado:validado.data,visible:publicarCatalogo(validado.data),revision_esperada:revision});
 if(error)return {error:error.message.includes('CONFLICTO')?'conflicto':'error'};
 revalidatePath('/','layout');
 return {revision:Number(data)};
}
