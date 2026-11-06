import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import {consultarEurocomp,ErrorEurocomp} from '../src/lib/eurocomp-protocolo';
import {publicarCopiaEurocomp} from '../src/lib/eurocomp-publicacion';
let fase='configuracion';
async function ejecutar(){
 if(process.env.EUROCOMP_SYNC_ACTIVA!=='1')throw new Error('CONFIGURACION');
 const url=process.env.SUPABASE_URL,service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const clave=process.env.EUROCOMP_API_KEY||process.env.EUROCOMP_PASSWORD;
 const id=process.env.EUROCOMP_API_KEY?'0':process.env.EUROCOMP_WEB_SERVICE_ID;
 if(!url||!service||!id||!clave||new URL(url).protocol!=='https:')throw new Error('CONFIGURACION');
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}}),token=randomUUID();
 fase='bloqueo';
 const bloqueo=await db.rpc('iniciar_eurocomp_programado',{nuevo_token:token});
 if(bloqueo.error){if(bloqueo.error.message.includes('ESPERA')){console.log('Actualización omitida: ya hubo un intento en la última hora.');return;}throw new Error('BLOQUEO');}
 // The 33 MiB XML is parsed in Node, outside the Cloudflare request CPU budget.
 fase='consulta_proveedor';
 const copia=await consultarEurocomp({id,clave,bodega:Number(process.env.EUROCOMP_BODEGA_ID??'0')});
 // Una respuesta vacía no debe borrar el catálogo vigente.
 if(copia.articulos.length===0)throw new Error('CATALOGO_VACIO');
 fase='publicacion';
 const resultado=await publicarCopiaEurocomp(db,token,copia,d=>console.log('EUROCOMP_PUBLICACION',JSON.stringify(d)));
 console.log(`Actualización completada: ${resultado.productos} productos visibles; publicación confirmada en ${resultado.intentos} intento(s). Sin órdenes ni reservas al proveedor.`);
}
ejecutar().catch(error=>{console.error(`Etapa: ${fase}${error instanceof ErrorEurocomp?'; '+error.codigo:''}`);console.error('Sincronización fallida. Se conserva el catálogo publicado. Revisar configuración, permisos o disponibilidad; se agotaron los intentos permitidos o se detectó un error no recuperable; no se imprimieron credenciales.');process.exitCode=1;});
