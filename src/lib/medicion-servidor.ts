import 'server-only';
import {cookies} from 'next/headers';
import {createClient} from '@supabase/supabase-js';
import {crearClienteCuenta} from './supabase/cuenta';
import {navegadorAdministrativoGuardado} from './exclusion-medicion';
import {sesionLocal} from './admin-local';
export function baseMedicion(){
 const url=process.env.SUPABASE_URL,clave=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!clave)return null;
 if(process.env.SG_ENTORNO!=='produccion'&&!['127.0.0.1','localhost','[::1]'].includes(new URL(url).hostname))return null;
 return createClient(url,clave,{auth:{persistSession:false,autoRefreshToken:false}});
}
/** Eligibility is read transiently. No account/IP is added to analytics. Fail closed. */
export async function permiteMedicionServidor(){
 try{
  const a=await cookies();if(await navegadorAdministrativoGuardado()||a.get('sg-excluir-medicion')?.value==='1'||await sesionLocal())return false;
  if(!a.getAll().some(c=>/^sb-.*-auth-token(?:\.\d+)?$/.test(c.name)))return true;
  const db=await crearClienteCuenta();if(!db)return false;const {data,error}=await db.auth.getUser();if(error||!data.user)return false;
  const p=await db.from('perfiles').select('rol,activo').eq('id',data.user.id).maybeSingle();
  return !p.error&&p.data?.rol!=='administrador'&&p.data?.activo!==false;
 }catch{return false;}
}
