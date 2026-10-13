import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import {consultarEurocomp,ErrorEurocomp} from '../src/lib/eurocomp-protocolo';
import {reconciliarEurocomp} from '../src/lib/eurocomp-catalogo';
import {esquemaCatalogo,publicarCatalogo} from '../src/lib/catalogo-modelo';
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
 fase='lectura_catalogo';
 const lectura=await db.from('catalogo_privado').select('contenido,revision').eq('id',1).single();
 if(lectura.error||!lectura.data)throw new Error('LECTURA');
 fase='validacion_catalogo';
 const privado=esquemaCatalogo.parse(reconciliarEurocomp(esquemaCatalogo.parse(lectura.data.contenido),copia));
 const visible=publicarCatalogo(privado);
 fase='publicacion';
 const escritura=await db.rpc('publicar_eurocomp',{token_esperado:token,nuevo_catalogo:copia,privado,visible,revision_esperada:lectura.data.revision});
 if(escritura.error){const codigo=/^[A-Z0-9]{5}$/.test(escritura.error.code??'')?escritura.error.code:'DESCONOCIDO';console.error(`Publicación SQL: ${codigo}; HTTP ${escritura.status}`);throw new Error('PUBLICACION');}
 console.log(`Actualización completada: ${visible.productos.length} productos visibles. Sin órdenes ni reservas al proveedor.`);
}
ejecutar().catch(error=>{console.error(`Etapa: ${fase}${error instanceof ErrorEurocomp?'; '+error.codigo:''}`);console.error('Sincronización fallida. Se conserva el catálogo publicado. Revisar configuración, permisos o disponibilidad; no se reintentó ni se imprimieron credenciales.');process.exitCode=1;});
