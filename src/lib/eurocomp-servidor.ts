import 'server-only';
import {mkdir,readFile,writeFile,rename,open} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {sesionLocal,leerLocal,guardarLocal} from './admin-local';
import {esquemaCatalogo,publicarCatalogo,type CatalogoAdmin} from './catalogo-modelo';
import {reconciliarEurocomp} from './eurocomp-catalogo';
import {crearClienteServidor} from './supabase/servidor';
import {consultarEurocomp,ErrorEurocomp,type CatalogoEurocomp} from './eurocomp-protocolo';
import {servicioPruebas} from './servicio-pruebas';

const carpeta=path.join(process.cwd(),'.privado','admin-local');
const archivo=path.join(carpeta,'eurocomp.json');
const espera=5*60_000;
type Guardado={catalogo:CatalogoEurocomp|null;intento:string;token:string};
async function acceso(){
 if(await sesionLocal())return {local:true as const,cliente:null};
 const cliente=await crearClienteServidor();if(!cliente)throw new ErrorEurocomp('sinPermiso');
 const {data:{user}}=await cliente.auth.getUser();if(!user)throw new ErrorEurocomp('sinPermiso');
 const {data:perfil}=await cliente.from('perfiles').select('rol,activo').eq('id',user.id).maybeSingle();
 if(perfil?.rol!=='administrador'||!perfil.activo)throw new ErrorEurocomp('sinPermiso');
  const mfa=await cliente.rpc('es_administrador_activo');if(mfa.error||mfa.data!==true)throw new Error('SIN_PERMISO');
 return {local:false as const,cliente};
}
async function local():Promise<Guardado|null>{try{return JSON.parse(await readFile(archivo,'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}}
async function escribir(datos:Guardado){const temporal=`${archivo}.${randomUUID()}`;await writeFile(temporal,JSON.stringify(datos),{mode:0o600});await rename(temporal,archivo);}
export function eurocompConfigurado(){return Boolean(process.env.EUROCOMP_API_KEY||(process.env.EUROCOMP_WEB_SERVICE_ID&&process.env.EUROCOMP_PASSWORD));}
export function actualizacionEurocompHabilitada(){return eurocompConfigurado()&&process.env.EUROCOMP_ACTUALIZACION_ACTIVA==='1';}
export type PaginaEurocomp={fecha:string;total:number;resultados:number;pagina:number;paginas:number;articulos:CatalogoEurocomp['articulos']};
export async function leerEurocomp(q='',paginaSolicitada=1):Promise<PaginaEurocomp|null>{
 const a=await acceso();
 if(a.local){
  const catalogo=(await local())?.catalogo;if(!catalogo)return null;
  const term=q.toLocaleLowerCase();const encontrados=catalogo.articulos.filter(a=>!term||[a.codigo,a.parte,a.nombre,a.marca,a.familia].some(v=>v.toLocaleLowerCase().includes(term)));
  const paginas=Math.max(1,Math.ceil(encontrados.length/20));const pagina=Math.max(1,Math.min(paginas,paginaSolicitada));
  return {fecha:catalogo.fecha,total:catalogo.articulos.length,resultados:encontrados.length,paginas,pagina,articulos:encontrados.slice((pagina-1)*20,pagina*20)};
 }
 const {data,error}=await a.cliente.rpc('consultar_eurocomp',{busqueda:q,pagina_solicitada:paginaSolicitada});
 if(error)throw new ErrorEurocomp('almacenamiento');return data??null;
}
export async function actualizarEurocomp(){
 const a=await acceso();
 if(process.env.EUROCOMP_ACTUALIZACION_ACTIVA!=='1')throw new ErrorEurocomp('configuracion');
 const clave=process.env.EUROCOMP_API_KEY||process.env.EUROCOMP_PASSWORD||'';
 const id=process.env.EUROCOMP_API_KEY?'0':process.env.EUROCOMP_WEB_SERVICE_ID||'';
 const bodega=Number(process.env.EUROCOMP_BODEGA_ID??'0');
 if(!clave||!id)throw new ErrorEurocomp('configuracion');
 const token=randomUUID();const intento=new Date().toISOString();
 if(a.local){
  await mkdir(carpeta,{recursive:true,mode:0o700});
  let bloqueo;try{bloqueo=await open(path.join(carpeta,'eurocomp.lock'),'wx',0o600);}catch(e){throw new ErrorEurocomp((e as NodeJS.ErrnoException).code==='EEXIST'?'espera':'almacenamiento');}
  try {const anterior=await local();if(anterior&&Date.now()-Date.parse(anterior.intento)<espera)throw new ErrorEurocomp('espera');await escribir({catalogo:anterior?.catalogo??null,intento,token});}
  finally{await bloqueo.close();const {unlink}=await import('node:fs/promises');await unlink(path.join(carpeta,'eurocomp.lock'));}
 }else{
  const {data,error}=await a.cliente.rpc('iniciar_eurocomp',{nuevo_token:token});
  if(error){console.error('EUROCOMP_INICIO_FALLO',error.code);throw new ErrorEurocomp(error.message.includes('ESPERA')?'espera':'almacenamiento');}if(!data)throw new ErrorEurocomp('espera');
 }
 const destino=servicioPruebas('eurocomp');
 const catalogo=await consultarEurocomp({id,clave,bodega},destino?(_url,opciones)=>fetch(destino,opciones):fetch);
 if(!catalogo.articulos.length)throw new ErrorEurocomp('respuesta');
 if(a.local){
  const actualCopia=await local();if(actualCopia?.token!==token)throw new ErrorEurocomp('espera');
  const actual=await leerLocal<CatalogoAdmin>('catalogo');
  if(actual){const r=await guardarLocal('catalogo',reconciliarEurocomp(esquemaCatalogo.parse(actual.contenido),catalogo),actual.revision);if(r.error)throw new ErrorEurocomp('almacenamiento');}
  await escribir({catalogo,intento,token});
 }else{
  const {data,error}=await a.cliente.from('catalogo_privado').select('contenido,revision').eq('id',1).single();
  if(error||!data){console.error('EUROCOMP_CATALOGO_FALLO',error?.code??'sin_datos');throw new ErrorEurocomp('almacenamiento');}
  const privado=esquemaCatalogo.parse(reconciliarEurocomp(esquemaCatalogo.parse(data.contenido),catalogo));
  const r=await a.cliente.rpc('publicar_eurocomp',{token_esperado:token,nuevo_catalogo:catalogo,privado,visible:publicarCatalogo(privado),revision_esperada:data.revision});
  if(r.error){console.error('EUROCOMP_PUBLICACION_FALLO',r.error.code);throw new ErrorEurocomp(r.error.message.includes('CONFLICTO')?'conflicto':'almacenamiento');}
 }
 return {total:catalogo.articulos.length};
}
