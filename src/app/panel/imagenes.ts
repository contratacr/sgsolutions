'use server';
import {exigirAdminMfa} from '@/lib/acceso-panel';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {sesionLocal} from '@/lib/admin-local';
import {crearClienteServidor} from '@/lib/supabase/servidor';
import {imageSize} from 'image-size';

export async function subirImagen(datos:FormData):Promise<{src?:string;error?:string}>{
 await exigirAdminMfa();
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
 let imagen;try{imagen=imageSize(bytes);}catch{return {error:'archivoInvalido'};}
 const extension=['png','jpg','webp'].includes(imagen.type??'')?imagen.type:null;
 if(!extension)return {error:'archivoInvalido'};
 if(!imagen.width||!imagen.height||imagen.width*imagen.height>30000000)return {error:'archivoInvalido'};
 const nombre=`${randomUUID()}.${extension}`;
 try{
  if(local){
   const directorio=process.env.SG_PRUEBAS_INTEGRACION==='1'&&process.env.SG_ENTORNO==='local'&&process.env.SG_ADMIN_CONTENIDO_PRUEBAS==='1'?'admin-contenido-pruebas':'admin';
   const carpeta=path.join(process.cwd(),'public','imagenes',directorio);
   await mkdir(carpeta,{recursive:true});await writeFile(path.join(carpeta,nombre),bytes,{flag:'wx'});
   return {src:`/imagenes/${directorio}/${nombre}`};
  }
  const {error}=await cliente!.storage.from('imagenes-admin').upload(nombre,bytes,{contentType:extension==='jpg'?'image/jpeg':`image/${extension}`,upsert:false});
  if(error)return {error:['401','403'].includes(String(error.statusCode))?'sinPermiso':'errorCarga'};
  return {src:cliente!.storage.from('imagenes-admin').getPublicUrl(nombre).data.publicUrl};
 }catch{return {error:'errorCarga'};}
}
