import {traducir,type CatalogoPublico} from './catalogo-modelo';
import {catalogoTienda} from './soluciones-empresariales';
export function detalleEstadisticasCatalogo(catalogo:CatalogoPublico,vistas:{id:string;cantidad:number}[],idioma:string){
 const c=catalogoTienda(catalogo),indice=new Map(c.productos.flatMap(p=>[[p.id,p],...(p.slug?[[p.slug,p] as const]:[])] as const));
 const productos=new Map<string,{id:string;producto:CatalogoPublico['productos'][number]|undefined;cantidad:number}>();
 for(const f of vistas){const p=indice.get(f.id),id=p?.id??f.id;const fila=productos.get(id)??{id,producto:p,cantidad:0};fila.cantidad+=f.cantidad;productos.set(id,fila);}
 const categorias=new Map<string,{id:string;nombre:string;cantidad:number}>(),subcategorias=new Map<string,{id:string;nombre:string;categoria:string;cantidad:number}>();let sinClasificar=0;
 for(const f of productos.values()){
  const p=f.producto,cat=c.categorias.find(x=>x.id===p?.categoria);if(!p||!cat){sinClasificar+=f.cantidad;continue;}
  const fila=categorias.get(cat.id)??{id:cat.id,nombre:traducir(cat.nombre,idioma),cantidad:0};fila.cantidad+=f.cantidad;categorias.set(cat.id,fila);
  if(p.subcategoria){const id=cat.id+'|'+p.subcategoria.es,sub=subcategorias.get(id)??{id,nombre:traducir(p.subcategoria,idioma),categoria:fila.nombre,cantidad:0};sub.cantidad+=f.cantidad;subcategorias.set(id,sub);}
 }
 const ordenar=<T extends {cantidad:number}>(filas:Iterable<T>)=>[...filas].sort((a,b)=>b.cantidad-a.cantidad);
 return {productos:ordenar(productos.values()),categorias:ordenar(categorias.values()),subcategorias:ordenar(subcategorias.values()),sinClasificar};
}
