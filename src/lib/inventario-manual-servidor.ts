import 'server-only';
import {createClient} from '@supabase/supabase-js';
/** Called by the authenticated scheduled processor; never by a public browser. */
export async function liberarInventarioVencido(){
 const url=process.env.SUPABASE_URL,llave=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!llave)return;
 if(process.env.SG_ENTORNO==='local'&&!['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname))throw new Error('INVENTARIO_ENTORNO_INVALIDO');
 const db=createClient(url,llave,{auth:{persistSession:false,autoRefreshToken:false}});
 const {error}=await db.rpc('liberar_reservas_inventario');
 if(error)throw new Error('INVENTARIO_NO_DISPONIBLE');
}
