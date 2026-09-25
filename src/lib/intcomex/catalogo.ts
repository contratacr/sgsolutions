import {createHash} from 'node:crypto';
import {z} from 'zod';
import {esquemaCatalogo,type CatalogoAdmin} from '../catalogo-modelo.ts';

const texto=z.string().trim().min(1).max(2000);
export const esquemaFilaProveedor=z.object({sku:texto,mpn:z.string().trim(),marca:texto,nombreEs:texto,nombreEn:texto,categoria:z.string(),costo:z.number().finite().positive(),moneda:z.enum(['USD','CRC']),stock:z.number().int().nonnegative().nullable(),stockExacto:z.boolean(),tipo:z.string().default('Physical'),imagen:z.string().default('')});
export type FilaProveedor=z.infer<typeof esquemaFilaProveedor>;
const categorias:Record<string,string>={cpt:'computo',net:'redes',act:'seguridad',int:'seguridad',vis:'seguridad',cac:'accesorios',ccr:'accesorios',cpe:'accesorios',prt:'oficina',cns:'oficina',com:'oficina',pos:'punto-de-venta',sfw:'software',gam:'gaming',cco:'componentes',sto:'componentes',mem:'componentes',mnt:'componentes',ups:'componentes',prj:'oficina'};
export function asignarCategoria(codigo:string,nombre:string){
 const raiz=codigo.toLowerCase().split(/[._]/)[0];
 const categoria=categorias[raiz];
 if(categoria&&['computo','accesorios','componentes'].includes(categoria)&&/\b(gaming|gamer|legion|victus|predator|rog|loq)\b/i.test(nombre))return 'gaming';
 return categoria??null;
}
const productoIws=z.object({Sku:texto,Mpn:z.string().optional(),MPN:z.string().optional(),Brand:z.object({Description:texto}),Description:texto,Category:z.object({CategoryId:texto}).optional(),Type:z.string().optional()});
const precioIws=z.object({Sku:texto,Price:z.object({UnitPrice:z.number().finite(),CurrencyId:texto})});
const inventarioIws=z.object({Sku:texto,InStock:z.union([z.number(),z.string().regex(/^\d+$/)]).transform(Number).pipe(z.number().int().nonnegative()),RealStockValue:z.boolean().optional()});
export function combinarIws(es:unknown[],en:unknown[],precios:unknown[],inventario:unknown[]){
 const ingles=new Map(en.map(x=>{const p=productoIws.parse(x);return [p.Sku,p.Description];}));
 const costos=new Map(precios.map(x=>{const p=precioIws.parse(x);return [p.Sku,p.Price];}));
 const existencias=new Map(inventario.map(x=>{const p=inventarioIws.parse(x);return [p.Sku,p];}));
 const filas:FilaProveedor[]=[],omitidos:{sku:string;motivo:string}[]=[];
 const vistos=new Set<string>();
 for(const dato of es){
  const p=productoIws.parse(dato);
  if(vistos.has(p.Sku))throw new Error('IWS_SKU_DUPLICADO');vistos.add(p.Sku);
  const precio=costos.get(p.Sku),stock=existencias.get(p.Sku),nombreEn=ingles.get(p.Sku);
  const categoria=asignarCategoria(p.Category?.CategoryId??'',p.Description);
  if(!categoria){omitidos.push({sku:p.Sku,motivo:'categoria_fuera_de_alcance'});continue;}
  if(!precio||precio.UnitPrice<=0||!nombreEn){omitidos.push({sku:p.Sku,motivo:'precio_o_traduccion_pendiente'});continue;}
  const moneda=({US:'USD',USD:'USD',CRC:'CRC',CR:'CRC'} as const)[precio.CurrencyId as 'US'];
  if(!moneda)throw new Error('IWS_MONEDA_NO_RECONOCIDA');
  filas.push(esquemaFilaProveedor.parse({sku:p.Sku,mpn:p.Mpn??p.MPN??'',marca:p.Brand.Description,nombreEs:p.Description,nombreEn,categoria,costo:precio.UnitPrice,moneda,stock:stock?.InStock??null,stockExacto:stock?.RealStockValue??false,tipo:p.Type??'Physical'}));
 }
 return {filas,omitidos};
}

