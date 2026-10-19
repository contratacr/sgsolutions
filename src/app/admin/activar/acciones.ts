'use server';
import {z} from 'zod';
import {crearClienteServidor} from '@/lib/supabase/servidor';
import {errorClaveCuenta} from '@/lib/cuenta-validacion';

export async function aceptarInvitacion(accessToken:string,refreshToken:string){
 const tokens=z.object({accessToken:z.string().min(20).max(12000),refreshToken:z.string().min(10).max(4000)}).safeParse({accessToken,refreshToken});
 if(!tokens.success)return false;
 const cliente=await crearClienteServidor();
 if(!cliente)return false;
 const {error}=await cliente.auth.setSession({access_token:accessToken,refresh_token:refreshToken});
 if(error)return false;
 const {data:{user}}=await cliente.auth.getUser();
 if(!user)return false;
 const permiso=await cliente.rpc('es_administrador_identificado');
 if(permiso.error||permiso.data!==true){await cliente.auth.signOut();return false;}
 return true;
}
export async function guardarClave(_estado:string,form:FormData){
 const clave=String(form.get('clave')??'');
 const errorClave=errorClaveCuenta(clave);if(errorClave)return errorClave==='claveCorta'?'longitud':'requisitos';
 if(clave!==form.get('confirmacion'))return 'coincidencia';
 const cliente=await crearClienteServidor();
 if(!cliente)return 'invalido';
 const {data:{user}}=await cliente.auth.getUser();
 if(!user)return 'invalido';
 const permiso=await cliente.rpc('es_administrador_identificado');
 if(permiso.error||permiso.data!==true)return 'invalido';
 const {error}=await cliente.auth.updateUser({password:clave});
 if(error)return 'error';
 await cliente.auth.signOut();
 return 'listo';
}
