import {traducir,type CatalogoPublico} from './catalogo-modelo';
export function resumenCatalogo(c:CatalogoPublico){return {categorias:c.categorias,textos:c.textos,total:c.productos.length,marcas:[...new Set(c.productos.map(p=>p.marca).filter(Boolean))],conteos:Object.fromEntries(c.categorias.map(cat=>[cat.id,c.productos.filter(p=>p.categoria===cat.id).length]))};}
function normalizar(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
export function consultarCatalogo(c:CatalogoPublico,params:URLSearchParams){
 const idioma=params.get('idioma')==='en'?'en':'es',categoria=params.get('categoria')??'todos',marca=params.get('marca')??'',q=normalizar((params.get('q')??'').slice(0,150)),orden=params.get('orden')??'destacados';
 const visibles=c.productos.filter(p=>(categoria==='todos'||p.categoria===categoria)&&(!marca||p.marca===marca)&&normalizar(`${traducir(p.nombre,idioma)} ${traducir(p.descripcion,idioma)} ${p.marca} ${p.codigoFabricante} ${traducir(c.categorias.find(cat=>cat.id===p.categoria)!.nombre,idioma)}`).includes(q));
 visibles.sort((a,b)=>orden==='menor'?(a.precio??Infinity)-(b.precio??Infinity):orden==='mayor'?(b.precio??-Infinity)-(a.precio??-Infinity):orden==='nombre'?traducir(a.nombre,idioma).localeCompare(traducir(b.nombre,idioma)):Number(b.destacado)-Number(a.destacado));
 const paginas=Math.max(1,Math.ceil(visibles.length/24)),solicitada=Number(params.get('pagina')??1),pagina=Math.min(paginas,Math.max(1,Number.isSafeInteger(solicitada)?solicitada:1));
 return {productos:visibles.slice((pagina-1)*24,pagina*24),total:visibles.length,pagina,paginas};
}
export type ResumenCatalogo=ReturnType<typeof resumenCatalogo>;
export type PaginaCatalogo=ReturnType<typeof consultarCatalogo>;