export function fusionarProveedor(actual:CatalogoAdmin,filas:FilaProveedor[],fecha:string){
 const siguiente=structuredClone(actual);
 const indice=new Map(siguiente.productos.filter(p=>p.proveedor).map(p=>[p.proveedor!.sku,p]));
 const vistos=new Set<string>();
 const informe={nuevos:0,actualizados:0,revisionPrecio:0,sinImagen:0,sinCodigo:0,fueraDeCategoria:0};
 for(const raw of filas){
  const f=esquemaFilaProveedor.parse(raw);
  if(vistos.has(f.sku))throw new Error('IWS_SKU_DUPLICADO');vistos.add(f.sku);
  if(!siguiente.categorias.some(c=>c.id===f.categoria)){informe.fueraDeCategoria++;continue;}
  const idImportado=`ic-${createHash('sha256').update(f.sku).digest('hex').slice(0,24)}`;
  const candidatos=siguiente.productos.filter(p=>!p.proveedor&&p.codigoFabricante===f.mpn&&p.marca===f.marca);
  let p=indice.get(f.sku)??siguiente.productos.find(p=>p.codigoIntcomex===f.sku)??siguiente.productos.find(p=>p.id===idImportado)??(f.mpn&&candidatos.length===1?candidatos[0]:undefined);
  const proveedor={sku:f.sku,costo:f.costo,moneda:f.moneda,stock:f.stock,stockExacto:f.stockExacto,tipo:f.tipo,actualizado:fecha};
  if(!p){
   p={id:idImportado,precioReferencia:null,disponibilidadReferencia:'consultar',categoria:f.categoria,nombre:{es:f.nombreEs,en:f.nombreEn},descripcion:{es:f.nombreEs,en:f.nombreEn},marca:f.marca,codigoFabricante:f.mpn,imagen:f.imagen||'/imagenes/producto-sin-imagen.svg',costoUsd:f.moneda==='USD'?f.costo:null,costoCrc:f.moneda==='CRC'?f.costo:null,imagenes:[],especificaciones:[],precioManual:null,publicado:!!f.mpn,destacado:false,inventarioPropio:false,proveedor,revisionPrecio:false};
   siguiente.productos.push(p);indice.set(f.sku,p);informe.nuevos++;
  }else{
   // Completar imágenes pendientes sin reemplazar imágenes personalizadas por SG.
   if(f.imagen&&p.imagen==='/imagenes/producto-sin-imagen.svg')p.imagen=f.imagen;
   // Preservar contenido, categoría y precios manuales editados por SG.
   const costoAnterior=f.moneda==='USD'?p.costoUsd:p.costoCrc;
   const salto=costoAnterior!==null&&costoAnterior!==undefined&&costoAnterior>0&&Math.abs(f.costo/costoAnterior-1)>.3;
   p.proveedor=proveedor;indice.set(f.sku,p);
   if(salto){p.revisionPrecio=true;informe.revisionPrecio++;}
   else{p.costoUsd=f.moneda==='USD'?f.costo:null;p.costoCrc=f.moneda==='CRC'?f.costo:null;p.revisionPrecio=false;}
   informe.actualizados++;
  }
  p.estadoIntcomex={estado:'encontrado',fecha};
  if(!f.imagen&&p.imagen==='/imagenes/producto-sin-imagen.svg')informe.sinImagen++;
  if(!p.codigoFabricante)informe.sinCodigo++;
 }
 siguiente.sincronizacion={fecha,origen:'intcomex',...informe};
 return {catalogo:esquemaCatalogo.parse(siguiente),informe};
}
