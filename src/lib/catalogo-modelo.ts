import {z} from 'zod';
export const politicaPrecios = {cambio:500,adicional:0,iva:13,utilidad:20};
const texto = z.object({es:z.string().trim().min(1).max(2000),en:z.string().trim().min(1).max(2000)});
const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,59}$/);
const imagen = z.string().max(1000).refine(v => /^\/imagenes\/[a-zA-Z0-9._/-]+$/.test(v) || /^https:\/\/[^\s]+$/.test(v), 'imagen');
export const esquemaCatalogo = z.object({
  categorias:z.array(z.object({id,nombre:texto})).min(1).max(20),
  productos:z.array(z.object({id,categoria:id,nombre:texto,descripcion:texto,imagen,imagenes:z.array(imagen).max(12).default([]),especificaciones:z.array(z.object({nombre:texto,valor:texto})).max(100).default([]),fichaTecnica:z.string().url().startsWith('https://').optional(),marca:z.string().max(80),codigoFabricante:z.string().max(100).default(''),codigoIntcomex:z.string().trim().max(100).regex(/^[A-Za-z0-9()._-]*$/).optional(),estadoIntcomex:z.object({estado:z.enum(['encontrado','noEncontrado']),fecha:z.string().datetime()}).optional(),inventarioPropio:z.boolean().default(false),costoUsd:z.number().min(0).max(1000000).nullable(),costoCrc:z.number().min(0).max(1000000000).nullable().default(null),precioReferencia:z.number().positive().nullable().default(null),disponibilidadReferencia:z.enum(['consultar','agotado','proveedor']).default('consultar'),revisionPrecio:z.boolean().default(false),proveedor:z.object({sku:z.string().min(1).max(100),costo:z.number().positive(),moneda:z.enum(['USD','CRC']),stock:z.number().int().nonnegative().nullable(),stockExacto:z.boolean(),tipo:z.string(),actualizado:z.string().datetime()}).optional(),precioManual:z.number().positive().max(1000000000).nullable(),publicado:z.boolean(),destacado:z.boolean()})).max(20000),
  sincronizacion:z.object({fecha:z.string().datetime(),origen:z.literal('intcomex'),nuevos:z.number(),actualizados:z.number(),revisionPrecio:z.number(),sinImagen:z.number(),sinCodigo:z.number(),fueraDeCategoria:z.number()}).optional(),
  inventario:z.object({fecha:z.string().datetime(),actualizados:z.number().int().nonnegative()}).optional(),
  ajustes:z.object({cambio:z.number().positive().max(10000),adicional:z.number().min(0).max(1000),iva:z.number().min(0).max(100),utilidad:z.number().min(0).max(1000)}),
  textos:z.object({titulo:texto,descripcion:texto,aviso:texto})
}).superRefine((c,ctx)=>{
  for(const lista of [c.categorias,c.productos]) if(new Set(lista.map(x=>x.id)).size!==lista.length) ctx.addIssue({code:'custom',message:'IDs duplicados'});
  const codigos=c.productos.map(p=>p.proveedor?.sku||p.codigoIntcomex).filter(Boolean);
  if(new Set(codigos).size!==codigos.length)ctx.addIssue({code:'custom',message:'Código de proveedor duplicado'});
  for(const p of c.productos)if(p.proveedor&&p.codigoIntcomex&&p.proveedor.sku!==p.codigoIntcomex)ctx.addIssue({code:'custom',message:'Vínculo de proveedor incompatible'});
  for(const p of c.productos) if(!c.categorias.some(x=>x.id===p.categoria)) ctx.addIssue({code:'custom',message:'Categoría inexistente'});
});
export type CatalogoAdmin=z.infer<typeof esquemaCatalogo>;
export type Texto=CatalogoAdmin['textos']['titulo'];
export function traducir(texto:Texto,idioma:string){return idioma==='en'?texto.en:texto.es;}
export function redondearPrecio(precio:number){
  return Math.ceil(precio / 1000) * 1000;
}
export function calcularPrecio(costo:number|null,ajustes:CatalogoAdmin['ajustes'],manual:number|null=null,costoCrc:number|null=null){
  if(manual!==null) return Math.round(manual);
  if(costoCrc!==null)return redondearPrecio(costoCrc*(1+ajustes.iva/100)*(1+ajustes.utilidad/100));
  if(costo===null) return null;
  return redondearPrecio(costo*(ajustes.cambio+ajustes.adicional)*(1+ajustes.iva/100)*(1+ajustes.utilidad/100));
}
export function publicarCatalogo(c:CatalogoAdmin){return {categorias:c.categorias,textos:c.textos,productos:c.productos.filter(p=>p.publicado&&(p.inventarioPropio||p.estadoIntcomex?.estado!=='noEncontrado')).map(p=>({id:p.id,categoria:p.categoria,nombre:p.nombre,descripcion:p.descripcion,imagen:p.imagen,imagenes:p.imagenes,especificaciones:p.especificaciones,fichaTecnica:p.fichaTecnica,marca:p.marca,codigoFabricante:p.codigoFabricante,destacado:p.destacado,disponibilidad:p.inventarioPropio?'consultar':p.proveedor?(p.proveedor.tipo==='Downloadable'||p.proveedor.tipo==='License'?'consultar':p.proveedor.stock===null?'consultar':p.proveedor.stock===0?'agotado':'proveedor'):p.disponibilidadReferencia,actualizado:p.proveedor?.actualizado??null,precio:p.revisionPrecio&&p.precioManual===null?null:(calcularPrecio(p.costoUsd,c.ajustes,p.precioManual,p.costoCrc)??p.precioReferencia)}))};}
export type CatalogoPublico=ReturnType<typeof publicarCatalogo>;
export function colones(precio:number){return new Intl.NumberFormat('es-CR',{style:'currency',currency:'CRC',minimumFractionDigits:0,maximumFractionDigits:0}).format(precio);}
