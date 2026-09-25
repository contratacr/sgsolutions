import type {CatalogoAdmin} from '../catalogo-modelo';
import {ErrorImportacion,prepararArchivo} from './archivo';
export function productosVinculados(base:CatalogoAdmin){
 return base.productos.flatMap(p=>{const sku=p.codigoIntcomex||p.proveedor?.sku;return sku?[{id:p.id,sku,nombre:p.nombre}]:[];});
}
// The browser supplies exports, never a catalog to save. Only current linked SKUs may change.
export function prepararSesion(archivos:{sku:string;filas:unknown[][]}[],base:CatalogoAdmin,fecha:string,consultados?:string[]){
 const vinculados=productosVinculados(base),permitidos=new Map(vinculados.map(p=>[p.sku,p.id]));
 if(permitidos.size!==vinculados.length)throw new ErrorImportacion('duplicado');
 if(consultados){
  if(new Set(consultados).size!==consultados.length||consultados.some(sku=>!permitidos.has(sku))||archivos.some(a=>!consultados.includes(a.sku)))throw new ErrorImportacion('duplicado');
 }
 const vistos=new Set<string>();const faltantes:string[]=[];let catalogo=structuredClone(base);
 const cambios:ReturnType<typeof prepararArchivo>['cambios']=[];
 for(const archivo of archivos){
  if(!permitidos.has(archivo.sku)||vistos.has(archivo.sku))throw new ErrorImportacion('duplicado');vistos.add(archivo.sku);
  const normalizar=(x:unknown)=>String(x??'').trim().toLowerCase();
  const n=archivo.filas.findIndex((f,i)=>i<10&&f.some(c=>normalizar(c)==='sku')&&f.some(c=>normalizar(c)==='precio'));
  if(n<0)throw new ErrorImportacion('formato');
  const col=archivo.filas[n].findIndex(c=>normalizar(c)==='sku');
  const filas=archivo.filas.slice(n+1).filter(f=>String(f[col]??'').trim()===archivo.sku);
  if(filas.length===0){faltantes.push(archivo.sku);continue;}
  if(filas.length!==1)throw new ErrorImportacion('duplicado');
  const p=catalogo.productos.find(p=>p.id===permitidos.get(archivo.sku))!;
  // Bind a newly added product without manufacturing a supplier cost or stock value.
  const resultado=prepararArchivo([archivo.filas[n],...filas],catalogo,'USD',p.categoria,fecha);
  const importado=resultado.catalogo.productos.find(x=>x.proveedor?.sku===archivo.sku)!;
  if(importado.id!==p.id)throw new ErrorImportacion('duplicado');
  catalogo=resultado.catalogo;cambios.push({...resultado.cambios[0],nuevo:false,nombre:p.nombre.es});
 }
 if(!cambios.length)throw new ErrorImportacion('sinCoincidencias');
 if(consultados){
  const encontrados=new Set(cambios.map(c=>c.sku));
  const ausentes=consultados.filter(sku=>!encontrados.has(sku));
  // A changed portal or bad session must never hide most of the store.
  if(ausentes.length>Math.max(2,Math.floor(consultados.length*0.2)))throw new ErrorImportacion('sinCoincidencias');
  for(const sku of consultados){
   const producto=catalogo.productos.find(p=>p.id===permitidos.get(sku))!;
   producto.estadoIntcomex={estado:encontrados.has(sku)?'encontrado':'noEncontrado',fecha};
  }
  faltantes.splice(0,faltantes.length,...ausentes);
 }
 catalogo.sincronizacion={fecha,origen:'intcomex',nuevos:0,actualizados:cambios.length,revisionPrecio:cambios.filter(c=>c.revision).length,sinImagen:0,sinCodigo:0,fueraDeCategoria:0};
 return {catalogo,cambios,faltantes};
}
