import 'server-only';
import {cookies} from 'next/headers';
import type {crearClienteCuenta} from './supabase/cuenta';

const cookie='sg-excluir-medicion';
export async function navegadorAdministrativoGuardado(){return (await cookies()).get(cookie)?.value==='1';}
export async function guardarNavegadorAdministrativo(){
 // Same constant for every administrative browser: no account, device or visitor ID.
 (await cookies()).set(cookie,'1',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*365});
}
/** Preserve the exclusion before sign-out removes the authenticated role. */
export async function conservarExclusionAdministrativa(cliente:Awaited<ReturnType<typeof crearClienteCuenta>>){
 if(!cliente)return;
 try{
  const {data,error}=await cliente.auth.getUser();
  if(error){await guardarNavegadorAdministrativo();return;}
  if(!data.user)return;
  const perfil=await cliente.from('perfiles').select('rol').eq('id',data.user.id).maybeSingle();
  if(perfil.error||perfil.data?.rol==='administrador')await guardarNavegadorAdministrativo();
 }catch{/* Measurement must never prevent signing out. */}
}
