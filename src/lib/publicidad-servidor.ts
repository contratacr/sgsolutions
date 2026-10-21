import 'server-only';
import {construirEventoMeta} from './meta-contrato';
import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import {cookies} from 'next/headers';
import {contextoPublicidad,adquisicion,type ContextoPublicidad,type Adquisicion,type EventoPublicidad} from './campanas-modelo';
import {baseMedicion,permiteMedicionServidor} from './medicion-servidor';
const nombre='sg-publicidad',duracion=30*86400;
function clave(){return process.env.SUPABASE_SERVICE_ROLE_KEY;}
export function idMedicion(texto:string){const k=clave();if(!k)throw new Error('MEDICION_SIN_CONFIGURACION');return createHmac('sha256',k).update('sg:publicidad:v1:'+texto).digest('base64url');}
function firmar(c:ContextoPublicidad){const b=Buffer.from(JSON.stringify(c)).toString('base64url');return b+'.'+idMedicion('cookie:'+b);}
export function leerContextoFirmado(valor:string|undefined):ContextoPublicidad|null{
 if(!valor||valor.length>3000||!clave())return null;try{const [b,f,...resto]=valor.split('.'),firma=idMedicion('cookie:'+b);if(resto.length||!f||f.length!==firma.length||!timingSafeEqual(Buffer.from(f),Buffer.from(firma)))return null;
 const c=contextoPublicidad.parse(JSON.parse(Buffer.from(b,'base64url').toString()));return c.creado<=Date.now()&&c.vence>Date.now()&&c.vence-c.creado<=duracion*1000?c:null;}catch{return null;}
}
export function campanaPermitida(a:Adquisicion):Adquisicion{
 const permitidas=(process.env.SG_CAMPANAS_PERMITIDAS??'').split(',').filter(c=>/^[a-z0-9_-]{1,60}$/.test(c));
 const campana=permitidas.includes(a.campana)?a.campana:'';
 return {...a,campana,medio:a.medio==='pago'&&!campana?'desconocido':a.medio};
}
export async function contextoActual(){if(!await permiteMedicionServidor())return null;const c=leerContextoFirmado((await cookies()).get(nombre)?.value);if(!c)return null;const db=baseMedicion();if(!db)return null;const r=await db.from('publicidad_revocaciones').select('id').eq('id',c.id).maybeSingle();return r.error||r.data?null:c;}
export async function actualizarContexto(entrada:{permitir:boolean;adquisicion?:Adquisicion;primera?:Adquisicion;fbclid?:string}){
 const a=await cookies(),anterior=leerContextoFirmado(a.get(nombre)?.value),db=baseMedicion();
 if(!entrada.permitir||!await permiteMedicionServidor()){
  if(anterior&&db){const r=await db.rpc('revocar_publicidad',{contexto:anterior.id});if(r.error)throw new Error('REVOCACION_PENDIENTE');}
  a.delete(nombre);return false;
 }
 if(!db||!clave())return false;
 const origen=campanaPermitida(adquisicion.parse(entrada.adquisicion)),ahora=Date.now();
 const c:ContextoPublicidad=anterior??{id:randomUUID(),creado:ahora,vence:ahora+duracion*1000,primero:campanaPermitida(entrada.primera??origen),reciente:origen,fbp:`fb.1.${ahora}.${BigInt('0x'+randomUUID().replaceAll('-','').slice(0,14)).toString()}`};
 const revocada=await db.from('publicidad_revocaciones').select('id').eq('id',c.id).maybeSingle();if(revocada.error||revocada.data)return false;
 // Direct/internal navigation does not overwrite the latest meaningful campaign.
 if(origen.canal!=='directo'&&(origen.campana||origen.canal!==c.reciente.canal||!anterior))c.reciente=origen;
 if(entrada.fbclid&&/^[A-Za-z0-9_-]{1,300}$/.test(entrada.fbclid)&&!c.fbc?.endsWith('.'+entrada.fbclid))c.fbc=`fb.1.${ahora}.${entrada.fbclid}`;
 a.set(nombre,firmar(c),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:Math.max(0,Math.floor((c.vence-ahora)/1000))});return true;
}
export function configuracionMeta(){
 const dataset=process.env.META_DATASET_ID,token=process.env.META_ACCESS_TOKEN,version=process.env.META_GRAPH_VERSION;
 return process.env.SG_ENTORNO==='produccion'&&process.env.SG_META_ACTIVO==='1'&&/^\d{5,25}$/.test(dataset??'')&&token&&/^v\d{2}\.0$/.test(version??'')?{dataset:dataset!,token,version:version!}:null;
}
export async function encolarPublicidad(c:ContextoPublicidad,evento:EventoPublicidad,id:string,ruta:string,producto?:string,valor?:number){
 const db=baseMedicion();if(!db)return;
 // Disabled integrations never accumulate browser IDs waiting for future activation.
 if(!configuracionMeta())return;
 const r=await db.rpc('encolar_publicidad',{entrada:{id,contexto:c.id,evento,ruta,producto:producto??null,valor:valor??null,fbp:c.fbp,fbc:c.fbc??null,vence_contexto:new Date(c.vence).toISOString()}});
 if(r.error)throw new Error('PUBLICIDAD_COLA_NO_DISPONIBLE');
}
export async function procesarPublicidad(){
 const db=baseMedicion(),config=configuracionMeta();if(!db)return;
 await db.rpc('depurar_medicion');if(!config)return;
 const {data,error}=await db.rpc('reservar_publicidad',{limite:8});if(error||!data)return;
 for(const fila of data){
  let resultado:'aceptado'|'pendiente'|'expirado'='pendiente',codigo='red';
  try{
   const permiso=await db.from('publicidad_revocaciones').select('id').eq('id',fila.contexto).maybeSingle();
   if(permiso.error)throw new Error('permiso');if(permiso.data){await db.rpc('terminar_publicidad',{clave:fila.id,reserva:fila.reserva,resultado:'suprimido',codigo:'revocado'});continue;}
   const payload=construirEventoMeta(fila);
   const r=await fetch(`https://graph.facebook.com/${config.version}/${config.dataset}/events`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.token}`},body:JSON.stringify({data:[payload]}),signal:AbortSignal.timeout(10000)});
   const cuerpo=await r.json();codigo=String(r.status);if(r.ok&&cuerpo.events_received===1)resultado='aceptado';else if(r.status>=400&&r.status<500&&r.status!==429)resultado='expirado';
  }catch{/* Never log payloads, tokens, provider messages or request headers. */}
  await db.rpc('terminar_publicidad',{clave:fila.id,reserva:fila.reserva,resultado,codigo});
 }
}
