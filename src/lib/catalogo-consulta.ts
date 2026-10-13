import {traducir,type CatalogoPublico} from './catalogo-modelo';
export function resumenCatalogo(c:CatalogoPublico){
 // One pass over products; the previous nested filters scanned the complete
 // catalogue once per brand/category combination on every page render.
 const conteos:Record<string,number>=Object.fromEntries(c.categorias.map(cat=>[cat.id,0]));
 const marcas=new Map<string,{total:number;categorias:Record<string,number>}>();
 const subcategorias=new Map<string,{categoria:string;nombre:NonNullable<CatalogoPublico['productos'][number]['subcategoria']>}>();
 for(const p of c.productos){
  let marca=marcas.get(p.marca);
  if(!marca){marca={total:0,categorias:Object.fromEntries(c.categorias.map(cat=>[cat.id,0]))};marcas.set(p.marca,marca);}
  marca.total++;
  if(p.categoria in conteos){conteos[p.categoria]++;marca.categorias[p.categoria]++;}
  if(p.subcategoria)subcategorias.set(p.categoria+'|'+p.subcategoria.es,{categoria:p.categoria,nombre:p.subcategoria});
 }
 return {conteosMarcas:Object.fromEntries(marcas),subcategorias:[...subcategorias.values()],categorias:c.categorias,textos:c.textos,total:c.productos.length,marcas:[...marcas.keys()].filter(Boolean),conteos};
}
function normalizar(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
export function consultarCatalogo(c:CatalogoPublico,params:URLSearchParams){
 const idioma=params.get('idioma')==='en'?'en':'es',categoria=params.get('categoria')??'todos',marca=params.get('marca')??'',subcategoria=params.get('subcategoria')??'',q=normalizar((params.get('q')??'').slice(0,150)),orden=params.get('orden')??'recomendados';
 const marcas=params.getAll('marcas').filter(Boolean).slice(0,100);if(marca)marcas.push(marca);
 const precio=(key:string)=>{const v=params.get(key);if(!v)return null;const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=1000000000?n:null;};
 const min=precio('min'),max=precio('max');
 const visibles=c.productos.filter(p=>(categoria==='todos'||p.categoria===categoria)&&(!subcategoria||p.subcategoria?.es===subcategoria)&&(!marcas.length||marcas.includes(p.marca))&&(min===null||(p.precio!==null&&p.precio>=min))&&(max===null||(p.precio!==null&&p.precio<=max))&&(!q||normalizar(`${traducir(p.nombre,idioma)} ${traducir(p.descripcion,idioma)} ${p.marca} ${p.codigoFabricante} ${traducir(c.categorias.find(cat=>cat.id===p.categoria)!.nombre,idioma)}`).includes(q)));
 const ids=(params.get('explorados')??'').split(',').filter(id=>/^[a-z0-9][a-z0-9-]{0,59}$/.test(id)).slice(0,20);
 const contexto=ids.flatMap(id=>{const p=c.productos.find(x=>x.id===id);return p?[p]:[];});
 const puntuacion=(p:CatalogoPublico['productos'][number])=>Number(p.destacado)+contexto.reduce((n,x,i)=>n+((x.categoria===p.categoria?3:0)+(x.marca&&x.marca===p.marca?1:0))/(i+1),0);
 visibles.sort((a,b)=>orden==='menor'?(a.precio??Infinity)-(b.precio??Infinity):orden==='mayor'?(b.precio??-Infinity)-(a.precio??-Infinity):orden==='nombre'?traducir(a.nombre,idioma).localeCompare(traducir(b.nombre,idioma)):puntuacion(b)-puntuacion(a)||a.id.localeCompare(b.id));
 const paginas=Math.max(1,Math.ceil(visibles.length/24)),solicitada=Number(params.get('pagina')??1),pagina=Math.min(paginas,Math.max(1,Number.isSafeInteger(solicitada)?solicitada:1));
 return {productos:visibles.slice((pagina-1)*24,pagina*24),total:visibles.length,pagina,paginas};
}
export type ResumenCatalogo=ReturnType<typeof resumenCatalogo>;
export type PaginaCatalogo=ReturnType<typeof consultarCatalogo>;
