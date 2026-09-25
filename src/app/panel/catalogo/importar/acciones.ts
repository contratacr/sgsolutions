'use server';
import {z} from 'zod';
import {readSheet} from 'read-excel-file/node';
import {crearClienteServidor} from '@/lib/supabase/servidor';
import {sesionLocal,leerLocal} from '@/lib/admin-local';
import {catalogoInicial} from '@/lib/catalogo-servidor';
import {esquemaCatalogo} from '@/lib/catalogo-modelo';
import {ErrorImportacion,prepararArchivo,prepararInventario} from '@/lib/intcomex/archivo';
import {guardarCatalogo} from '../acciones';

export async function leerBaseImportacion(){
 if(await sesionLocal()){
  const dato=await leerLocal('catalogo');return {catalogo:dato?esquemaCatalogo.parse(dato.contenido):catalogoInicial,revision:dato?.revision??0};
 }
 const cliente=await crearClienteServidor();if(!cliente)throw new ErrorImportacion('sinPermiso');
 const {data:{user}}=await cliente.auth.getUser();if(!user)throw new ErrorImportacion('sinPermiso');
 const {data:perfil}=await cliente.from('perfiles').select('rol').eq('id',user.id).eq('activo',true).maybeSingle();
 if(perfil?.rol!=='administrador')throw new ErrorImportacion('sinPermiso');
 const {data,error}=await cliente.from('catalogo_privado').select('contenido,revision').eq('id',1).maybeSingle();
 if(error)throw new ErrorImportacion('error');
 return {catalogo:data?esquemaCatalogo.parse(data.contenido):catalogoInicial,revision:data?.revision??0};
}
export async function importarArchivo(form:FormData,revisionEsperada?:number){
 try{
  const base=await leerBaseImportacion();
  if(revisionEsperada!==undefined&&revisionEsperada!==base.revision)throw new ErrorImportacion('conflicto');
  const archivo=form.get('archivo'),moneda=form.get('moneda'),categoria=form.get('categoria');
  const inventario=form.get('modo')==='inventario',soloSeleccion=form.get('seleccion')!=='todos';
  if(!(archivo instanceof File)||!archivo.name.toLowerCase().endsWith('.xlsx')||archivo.size===0||archivo.size>4*1024*1024)throw new ErrorImportacion('archivo');
  if(!inventario&&moneda!=='USD'&&moneda!=='CRC')throw new ErrorImportacion('moneda');
  const filas=await readSheet(Buffer.from(await archivo.arrayBuffer()));
  const r=inventario?prepararInventario(filas,base.catalogo,new Date().toISOString(),soloSeleccion):prepararArchivo(filas,base.catalogo,moneda as 'USD'|'CRC',String(categoria??''),new Date().toISOString(),soloSeleccion);
  if(revisionEsperada!==undefined){
   const fotos=z.record(z.string().max(100),z.string().max(1000)).parse(JSON.parse(String(form.get('fotos')??'{}')));
   const almacenamiento=process.env.NEXT_PUBLIC_SUPABASE_URL;
   for(const p of inventario?[]:r.catalogo.productos){
    const src=p.proveedor&&fotos[p.proveedor.sku];
    const local=src&&/^\/imagenes\/admin\/[a-f0-9-]+\.(jpg|png|webp)$/.test(src);
    const remoto=src&&almacenamiento&&src.startsWith(almacenamiento+'/storage/v1/object/public/imagenes-admin/');
    if(src&&(local||remoto)&&p.imagen==='/imagenes/producto-sin-imagen.svg')p.imagen=src;
   }
   const guardado=await guardarCatalogo(r.catalogo,base.revision);
   if(guardado.error)return {error:guardado.error,fila:0};
   return {guardado:true};
  }
  return {preview:{revision:base.revision,informe:r.informe,cambios:r.cambios,omitidos:'omitidos' in r?Number(r.omitidos):0}};
 }catch(e){return {error:e instanceof ErrorImportacion?e.codigo:'formato',fila:e instanceof ErrorImportacion?e.fila:0};}
}
