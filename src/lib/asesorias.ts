import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {adminLocalDisponible} from './admin-local';
import type {CatalogoPublico} from './catalogo-modelo';
export type SolicitudAsesoria={id:string;numero?:number;eliminado_en?:string|null;creado_en:string;estado:'solicitada'|'aprobada'|'procesando'|'utilizada'|'cancelada';idioma:'es'|'en';articulos:{producto:CatalogoPublico['productos'][number];cantidad:number}[];token:string|null;vence_en:string|null;pedido_id:string|null;contacto?:{nombre:string;telefono:string;necesidad:string}|null};
const archivo='.privado/admin-local/asesorias.json';
let cola=Promise.resolve();
async function localModificar<T>(fn:(filas:SolicitudAsesoria[])=>T){const anterior=cola;let liberar!:()=>void;cola=new Promise<void>(r=>liberar=r);await anterior;try{let filas:SolicitudAsesoria[]=[];try{filas=JSON.parse(await readFile(archivo,'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}const resultado=fn(filas);await mkdir('.privado/admin-local',{recursive:true});const tmp=archivo+'.'+randomBytes(8).toString('hex');await writeFile(tmp,JSON.stringify(filas),{mode:0o600});await rename(tmp,archivo);return resultado;}finally{liberar();}}
function db(){const url=process.env.SUPABASE_URL,clave=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!clave)return null;if(process.env.SG_ENTORNO==='local'&&!['127.0.0.1','localhost','[::1]'].includes(new URL(url).hostname))return null;return createClient(url,clave,{auth:{persistSession:false,autoRefreshToken:false}});}
export async function listarAsesorias(){
 const ordenar=(f:SolicitudAsesoria[])=>[...f].sort((a,b)=>Number(b.estado==='solicitada')-Number(a.estado==='solicitada')||(a.estado==='solicitada'?Date.parse(a.creado_en)-Date.parse(b.creado_en):Date.parse(b.creado_en)-Date.parse(a.creado_en)));
 if(await adminLocalDisponible())return localModificar(f=>ordenar(f.filter(x=>!x.eliminado_en)).slice(0,150));
 const cliente=db();if(!cliente)throw new Error('ASESORIA_NO_CONFIGURADA');
 const [pendientes,otras]=await Promise.all([cliente.from('solicitudes_asesoria').select('*').is('eliminado_en',null).eq('estado','solicitada').order('creado_en',{ascending:true}).limit(100),cliente.from('solicitudes_asesoria').select('*').is('eliminado_en',null).neq('estado','solicitada').order('creado_en',{ascending:false}).limit(50)]);
 if(pendientes.error||otras.error)throw new Error('ASESORIA_NO_DISPONIBLE');
 return ordenar([...(pendientes.data??[]),...(otras.data??[])] as SolicitudAsesoria[]);
}

export async function crearAsesoria(articulos:SolicitudAsesoria['articulos'],idioma:SolicitudAsesoria['idioma'],contacto?:SolicitudAsesoria['contacto']){const s:SolicitudAsesoria={id:crypto.randomUUID(),creado_en:new Date().toISOString(),estado:'solicitada',idioma,articulos,token:null,vence_en:null,pedido_id:null,...(contacto?{contacto}: {})};if(await adminLocalDisponible())await localModificar(f=>{s.numero=Math.max(0,...f.map(x=>x.numero??0))+1;f.push(s);});else{const cliente=db();if(!cliente)throw new Error('ASESORIA_NO_CONFIGURADA');const {data,error}=await cliente.from('solicitudes_asesoria').insert(s).select('*').single();if(error)throw new Error('ASESORIA_NO_DISPONIBLE');Object.assign(s,data);}return s;}
export async function cambiarAsesoria(id:string,estado:SolicitudAsesoria['estado'],cambios:Partial<SolicitudAsesoria>,condicion:{token?:string;vigente?:boolean}={}){if(await adminLocalDisponible())return localModificar(f=>{const s=f.find(x=>x.id===id&&x.estado===estado&&(!condicion.token||x.token===condicion.token)&&(!condicion.vigente||Date.parse(x.vence_en??'')>Date.now()));if(!s)return null;Object.assign(s,cambios);return {...s};});const cliente=db();if(!cliente)return null;let consulta=cliente.from('solicitudes_asesoria').update(cambios).eq('id',id).eq('estado',estado);if(condicion.token)consulta=consulta.eq('token',condicion.token);if(condicion.vigente)consulta=consulta.gt('vence_en',new Date().toISOString());const {data,error}=await consulta.select('*').maybeSingle();return error?null:data as SolicitudAsesoria|null;}
export async function leerAprobacion(id:string,token:string){if(!/^[0-9a-f-]{36}$/.test(id)||!/^(?:[0-9a-f]{32}|[0-9a-f]{64})$/.test(token))return null;let s:SolicitudAsesoria|null=null;if(await adminLocalDisponible())s=await localModificar(f=>f.find(x=>x.id===id&&x.token===token)??null);else{const cliente=db();if(!cliente)return null;const {data,error}=await cliente.from('solicitudes_asesoria').select('*').eq('id',id).eq('token',token).maybeSingle();if(!error)s=data;}return s?.estado==='aprobada'&&s.vence_en&&Date.parse(s.vence_en)>Date.now()?s:null;}
export async function validarAprobacion(cuerpo:{asesoria?:string;acceso?:string;articulos:{id:string;cantidad:number}[]}){const s=await leerAprobacion(cuerpo.asesoria??'',cuerpo.acceso??'');if(!s)return null;const ordenar=(a:{id:string;cantidad:number}[])=>JSON.stringify([...a].sort((a,b)=>a.id.localeCompare(b.id)));return ordenar(cuerpo.articulos)===ordenar(s.articulos.map(x=>({id:x.producto.id,cantidad:x.cantidad})))?s:null;}
export async function reservarAprobacion(s:SolicitudAsesoria){if(Date.parse(s.vence_en??'')<=Date.now())return null;return cambiarAsesoria(s.id,'aprobada',{estado:'procesando'},{token:s.token!,vigente:true});}
export const referenciaAsesoria=(id:string,numero?:number)=>numero?`SG-${String(numero).padStart(4,'0')}`:`SG-${id.replaceAll('-','').slice(0,10).toUpperCase()}`;
export async function leerEnlaceCompra(acceso:string){
 if(!/^(?:[A-Za-z0-9_-]{22}|[A-Za-z0-9_-]{43})$/.test(acceso))return null;
 const bytes=Buffer.from(acceso,'base64url');
 if(![16,32].includes(bytes.length)||bytes.toString('base64url')!==acceso)return null;
 const token=bytes.toString('hex');let s:SolicitudAsesoria|null=null;
 if(await adminLocalDisponible())s=await localModificar(f=>f.find(x=>x.token===token)??null);
 else{const cliente=db();if(!cliente)return null;const {data,error}=await cliente.from('solicitudes_asesoria').select('*').eq('token',token).maybeSingle();if(!error)s=data;}
 return s?.estado==='aprobada'&&s.vence_en&&Date.parse(s.vence_en)>Date.now()?s:null;
}
export function enlaceAprobado(s:SolicitudAsesoria,origen:string){
 if(!s.token||!/^(?:[0-9a-f]{32}|[0-9a-f]{64})$/.test(s.token))throw new Error('ASESORIA_SIN_ACCESO');
 return new URL(`/compra/${Buffer.from(s.token,'hex').toString('base64url')}`,origen).href;
}
export function tokenAsesoria(){return randomBytes(16).toString('hex');}

/** Eliminación del panel solo para consultas canceladas sin pedido; conserva la referencia. */
export async function eliminarConsultaCancelada(id:string){
 if(await adminLocalDisponible())return localModificar(f=>{const s=f.find(x=>x.id===id&&x.estado==='cancelada'&&!x.pedido_id&&!x.eliminado_en);if(!s)return false;s.eliminado_en=new Date().toISOString();s.token=null;return true;});
 const cliente=db();if(!cliente)return false;
 const {data,error}=await cliente.from('solicitudes_asesoria').update({eliminado_en:new Date().toISOString(),token:null}).eq('id',id).eq('estado','cancelada').is('pedido_id',null).is('eliminado_en',null).select('id').maybeSingle();
 return !error&&Boolean(data);
}
