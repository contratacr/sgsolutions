'use server';
import {z} from 'zod';
import {crearClienteServidor} from '@/lib/supabase/servidor';

export async function aceptarInvitacion(accessToken:string,refreshToken:string){
 const tokens=z.object({accessToken:z.string().min(20).max(12000),refreshToken:z.string().min(10).max(4000)}).safeParse({accessToken,refreshToken});
 if(!tokens.success)return false;
 const cliente=await crearClienteServidor();
 if(!cliente)return false;
 const {error}=await cliente.auth.setSession({access_token:accessToken,refresh_token:refreshToken});
 if(error)return false;
 const {data:{user}}=await cliente.auth.getUser();
 if(!user)return false;
 const {data:perfil}=await cliente.from('perfiles').select('rol,activo').eq('id',user.id).single();
 if(!perfil?.activo||perfil.rol!=='administrador'){await cliente.auth.signOut();return false;}
 return true;
}
export async function guardarClave(_estado:string,form:FormData){
 const clave=String(form.get('clave')??'');
 if(clave.length<12||clave.length>128)return 'longitud';
 if(clave!==form.get('confirmacion'))return 'coincidencia';
 const cliente=await crearClienteServidor();
 if(!cliente)return 'invalido';
 const {data:{user}}=await cliente.auth.getUser();
 if(!user)return 'invalido';
 const {data:perfil}=await cliente.from('perfiles').select('rol,activo').eq('id',user.id).single();
 if(!perfil?.activo||perfil.rol!=='administrador')return 'invalido';
 const {error}=await cliente.auth.updateUser({password:clave});
 if(error)return 'error';
 await cliente.auth.signOut();
 return 'listo';
}
