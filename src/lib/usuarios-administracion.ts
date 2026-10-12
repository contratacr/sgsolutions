import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {configuracionSupabase} from './supabase/configuracion';
/** Usar únicamente después de verificar al administrador; nunca exportar al navegador. */
export function clienteGestionUsuarios(){
 const url=process.env.SUPABASE_URL,llave=process.env.SUPABASE_SERVICE_ROLE_KEY,config=configuracionSupabase();
 if(!url||!llave||!config)return null;
 try{
  const origen=new URL(url);
  if(origen.origin!==new URL(config.url).origin)return null;
  const local=['127.0.0.1','localhost','[::1]'].includes(origen.hostname);
  if(!local&&process.env.SG_ENTORNO!=='produccion')return null;
  return createClient(url,llave,{auth:{persistSession:false,autoRefreshToken:false}});
 }catch{return null;}
}
