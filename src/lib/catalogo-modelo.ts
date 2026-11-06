import {esProductoSoftware} from './software';
import {resolverImagenProducto,tieneImagenProducto} from './imagenes-productos';
import {z} from 'zod';
import {esProductoManual,esProductoEurocomp,esProductoEmpresarial,esDuplicadoEmpresarial} from './catalogo-fuente';
import {asignarRutasProductos} from './rutas-productos';
export const politicaPrecios = {cambio:500,adicional:0,iva:13,utilidad:20};
const texto = z.object({es:z.string().trim().min(1).max(2000),en:z.string().trim().min(1).max(2000)});
const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,59}$/);
const imagen = z.string().max(1000).refine(v => /^\/imagenes\/[a-zA-Z0-9._/-]+$/.test(v) || /^https:\/\/[^\s]+$/.test(v), 'imagen');
export const esquemaCatalogo = z.object({
  gestion:z.literal('manual').optional(),
  categorias:z.array(z.object({id,nombre:texto})).min(1).max(20),
  productos:z.array(z.object({id,origen:z.literal('manual').optional(),ofertaPrioritaria:z.boolean().optional(),precioFijado:z.boolean().optional(),ofertaInicio:z.string().datetime().nullable().optional(),ofertaFin:z.string().datetime().nullable().optional(),coleccion:z.literal('empresas').optional(),solucionEmpresarial:z.enum(['redes','seguridad','respaldo','infraestructura','energia']).optional(),slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100).optional(),categoria:id,subcategoria:texto.optional(),nombre:texto,descripcion:texto,imagen,imagenes:z.array(imagen).max(12).default([]),especificaciones:z.array(z.object({nombre:texto,valor:texto})).max(100).default([]),fichaTecnica:z.string().url().startsWith('https://').optional(),marca:z.string().max(80),codigoFabricante:z.string().max(100).default(''),codigoIntcomex:z.string().trim().max(100).regex(/^[A-Za-z0-9()._-]*$/).optional(),estadoIntcomex:z.object({estado:z.enum(['encontrado','noEncontrado']),fecha:z.string().datetime()}).optional(),codigoEurocomp:z.string().max(100).optional(),eurocomp:z.object({codigo:z.string().min(1).max(100),stock:z.number().nonnegative(),costo:z.number().nonnegative(),moneda:z.enum(['USD','CRC']),actualizado:z.string().datetime()}).optional(),stockManual:z.number().int().min(0).max(1000000).nullable().optional(),inventarioPropio:z.boolean().default(false),costoUsd:z.number().min(0).max(1000000).nullable(),costoCrc:z.number().min(0).max(1000000000).nullable().default(null),precioReferencia:z.number().positive().nullable().default(null),disponibilidadReferencia:z.enum(['consultar','agotado','proveedor']).default('consultar'),revisionPrecio:z.boolean().default(false),proveedor:z.object({sku:z.string().min(1).max(100),costo:z.number().positive(),moneda:z.enum(['USD','CRC']),stock:z.number().int().nonnegative().nullable(),stockExacto:z.boolean(),tipo:z.string(),actualizado:z.string().datetime()}).optional(),precioDescuento:z.number().int().positive().max(1000000000).nullable().optional(),precioManual:z.number().positive().max(1000000000).nullable(),publicado:z.boolean(),destacado:z.boolean()})).max(20000),
  sincronizacion:z.object({fecha:z.string().datetime(),origen:z.literal('intcomex'),nuevos:z.number(),actualizados:z.number(),revisionPrecio:z.number(),sinImagen:z.number(),sinCodigo:z.number(),fueraDeCategoria:z.number()}).optional(),
  inventario:z.object({fecha:z.string().datetime(),actualizados:z.number().int().nonnegative()}).optional(),
  ajustes:z.object({cambio:z.number().positive().max(10000),adicional:z.number().min(0).max(1000),iva:z.number().min(0).max(100),utilidad:z.number().min(0).max(1000)}),
  textos:z.object({titulo:texto,descripcion:texto,aviso:texto})
}).superRefine((c,ctx)=>{
  for(const [i,p] of c.productos.entries()){
    if(p.origen==='manual'&&(!esProductoManual(p)||p.codigoEurocomp||p.eurocomp||p.codigoIntcomex||p.proveedor||p.coleccion))ctx.addIssue({code:'custom',message:'Origen manual incompatible',path:['productos',i,'origen']});
    if((p.ofertaInicio||p.ofertaFin)&&p.precioDescuento==null)ctx.addIssue({code:'custom',message:'Fechas sin oferta',path:['productos',i,'precioDescuento']});
    if(p.ofertaInicio&&p.ofertaFin&&Date.parse(p.ofertaFin)<=Date.parse(p.ofertaInicio))ctx.addIssue({code:'custom',message:'Fin anterior al inicio',path:['productos',i,'ofertaFin']});
  }
  for(const lista of [c.categorias,c.productos]) if(new Set(lista.map(x=>x.id)).size!==lista.length) ctx.addIssue({code:'custom',message:'IDs duplicados'});
  const idsProductos=new Set(c.productos.map(p=>p.id));
  const slugs=c.productos.map(p=>p.slug).filter(Boolean);
  if(new Set(slugs).size!==slugs.length||c.productos.some(p=>p.slug&&p.slug!==p.id&&idsProductos.has(p.slug)))ctx.addIssue({code:'custom',message:'Rutas de producto duplicadas'});
  const codigos=c.productos.map(p=>p.proveedor?.sku||p.codigoIntcomex).filter(Boolean);
  if(new Set(codigos).size!==codigos.length)ctx.addIssue({code:'custom',message:'Código de proveedor duplicado'});
  for(const p of c.productos)if(p.proveedor&&p.codigoIntcomex&&p.proveedor.sku!==p.codigoIntcomex)ctx.addIssue({code:'custom',message:'Vínculo de proveedor incompatible'});
  for(const p of c.productos)if(p.coleccion==='empresas'&&!esProductoEmpresarial(p))ctx.addIssue({code:'custom',message:'Producto fuera de la selección empresarial'});
  for(const p of c.productos) if(!c.categorias.some(x=>x.id===p.categoria)) ctx.addIssue({code:'custom',message:'Categoría inexistente'});
}).transform(c=>({...c,productos:asignarRutasProductos(c.productos)}));
export type CatalogoAdmin=z.infer<typeof esquemaCatalogo>;
export type Texto=CatalogoAdmin['textos']['titulo'];
export function traducir(texto:Texto,idioma:string){return idioma==='en'?texto.en:texto.es;}
export function redondearPrecio(precio:number){
  // Precios bajos: ajuste comercial de ₡500 (p. ej. ₡9.424,20 → ₡9.500).
  const paso=precio<50_000?500:1000;
  const cociente=precio/paso,entero=Math.round(cociente);
  // Evitar subir otro tramo por ruido de coma flotante en un múltiplo exacto.
  const multiplo=Math.abs(cociente-entero)<=Number.EPSILON*Math.max(1,Math.abs(cociente))*4?entero:Math.ceil(cociente);
  return multiplo*paso;
}
export function calcularPrecio(costo:number|null,ajustes:CatalogoAdmin['ajustes'],manual:number|null=null,costoCrc:number|null=null){
  if(manual!==null) return Math.round(manual);
  if(costoCrc!==null)return redondearPrecio(costoCrc*(1+ajustes.iva/100)*(1+ajustes.utilidad/100));
  if(costo===null) return null;
  return redondearPrecio(costo*(ajustes.cambio+ajustes.adicional)*(1+ajustes.iva/100)*(1+ajustes.utilidad/100));
}
export function preciosProducto(p:CatalogoAdmin['productos'][number],ajustes:CatalogoAdmin['ajustes'],ahora=Date.now()){
 const normal=p.revisionPrecio&&p.precioManual===null?null:(calcularPrecio(p.costoUsd,ajustes,p.precioManual,p.costoCrc)??p.precioReferencia);
 return aplicarOferta(normal,p,ahora);
}
export function ofertaVigente(p:{ofertaInicio?:string|null;ofertaFin?:string|null},ahora=Date.now()){
 return (!p.ofertaInicio||Date.parse(p.ofertaInicio)<=ahora)&&(!p.ofertaFin||ahora<Date.parse(p.ofertaFin));
}
export function aplicarOferta(normal:number|null,p:{precioDescuento?:number|null;ofertaInicio?:string|null;ofertaFin?:string|null},ahora=Date.now()){
 return aplicarDescuento(normal,ofertaVigente(p,ahora)?p.precioDescuento:null);
}
export function aplicarDescuento(normal:number|null,oferta?:number|null){
 const valido=normal!==null&&typeof oferta==='number'&&Number.isInteger(oferta)&&oferta>0&&oferta<normal;
 return {precio:valido?oferta:normal,precioOriginal:valido?normal:null};
}
export function descuentosInvalidos(c:CatalogoAdmin){return c.productos.flatMap((p,i)=>{
 if(p.precioDescuento==null)return [];
 const normal=preciosProducto({...p,precioDescuento:null},c.ajustes).precio;
 return aplicarDescuento(normal,p.precioDescuento).precioOriginal===null?[i]:[];
});}
export function publicarCatalogo(c:CatalogoAdmin,incluirPendientesImagen=false){return {...(c.productos.some(esProductoSoftware)?{versionSoftware:1}:{}),...(c.productos.some(esProductoEmpresarial)?{versionEmpresarial:1}:{}),gestion:c.gestion,categorias:c.categorias,textos:c.textos,productos:asignarRutasProductos(c.productos).map(resolverImagenProducto).filter(p=>incluirPendientesImagen||tieneImagenProducto(p)).filter(p=>(esProductoManual(p)||esProductoEurocomp(p)||esProductoEmpresarial(p)||esProductoSoftware(p))&&!esDuplicadoEmpresarial(p)&&p.publicado&&(!p.eurocomp||p.eurocomp.stock>=15)).map(p=>({id:p.id,slug:p.slug,...(p.ofertaPrioritaria?{ofertaPrioritaria:true}:{}),...(esProductoManual(p)?{origen:'manual' as const}:{}),...(p.precioDescuento!=null&&(p.ofertaInicio||p.ofertaFin)?{promocion:{normal:preciosProducto({...p,precioDescuento:null},c.ajustes).precio,precio:p.precioDescuento,inicio:p.ofertaInicio??null,fin:p.ofertaFin??null}}:{}),...(esProductoSoftware(p)?{entregaDigital:true,limitePorPedido:30}:{}),...(p.coleccion?{coleccion:p.coleccion,solucionEmpresarial:p.solucionEmpresarial}:{}),...((p.eurocomp?.codigo||p.codigoEurocomp)?{codigoEurocomp:p.eurocomp?.codigo||p.codigoEurocomp}:{}),categoria:p.categoria,subcategoria:p.subcategoria,nombre:p.nombre,descripcion:p.descripcion,imagen:p.imagen,imagenes:p.imagenes,especificaciones:p.especificaciones,fichaTecnica:p.fichaTecnica,marca:p.marca,codigoFabricante:p.codigoFabricante,stockDisponible:esProductoManual(p)?p.stockManual??null:p.eurocomp?.stock??null,destacado:p.destacado,disponibilidad:esProductoManual(p)&&p.stockManual!=null?(p.stockManual===0?'agotado' as const:'proveedor' as const):esProductoEmpresarial(p)?'consultar' as const:c.gestion==='manual'?p.disponibilidadReferencia:p.inventarioPropio?'consultar':p.proveedor?(p.proveedor.tipo==='Downloadable'||p.proveedor.tipo==='License'?'consultar':p.proveedor.stock===null?'consultar':p.proveedor.stock===0?'agotado':'proveedor'):p.disponibilidadReferencia,actualizado:p.proveedor?.actualizado??null,...preciosProducto(p,c.ajustes)}))};}
export type ClasificacionProducto={categoria:string;subcategoria?:{es:string;en:string}};
export type CatalogoPublico=Omit<ReturnType<typeof publicarCatalogo>,'productos'>&{productos:(ReturnType<typeof publicarCatalogo>['productos'][number]&{clasificaciones?:ClasificacionProducto[]})[]};
/** Do not report a manually published product as saved when the public projection excludes it. */
export function publicacionesManualesInvalidas(c:CatalogoAdmin){
 const visibles=new Set(publicarCatalogo(c).productos.map(p=>p.id));
 return c.productos.flatMap((p,i)=>esProductoManual(p)&&p.publicado&&!visibles.has(p.id)?[i]:[]);
}
// Safari and Node use different thousands separators for es-CR. Keep the
// server and browser output identical to avoid hydration errors in prices.
export function colones(precio:number){
 const entero=Math.round(precio);
 return `${entero<0?'-':''}₡${Math.abs(entero).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,'\u00a0')}`;
}

/** Re-evaluate persisted public snapshots on every request, without a scheduler. */
export function actualizarOfertasPublicas(c:CatalogoPublico,ahora=Date.now()):CatalogoPublico{
 return {...c,productos:c.productos.map(p=>p.promocion?{...p,...aplicarOferta(p.promocion.normal,{precioDescuento:p.promocion.precio,ofertaInicio:p.promocion.inicio,ofertaFin:p.promocion.fin},ahora)}:p)};
}

/** A commercial promotion may lead Recommended only while valid and available. */
export function esOfertaPrioritaria(p:{ofertaPrioritaria?:boolean;precio:number|null;precioOriginal?:number|null;disponibilidad:string;promocion?:{inicio:string|null;fin:string|null}},ahora=Date.now()){
 return p.precio!==null&&p.precioOriginal!=null&&p.precio>0&&p.precio<p.precioOriginal&&p.disponibilidad!=='agotado'&&(!p.promocion||ofertaVigente({ofertaInicio:p.promocion.inicio,ofertaFin:p.promocion.fin},ahora));
}
