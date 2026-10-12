/** Mensajes públicos: nunca devolver detalles internos ni revelar si un correo existe. */
export type ErrorCuenta = 'error' | 'credenciales' | 'confirmarCorreo' | 'limiteIntentos' | 'conexion' | 'claveDebil' | 'claveRepetida' | 'sesionVencida' | 'noDisponible' | 'correoInvalido' | 'cuentaBloqueada';
export function errorCuenta(error: {code?:string;status?:number;name?:string}, login=false): ErrorCuenta {
  if(error.status===429 || ['over_request_rate_limit','over_email_send_rate_limit','email_send_rate_limit','over_sms_send_rate_limit'].includes(error.code??'')) return 'limiteIntentos';
  if(error.code==='user_banned')return 'cuentaBloqueada';
  if(error.code==='email_not_confirmed')return 'confirmarCorreo';
  if(error.code==='invalid_credentials' && login)return 'credenciales';
  if(error.code==='weak_password')return 'claveDebil';
  if(error.code==='same_password')return 'claveRepetida';
  if(['session_expired','session_not_found','reauthentication_needed','reauthentication_not_valid'].includes(error.code??''))return 'sesionVencida';
  if(['signup_disabled','email_provider_disabled','provider_disabled','oauth_provider_not_supported'].includes(error.code??''))return 'noDisponible';
  if(error.code==='email_address_invalid')return 'correoInvalido';
  if(error.name==='AuthRetryableFetchError'||error.status===0||error.code==='request_timeout')return 'conexion';
  return 'error';
}
export async function solicitudCuenta<T>(solicitud:()=>PromiseLike<T>):Promise<T|{error:{name:string}}> {
  try{return await solicitud();}catch{return {error:{name:'AuthRetryableFetchError'}};}
}
