import 'server-only';
import {crearClienteServidor} from './supabase/servidor';
import {sesionLocal} from './admin-local';
export type UsuarioPanel={id:string;correo:string|null;nombre:string;creado_en:string;ultimo_acceso:string|null;confirmado:boolean;rol_cliente:'particular'|'empresa';rol_equipo:'administrador'|'comercial'|null;equipo_activo:boolean|null;estado_cuenta?:'activo'|'bloqueado'|'eliminando';version_gestion?:number;mfa_configurado?:boolean};
export async function accesoUsuarios(){
 if(await sesionLocal())return {local:true as const,cliente:null};
 const cliente=await crearClienteServidor();if(!cliente)throw new Error('SIN_PERMISO');
 const {data:{user},error}=await cliente.auth.getUser();if(error||!user)throw new Error('SIN_PERMISO');
 const permiso=await cliente.rpc('es_administrador_activo');
 if(permiso.error||permiso.data!==true)throw new Error('SIN_PERMISO');
 return {local:false as const,cliente,actor:user.id};
}
