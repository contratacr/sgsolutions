import {cookies} from 'next/headers';
import {sesionLocal} from '@/lib/admin-local';
import {crearClienteCuenta} from '@/lib/supabase/cuenta';
import {permisoConteo} from '@/lib/permiso-conteo';
// Eligibility only: no event, user identifier or session is stored here.
export async function GET(){
 const respuesta=(excluir:boolean,administracion=false)=>Response.json({excluir,administracion,...(!excluir?{permiso:permisoConteo()}: {})},{headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
 try{
  if(await sesionLocal())return respuesta(true,true);
  if(!(await cookies()).getAll().some(c=>/^sb-.*-auth-token(?:\.\d+)?$/.test(c.name)))return respuesta(false);
  const db=await crearClienteCuenta();if(!db)return respuesta(true);
  const {data,error}=await db.auth.getUser();if(error||!data.user)return respuesta(true);
  const perfil=await db.from('perfiles').select('rol,activo').eq('id',data.user.id).maybeSingle();
  if(perfil.error||!perfil.data)return respuesta(true);
  return respuesta(perfil.data.rol==='administrador'||!perfil.data.activo,perfil.data.rol==='administrador');
 }catch{return respuesta(true);}
}
