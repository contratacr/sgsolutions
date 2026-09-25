import {type CatalogoAdmin,calcularPrecio} from '../catalogo-modelo';
import {fusionarProveedor,type FilaProveedor} from './catalogo';
import {estaSeleccionado} from './seleccion';

export class ErrorImportacion extends Error {
 constructor(public codigo:string,public fila=0){super(codigo);}
}
const normalizar=(v:unknown)=>String(v??'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function prepararArchivo(filas:unknown[][],base:CatalogoAdmin,moneda:'USD'|'CRC',categoria:string,fecha:string,soloSeleccion=false){
 if(!base.categorias.some(c=>c.id===categoria))throw new ErrorImportacion('categoria');
 const cabecera=filas.findIndex((f,i)=>i<10&&f.some(c=>normalizar(c)==='sku')&&f.some(c=>normalizar(c)==='precio'));
 if(cabecera<0)throw new ErrorImportacion('formato');
 const encabezados=filas[cabecera].map(normalizar);
 const columnas=['nombre','marca','precio','disponibilidad','no. de parte','sku'].map(n=>encabezados.indexOf(n));
 if(columnas.some(i=>i<0))throw new ErrorImportacion('formato');
 const datos:FilaProveedor[]=[];const vistos=new Set<string>();
 for(let i=cabecera+1;i<filas.length;i++){
  const fila=filas[i];if(fila.every(c=>c===null||c===undefined||c===''))continue;
  const [nombre,marca,costo,disponibilidad,mpn,sku]=columnas.map(c=>fila[c]);
  const codigo=String(sku??'').trim();
  if(soloSeleccion&&!estaSeleccionado(codigo,String(mpn??'')))continue;
  if(!codigo||codigo.length>100||!String(nombre??'').trim()||!String(marca??'').trim()||typeof costo!=='number'||!Number.isFinite(costo)||costo<=0)throw new ErrorImportacion('fila',i+1);
  if(vistos.has(codigo))throw new ErrorImportacion('duplicado',i+1);vistos.add(codigo);
  const stockTexto=normalizar(disponibilidad);let stock:number|null=null,stockExacto=false;
  if(/^\d+$/.test(stockTexto)){stock=Number(stockTexto);stockExacto=true;}
  else if(/^mas de \d+$/.test(stockTexto)){stock=Number(stockTexto.replace('mas de ',''))+1;}
  else if(!['','n/a','consultar','no disponible','sin disponibilidad'].includes(stockTexto))throw new ErrorImportacion('stock',i+1);
  // Unknown availability is never interpreted as zero inventory.
  const candidatos=base.productos.filter(p=>p.codigoFabricante===String(mpn??'').trim()&&p.marca===String(marca).trim());
  const existente=base.productos.find(p=>p.proveedor?.sku===codigo||p.codigoIntcomex===codigo)||(mpn&&candidatos.length===1?candidatos[0]:undefined);
  datos.push({sku:codigo,mpn:String(mpn??'').trim(),marca:String(marca).trim(),nombreEs:existente?.nombre.es??String(nombre).trim(),nombreEn:existente?.nombre.en??String(nombre).trim(),categoria:existente?.categoria??categoria,costo,moneda,stock,stockExacto,tipo:existente?.proveedor?.tipo??'Physical',imagen:''});
 }
 if(!datos.length&&soloSeleccion)throw new ErrorImportacion('sinCoincidenciasSeleccion');
 if(!datos.length||datos.length>20000)throw new ErrorImportacion('limite');
 const resultado=fusionarProveedor(base,datos,fecha);
 const anteriores=new Map(base.productos.map(p=>[p.id,p]));
 const recibidos=new Set(datos.map(d=>d.sku));
 const cambios=resultado.catalogo.productos.filter(p=>p.proveedor&&recibidos.has(p.proveedor.sku)).map(p=>{
  const antes=anteriores.get(p.id);if(!antes)p.publicado=false;
  return {sku:p.proveedor!.sku,mpn:p.codigoFabricante,sinFoto:p.imagen==='/imagenes/producto-sin-imagen.svg',nombre:p.nombre.es,nuevo:!antes,costoAntes:antes?.proveedor?.costo??antes?.costoUsd??antes?.costoCrc??null,monedaAntes:antes?.proveedor?.moneda??(antes?.costoUsd!=null?'USD':'CRC'),costo:p.proveedor!.costo,stock:p.proveedor!.stock,exacto:p.proveedor!.stockExacto,precio:p.revisionPrecio&&p.precioManual===null?null:calcularPrecio(p.costoUsd,base.ajustes,p.precioManual,p.costoCrc),manual:p.precioManual!==null,revision:p.revisionPrecio};
 });
 return {...resultado,cambios};
}

