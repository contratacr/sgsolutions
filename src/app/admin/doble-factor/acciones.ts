'use server';
import {z} from 'zod';
import {redirect} from 'next/navigation';
import {crearClienteServidor} from '@/lib/supabase/servidor';
import {leerAccesoPanel} from '@/lib/acceso-panel';
async function acceso(){
 const estado=await leerAccesoPanel();
 if(estado!=='mfa'&&estado!=='administrador')return null;
 return crearClienteServidor();
}
export async function prepararAutenticador():Promise<{error?:string;factor?:string;qr?:string;secreto?:string}>{
 const cliente=await acceso();if(!cliente)return {error:'sinPermiso'};
 const factores=await cliente.auth.mfa.listFactors();if(factores.error)return {error:'error'};
 // Enrollment from first-factor access is allowed only until a verified factor exists.
 if(factores.data.totp.length)return {error:'yaConfigurado'};
 for(const f of factores.data.all.filter(f=>f.factor_type==='totp'&&f.status==='unverified')){
  const r=await cliente.auth.mfa.unenroll({factorId:f.id});if(r.error)return {error:'error'};
 }
 const r=await cliente.auth.mfa.enroll({factorType:'totp',issuer:'SG Solutions',friendlyName:'SG Solutions'});
 if(r.error)return {error:r.error.status===429?'muchosIntentos':'error'};
 const svg=r.data.totp.qr_code.replace(/^data:image\/svg\+xml;utf-8,/, '');
 return {factor:r.data.id,qr:'data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64'),secreto:r.data.totp.secret};
}
export async function verificarAutenticador(_estado:string,form:FormData):Promise<string>{
 const cliente=await acceso();if(!cliente)return 'sinPermiso';
 const entrada=z.object({factor:z.uuid(),codigo:z.string().regex(/^[0-9]{6}$/)}).safeParse(Object.fromEntries(form));if(!entrada.success)return 'codigoInvalido';
 const factores=await cliente.auth.mfa.listFactors();if(factores.error)return 'error';
 const factor=factores.data.all.find(f=>f.id===entrada.data.factor&&f.factor_type==='totp');
 if(!factor)return 'codigoInvalido';
 const r=await cliente.auth.mfa.challengeAndVerify({factorId:factor.id,code:entrada.data.codigo});
 if(r.error)return r.error.status===429?'muchosIntentos':'codigoInvalido';
 // Do not trust a client flag or just a successful API response: re-check database enforcement.
 const permiso=await cliente.rpc('es_administrador_activo');
 if(permiso.error||permiso.data!==true)return 'error';
 redirect('/panel');
}
