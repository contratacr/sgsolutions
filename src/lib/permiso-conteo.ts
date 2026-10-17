import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';

// A public, shared permit, NOT a session or authentication credential. Every
// eligible page receives exactly the same value. No user, clock, IP or random ID
// enters it. Domain-separated HMAC prevents exposing the server-side key.
export function permisoConteo(excluir=false):string|undefined{
 if(excluir)return;
 const clave=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!clave)return;
 return createHmac('sha256',clave).update('sg:estadisticas:permiso-publico-compartido:v1').digest('base64url');
}
export function permisoConteoValido(valor:string|null){
 const esperado=permisoConteo();
 if(!esperado||!valor||!/^[A-Za-z0-9_-]{43}$/.test(valor)||valor.length!==esperado.length)return false;
 return timingSafeEqual(Buffer.from(valor),Buffer.from(esperado));
}
