'use server';
import {z} from 'zod';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {accesoUsuarios} from '@/lib/usuarios-panel';
export type EstadoRol='inicio'|'guardado'|'error'|'sinPermiso'|'conflicto'|'local';
const esquema=z.object({usuario:z.uuid(),nuevo:z.enum(['particular','empresa']),anterior:z.enum(['particular','empresa'])});
export async function asignarRolCliente(_estado:EstadoRol,formulario:FormData):Promise<EstadoRol>{
 const datos=esquema.safeParse(Object.fromEntries(formulario));if(!datos.success)return 'error';
 try{
  const acceso=await accesoUsuarios();if(acceso.local)return 'local';
  const {error}=await acceso.cliente.rpc('asignar_rol_cliente',{usuario:datos.data.usuario,nuevo_rol:datos.data.nuevo,rol_esperado:datos.data.anterior});
  if(error)return error.code==='42501'?'sinPermiso':error.message.includes('CONFLICTO')?'conflicto':'error';
  revalidatePath('/panel/usuarios');return 'guardado';
 }catch(e){return e instanceof Error&&e.message==='SIN_PERMISO'?'sinPermiso':'error';}
}

export type EstadoGestion=EstadoRol|'datosActualizados'|'recuperacionEnviada'|'confirmacionEnviada'|'accesoActualizado'|'bloqueado'|'desbloqueado'|'eliminado'|'confirmarAccion'|'propiaCuenta'|'ultimoAdmin'|'correoDuplicado'|'limiteIntentos'|'confirmarCorreo'|'eliminacionPendiente'|'operacionParcial'|'registroFallido'|'noDisponible';
const gestion=z.object({usuario:z.uuid(),operacion:z.enum(['datos','acceso','recuperacion','confirmacion','bloquear','desbloquear','eliminar']),version:z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER)});
function falloGestion(error:{code?:string;message?:string;status?:number}):EstadoGestion{
 if(error.code==='42501')return 'sinPermiso';
 if(error.status===429||error.code==='over_email_send_rate_limit'||error.code==='over_request_rate_limit')return 'limiteIntentos';
 if(error.code==='email_exists'||error.code==='email_conflict_identity_not_deletable')return 'correoDuplicado';
 const mensaje=error.message??'';
 for(const [codigo,estado] of [['PROPIA_CUENTA','propiaCuenta'],['ULTIMO_ADMIN','ultimoAdmin'],['CONFLICTO','conflicto'],['CONFIRMACION_REQUERIDA','confirmarCorreo'],['ELIMINACION_PENDIENTE','eliminacionPendiente']] as const)if(mensaje.includes(codigo))return estado;
 return 'error';
}
export async function administrarUsuario(_estado:EstadoGestion,formulario:FormData):Promise<EstadoGestion>{
 const datos=gestion.safeParse(Object.fromEntries(formulario));if(!datos.success)return 'error';
 let resultado:EstadoGestion='error',cambio=false,borrado=false;
 try{
  const acceso=await accesoUsuarios();if(acceso.local)return 'local';
  const {usuario,operacion,version}=datos.data;
  if(operacion==='acceso'){
   const rol=formulario.get('rol');if(!['sin_acceso','administrador'].includes(String(rol)))return 'error';
   if(rol==='administrador'&&formulario.get('confirmar')!=='si')return 'confirmarAccion';
   const {error}=await acceso.cliente.rpc('gestionar_acceso_usuario',{usuario,accion:'rol',nuevo_rol:rol,version_esperada:version});
   if(error)return falloGestion(error);
   revalidatePath('/panel/usuarios');return 'accesoActualizado';
  }
  const {clienteGestionUsuarios}=await import('@/lib/usuarios-administracion');
  const admin=clienteGestionUsuarios();if(!admin)return 'noDisponible';
  const obtenido=await admin.auth.admin.getUserById(usuario);
  if(obtenido.error||!obtenido.data.user)return 'error';
  const objetivo=obtenido.data.user;
  const identificador=objetivo.email??objetivo.id;
  const auditar=async(accion:string)=>{
   const r=await acceso.cliente.rpc('registrar_gestion_usuario',{usuario,accion});
   return Boolean(r.error);
  };
  if(operacion==='datos'){
   const nombre=z.string().trim().min(2).max(150).safeParse(formulario.get('nombre'));
   const correo=z.string().trim().toLowerCase().pipe(z.email().max(254)).safeParse(formulario.get('correo'));
   if(!nombre.success||!correo.success)return 'error';
   if(formulario.get('correo_actual')!==(objetivo.email??''))return 'conflicto';
   const cambiaCorreo=correo.data!==(objetivo.email??'').toLowerCase();
   if(cambiaCorreo&&usuario===acceso.actor)return 'propiaCuenta';
   if(cambiaCorreo&&formulario.get('confirmar')!=='si')return 'confirmarAccion';
   const {error}=await admin.auth.admin.updateUserById(usuario,{user_metadata:{...objetivo.user_metadata,nombre_completo:nombre.data},...(cambiaCorreo?{email:correo.data,email_confirm:true}:{})});
   if(error)return falloGestion(error);
   cambio=true;resultado=await auditar(cambiaCorreo?'correo':'perfil')?'registroFallido':'datosActualizados';
  }else if(operacion==='recuperacion'||operacion==='confirmacion'){
   if(!objetivo.email)return 'error';
   const origen=process.env.PEDIDOS_ORIGEN_PUBLICO;
   if(!origen)return 'noDisponible';
   const url=new URL(origen);
   if(url.protocol!=='https:'&&!['127.0.0.1','localhost'].includes(url.hostname))return 'noDisponible';
   const {error}=operacion==='recuperacion'
    ?await admin.auth.resetPasswordForEmail(objetivo.email,{redirectTo:`${url.origin}/cuenta/confirmar?flujo=recuperar`})
    :await admin.auth.resend({type:'signup',email:objetivo.email,options:{emailRedirectTo:`${url.origin}/cuenta/confirmar`}});
   if(error)return falloGestion(error);
   resultado=await auditar(operacion)?'registroFallido':operacion==='recuperacion'?'recuperacionEnviada':'confirmacionEnviada';
  }else{
   if(usuario===acceso.actor)return 'propiaCuenta';
   if(formulario.get('confirmacion')!==identificador)return 'confirmarAccion';
   // Desbloquear Auth primero; el estado de la app sigue cerrado hasta que la RPC lo autorice.
   if(operacion==='desbloquear'){
    const {error}=await admin.auth.admin.updateUserById(usuario,{ban_duration:'none'});if(error)return falloGestion(error);
   }
   const preparado=await acceso.cliente.rpc('gestionar_acceso_usuario',{usuario,accion:operacion==='eliminar'?'eliminar':operacion,nuevo_rol:null,version_esperada:version});
   if(preparado.error)return falloGestion(preparado.error);
   cambio=true;
   if(operacion==='eliminar'){
    // Los pedidos conservan sus datos y solo se desvincula el ID del usuario.
    const {error}=await admin.auth.admin.deleteUser(usuario);if(error)resultado='operacionParcial';
    else{borrado=true;resultado=await auditar('eliminado')?'registroFallido':'eliminado';}
   }else if(operacion==='bloquear'){
    const {error}=await admin.auth.admin.updateUserById(usuario,{ban_duration:'876000h'});
    resultado=error?'operacionParcial':'bloqueado';
   }else resultado='desbloqueado';
  }
 }catch(e){resultado=e instanceof Error&&e.message==='SIN_PERMISO'?'sinPermiso':cambio?'operacionParcial':'error';}
 if(cambio)revalidatePath('/panel/usuarios');
 if(borrado)redirect(`/panel/usuarios?resultado=${resultado==='eliminado'?'eliminado':'registroFallido'}`);
 return resultado;
}
export async function historialUsuario(usuario:string):Promise<{accion:string;creado_en:string;actor:string}[]|null>{
 if(!z.uuid().safeParse(usuario).success)return null;
 try{const acceso=await accesoUsuarios();if(acceso.local)return null;const r=await acceso.cliente.rpc('historial_gestion_usuario',{usuario});return r.error?null:r.data;}catch{return null;}
}
