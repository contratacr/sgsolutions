import type {CatalogoPublico} from './catalogo-modelo';
type Producto=CatalogoPublico['productos'][number];
/** Only accepts the public, stock-filtered catalogue. Never reads supplier costs. */
export function recomendaciones(productos:Producto[],ids:string[]=[],actual?:string){
 const disponibles=productos.filter(p=>p.precio!==null&&p.disponibilidad!=='agotado');
 const mapa=new Map(disponibles.map(p=>[p.id,p]));
 const recientes=[...new Set(ids)].slice(0,20).flatMap(id=>mapa.has(id)?[mapa.get(id)!]:[]);
 const contexto=actual?disponibles.filter(p=>p.id===actual):recientes;
 const vistos=new Set([...ids,...(actual?[actual]:[])]);
 const afinidad=(p:Producto)=>contexto.reduce((n,x,i)=>n+(x.categoria===p.categoria?3:0)/(i+1)+(x.marca&&x.marca===p.marca?1:0)/(i+1),0);
 const sugeridos=disponibles.filter(p=>!vistos.has(p.id)&&afinidad(p)>0).sort((a,b)=>afinidad(b)-afinidad(a)||Number(b.destacado)-Number(a.destacado)).slice(0,actual?8:4);
 const estrellas=disponibles.filter(p=>p.destacado).slice(0,8);
 // No invented bestseller label: diversify discovery when no stars are selected.
 const categorias=new Set<string>();
 const descubrir=disponibles.filter(p=>{if(categorias.has(p.categoria))return false;categorias.add(p.categoria);return true;}).slice(0,4);
 return {destacados:estrellas,descubrir,recientes:recientes.filter(p=>p.id!==actual).slice(0,4),sugeridos};
}