// Inventory updates never use prices, names or photos from the uploaded file.
// Missing rows are not zero stock: partial exports leave them unchanged.
export function prepararInventario(filas:unknown[][],base:CatalogoAdmin,fecha:string,soloSeleccion=false){
 const cabecera=filas.findIndex((f,i)=>i<10&&f.some(c=>normalizar(c)==='sku')&&f.some(c=>normalizar(c)==='disponibilidad'));
 if(cabecera<0)throw new ErrorImportacion('formatoInventario');
 const encabezados=filas[cabecera].map(normalizar);
 const skuCol=encabezados.indexOf('sku'),stockCol=encabezados.indexOf('disponibilidad'),mpnCol=encabezados.indexOf('no. de parte');
 const catalogo=structuredClone(base),vistos=new Set<string>();
 const cambios:ReturnType<typeof prepararArchivo>['cambios']=[];
 let omitidos=0;
 for(let i=cabecera+1;i<filas.length;i++){
  const fila=filas[i];if(fila.every(c=>c===null||c===undefined||c===''))continue;
  const sku=String(fila[skuCol]??'').trim(),mpn=String(fila[mpnCol]??'').trim();
  if(soloSeleccion&&!estaSeleccionado(sku,mpn)){omitidos++;continue;}
  if(!sku||sku.length>100)throw new ErrorImportacion('fila',i+1);
  if(vistos.has(sku))throw new ErrorImportacion('duplicado',i+1);vistos.add(sku);
  const p=catalogo.productos.find(p=>p.proveedor?.sku===sku);
  if(!p?.proveedor){omitidos++;continue;}
  const texto=normalizar(fila[stockCol]);let stock:number|null=null,exacto=false;
  if(/^\d+$/.test(texto)){stock=Number(texto);exacto=true;}
  else if(/^mas de \d+$/.test(texto))stock=Number(texto.replace('mas de ',''))+1;
  else if(!['','n/a','consultar','no disponible','sin disponibilidad'].includes(texto))throw new ErrorImportacion('stock',i+1);
  if(stock!==null&&!Number.isSafeInteger(stock))throw new ErrorImportacion('stock',i+1);
  p.proveedor={...p.proveedor,stock,stockExacto:exacto,actualizado:fecha};
  cambios.push({sku,mpn:p.codigoFabricante,sinFoto:false,nombre:p.nombre.es,nuevo:false,costoAntes:p.proveedor.costo,monedaAntes:p.proveedor.moneda,costo:p.proveedor.costo,stock,exacto,precio:p.revisionPrecio&&p.precioManual===null?null:calcularPrecio(p.costoUsd,base.ajustes,p.precioManual,p.costoCrc),manual:p.precioManual!==null,revision:p.revisionPrecio});
 }
 if(!cambios.length)throw new ErrorImportacion('sinCoincidencias');
 if(vistos.size>20000)throw new ErrorImportacion('limite');
 const informe={nuevos:0,actualizados:cambios.length,revisionPrecio:0,sinImagen:0,sinCodigo:0,fueraDeCategoria:0};
 catalogo.inventario={fecha,actualizados:cambios.length};
 return {catalogo,informe,cambios,omitidos};
}
