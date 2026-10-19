'use server';
import {exigirAdminMfa} from '@/lib/acceso-panel';
import {guardarSoporteLocal,archivarSoporteLocal} from '@/lib/soporte-local';
import {revalidatePath} from 'next/cache';
import {z} from 'zod';
import {accesoSoporte} from '@/lib/soporte-servidor';
import {esquemasSoporte,entidadesSoporte,camposSoporte} from '@/lib/soporte-modelo';
export type ResultadoSoporte={estado:'inicio'|'guardado'|'archivado'|'restaurado'|'validacion'|'sinPermiso'|'noDisponible'|'conflicto'|'duplicado'|'relacion';campos?:string[]};
function fallo(error:unknown):ResultadoSoporte{
 const mensaje=error&&typeof error==='object'&&'message' in error?String(error.message):'';
 return {estado:mensaje.includes('SIN_PERMISO')?'sinPermiso':mensaje.includes('CONFLICTO')?'conflicto':mensaje.includes('RELACION_INVALIDA')?'relacion':mensaje.includes('duplicate key')?'duplicado':mensaje.includes('check constraint')||mensaje.includes('VALIDACION')?'validacion':'noDisponible'};
}
export async function guardarSoporte(_:ResultadoSoporte,form:FormData):Promise<ResultadoSoporte>{
 await exigirAdminMfa();
 try{
  const acceso=await accesoSoporte();
  const entidad=z.enum(entidadesSoporte).safeParse(form.get('entidad'));
  const id=z.union([z.uuid(),z.literal('')]).safeParse(form.get('id')??'');
  const version=z.coerce.number().int().nonnegative().max(2147483646).safeParse(form.get('version'));
  if(!entidad.success||!id.success||!version.success)return {estado:'validacion'};
  const datos=Object.fromEntries(camposSoporte[entidad.data].map(c=>[c.nombre,c.tipo==='checkbox'?form.get(c.nombre)==='on':form.get(c.nombre)??'']));
  const validos=esquemasSoporte[entidad.data].safeParse(datos);
  if(!validos.success)return {estado:'validacion',campos:validos.error.issues.map(i=>String(i.path[0]))};
  if(acceso.local){await guardarSoporteLocal(entidad.data,validos.data,id.data||null,version.data);revalidatePath('/panel/soporte','layout');return {estado:'guardado'};}
  const resultado=await acceso.cliente.rpc('guardar_soporte',{entidad:entidad.data,datos:validos.data,registro:id.data||null,version_esperada:version.data});
  if(resultado.error)return fallo(resultado.error);
  revalidatePath('/panel/soporte','layout');return {estado:'guardado'};
 }catch(e){return fallo(e);}
}
export async function archivarSoporte(_:ResultadoSoporte,form:FormData):Promise<ResultadoSoporte>{
 await exigirAdminMfa();
 try{
  const acceso=await accesoSoporte();
  const datos=z.strictObject({entidad:z.enum(entidadesSoporte),id:z.uuid(),version:z.coerce.number().int().positive().max(2147483646),archivar:z.enum(['si','no'])}).safeParse(Object.fromEntries(['entidad','id','version','archivar'].map(k=>[k,form.get(k)])));
  if(!datos.success)return {estado:'validacion'};
  const d=datos.data;if(acceso.local){await archivarSoporteLocal(d.entidad,d.id,d.version,d.archivar==='si');revalidatePath('/panel/soporte','layout');return {estado:d.archivar==='si'?'archivado':'restaurado'};}
  const r=await acceso.cliente.rpc('archivar_soporte',{entidad:d.entidad,registro:d.id,version_esperada:d.version,archivar:d.archivar==='si'});
  if(r.error)return fallo(r.error);revalidatePath('/panel/soporte','layout');return {estado:d.archivar==='si'?'archivado':'restaurado'};
 }catch(e){return fallo(e);}
}
