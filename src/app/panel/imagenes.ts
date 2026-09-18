'use server';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {sesionLocal} from '@/lib/admin-local';
import {crearClienteServidor} from '@/lib/supabase/servidor';

export async function subirImagen(datos:FormData):Promise<{src?:string;error?:string}>{
 const local=await sesionLocal();
 const cliente=local?null:await crearClienteServidor();
 if(!local){
  if(!cliente)return {error:'sinPermiso'};
  const {data:{user}}=await cliente.auth.getUser();
  if(!user)return {error:'sinPermiso'};
  const {data:perfil}=await cliente.from('perfiles').select('rol').eq('id',user.id).eq('activo',true).maybeSingle();
  if(perfil?.rol!=='administrador')return {error:'sinPermiso'};
 }
 const archivo=datos.get('archivo');
 if(!(archivo instanceof File)||archivo.size===0||archivo.size>8*1024*1024)return {error:'archivoInvalido'};
 const bytes=Buffer.from(await archivo.arrayBuffer());
 const extension=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'jpg':bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'?'webp':null;
 if(!extension)return {error:'archivoInvalido'};
 const nombre=`${randomUUID()}.${extension}`;
 try{
  if(local){
   const carpeta=path.join(process.cwd(),'public','imagenes','admin');
   await mkdir(carpeta,{recursive:true});await writeFile(path.join(carpeta,nombre),bytes,{flag:'wx'});
   return {src:`/imagenes/admin/${nombre}`};
  }
  const {error}=await cliente!.storage.from('imagenes-admin').upload(nombre,bytes,{contentType:extension==='jpg'?'image/jpeg':`image/${extension}`,upsert:false});
  if(error)return {error:'errorCarga'};
  return {src:cliente!.storage.from('imagenes-admin').getPublicUrl(nombre).data.publicUrl};
 }catch{return {error:'errorCarga'};}
}
