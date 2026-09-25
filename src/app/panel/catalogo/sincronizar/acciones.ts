'use server';
import {readSheet} from 'read-excel-file/node';
import {leerBaseImportacion} from '../importar/acciones';
import {guardarCatalogo} from '../acciones';
import {ErrorImportacion} from '@/lib/intcomex/archivo';
import {prepararSesion,productosVinculados} from '@/lib/intcomex/sesion';
export async function revisarSesion(form:FormData,revision:number,guardar=false){
 try{
  const base=await leerBaseImportacion();
  if(!Number.isSafeInteger(revision)||base.revision!==revision)throw new ErrorImportacion('conflicto');
  const archivos=form.getAll('archivo'),codigos=form.getAll('sku');
  if(!archivos.length||archivos.length>500||archivos.length!==codigos.length)throw new ErrorImportacion('limite');
  const consultados=form.getAll('consultado').map(String);
  if(!consultados.length||consultados.length>500||new Set(consultados).size!==consultados.length)throw new ErrorImportacion('limite');
  const vinculados=productosVinculados(base.catalogo).map(p=>p.sku);
  if(form.get('consultaCompleta')==='si'&&(consultados.length!==vinculados.length||consultados.some(sku=>!vinculados.includes(sku))))throw new ErrorImportacion('duplicado');
  let bytes=0;const leidos=[];
  for(let i=0;i<archivos.length;i++){
   const f=archivos[i];if(!(f instanceof File)||!f.name.endsWith('.xlsx')||f.size===0||f.size>4*1024*1024||(bytes+=f.size)>16*1024*1024)throw new ErrorImportacion('archivo');
   leidos.push({sku:String(codigos[i]),filas:await readSheet(Buffer.from(await f.arrayBuffer()))});
  }
  const r=prepararSesion(leidos,base.catalogo,new Date().toISOString(),consultados);
  if(guardar){const g=await guardarCatalogo(r.catalogo,revision);return g.error?{error:g.error}:{guardado:true};}
  return {cambios:r.cambios,faltantes:r.faltantes};
 }catch(e){return {error:e instanceof ErrorImportacion?e.codigo:'error'};}
}
