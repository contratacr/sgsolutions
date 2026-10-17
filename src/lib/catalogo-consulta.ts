import {nombreMarca} from './marcas-nombres';
import {catalogoTienda,solucionesEmpresariales} from './soluciones-empresariales';
import {prepararBusqueda,coincidenciaBusqueda} from './busqueda-catalogo';
import {traducir,type CatalogoPublico} from './catalogo-modelo';
export function resumenCatalogo(c:CatalogoPublico){
 c=catalogoTienda(c);
 // One pass over products; the previous nested filters scanned the complete
 // catalogue once per brand/category combination on every page render.
 const conteos:Record<string,number>=Object.fromEntries(c.categorias.map(cat=>[cat.id,0]));
 let precioMaximo=0,precioMinimo=Infinity;
 const marcas=new Map<string,{total:number;categorias:Record<string,number>;subcategorias:Record<string,number>}>();
 const subcategorias=new Map<string,{categoria:string;nombre:NonNullable<CatalogoPublico['productos'][number]['subcategoria']>;cantidad:number}>();
 for(const p of c.productos){
  if(p.precio!==null&&Number.isFinite(p.precio)){precioMaximo=Math.max(precioMaximo,p.precio);precioMinimo=Math.min(precioMinimo,p.precio);}
  let marca=marcas.get(p.marca);
  if(!marca){marca={total:0,categorias:Object.fromEntries(c.categorias.map(cat=>[cat.id,0])),subcategorias:{}};marcas.set(p.marca,marca);}
  marca.total++;
  if(p.categoria in conteos){conteos[p.categoria]++;marca.categorias[p.categoria]++;}
  if(p.subcategoria){const clave=p.categoria+'|'+p.subcategoria.es;subcategorias.set(clave,{categoria:p.categoria,nombre:p.subcategoria,cantidad:(subcategorias.get(clave)?.cantidad??0)+1});marca.subcategorias[clave]=(marca.subcategorias[clave]??0)+1;}
 }
 return {precioMinimo:Number.isFinite(precioMinimo)?precioMinimo:0,precioMaximo,conteosMarcas:Object.fromEntries(marcas),subcategorias:[...subcategorias.values()].sort((a,b)=>(a.categoria==='soluciones-empresariales'?solucionesEmpresariales.findIndex(x=>x.nombre.es===a.nombre.es):999)-(b.categoria==='soluciones-empresariales'?solucionesEmpresariales.findIndex(x=>x.nombre.es===b.nombre.es):999)),categorias:c.categorias,textos:c.textos,total:c.productos.length,marcas:[...marcas.keys()].filter(Boolean),conteos};
}
function normalizar(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
export function consultarCatalogo(c:CatalogoPublico,params:URLSearchParams,popularidad:Record<string,number>={}){
 c=catalogoTienda(c);
 const idioma=params.get('idioma')==='en'?'en':'es',categoria=params.get('coleccion')==='empresas'?'soluciones-empresariales':params.get('categoria')??'todos',marca=nombreMarca(params.get('marca')??''),subcategoria=params.get('subcategoria')??'',q=normalizar((params.get('q')??'').slice(0,150)),orden=params.get('orden')??'recomendados';
 const marcas=params.getAll('marcas').filter(Boolean).slice(0,100).map(nombreMarca);if(marca)marcas.push(marca);
 const precio=(key:string)=>{const v=params.get(key);if(!v)return null;const n=Number(v);return Number.isFinite(n)&&n>=0&&n<=1000000000?n:null;};
 const min=precio('min'),max=precio('max');
 const busqueda=prepararBusqueda(q);
 const relevancia=new Map(q?c.productos.map(p=>[p.id,coincidenciaBusqueda(p,busqueda,c.categorias.find(cat=>cat.id===p.categoria)?.nombre.es??'')]):[]);
 const candidatos=c.productos.filter(p=>(categoria==='todos'||p.categoria===categoria)&&(!subcategoria||p.subcategoria?.es===subcategoria)&&(!marcas.length||marcas.includes(p.marca))&&(!q||(relevancia.get(p.id)??0)>0));
 const visibles=candidatos.filter(p=>(min===null||(p.precio!==null&&p.precio>=min))&&(max===null||(p.precio!==null&&p.precio<=max)));

 const ids=(params.get('explorados')??'').split(',').filter(id=>/^[a-z0-9][a-z0-9-]{0,59}$/.test(id)).slice(0,20);
 const contexto=ids.flatMap(id=>{const p=c.productos.find(x=>x.id===id);return p?[p]:[];});
 const puntuacion=(p:CatalogoPublico['productos'][number])=>Number(p.destacado)+contexto.reduce((n,x,i)=>n+((x.categoria===p.categoria?3:0)+(x.marca&&x.marca===p.marca?1:0))/(i+1),0);
 visibles.sort((a,b)=>orden==='menor'?(a.precio??Infinity)-(b.precio??Infinity):orden==='mayor'?(b.precio??-Infinity)-(a.precio??-Infinity):orden==='nombre'?traducir(a.nombre,idioma).localeCompare(traducir(b.nombre,idioma)):(q?(relevancia.get(b.id)??0)-(relevancia.get(a.id)??0):0)||puntuacion(b)-puntuacion(a)||(popularidad[b.id]??0)-(popularidad[a.id]??0)||a.id.localeCompare(b.id));
 const paginas=Math.max(1,Math.ceil(visibles.length/24)),solicitada=Number(params.get('pagina')??1),pagina=Math.min(paginas,Math.max(1,Number.isSafeInteger(solicitada)?solicitada:1));
 const precios=candidatos.flatMap(p=>p.precio!==null&&Number.isFinite(p.precio)?[p.precio]:[]);
 const rangoPrecios=precios.reduce((r,p)=>({minimo:Math.min(r.minimo,p),maximo:Math.max(r.maximo,p)}),{minimo:Infinity,maximo:0});
 if(!Number.isFinite(rangoPrecios.minimo))rangoPrecios.minimo=0;
 return {rangoPrecios,productos:visibles.slice((pagina-1)*24,pagina*24),total:visibles.length,pagina,paginas};
}
export type ResumenCatalogo=ReturnType<typeof resumenCatalogo>;
export type PaginaCatalogo=ReturnType<typeof consultarCatalogo>;
