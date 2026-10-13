import {test,expect} from '@playwright/test';
import {resumenCatalogo,consultarCatalogo} from '../src/lib/catalogo-consulta';
import {asignarRutasProductos} from '../src/lib/rutas-productos';
import {publicarCatalogo,esquemaCatalogo,type CatalogoPublico} from '../src/lib/catalogo-modelo';
import inicial from '../src/lib/catalogo-inicial.json';
function referencia(c:CatalogoPublico){return {conteosMarcas:Object.fromEntries([...new Set(c.productos.map(p=>p.marca))].map(m=>[m,{total:c.productos.filter(p=>p.marca===m).length,categorias:Object.fromEntries(c.categorias.map(cat=>[cat.id,c.productos.filter(p=>p.marca===m&&p.categoria===cat.id).length]))}])),subcategorias:[...new Map(c.productos.filter(p=>p.subcategoria).map(p=>[p.categoria+'|'+p.subcategoria!.es,{categoria:p.categoria,nombre:p.subcategoria!}])).values()],categorias:c.categorias,textos:c.textos,total:c.productos.length,marcas:[...new Set(c.productos.map(p=>p.marca).filter(Boolean))],conteos:Object.fromEntries(c.categorias.map(cat=>[cat.id,c.productos.filter(p=>p.categoria===cat.id).length]))};}
test('los conteos lineales conservan marcas, categorías vacías, orden y subcategorías',()=>{
 const c=publicarCatalogo(esquemaCatalogo.parse(inicial));
 c.productos=[...c.productos,{...c.productos[0],id:'sin-marca',marca:''}];
 expect(resumenCatalogo(c)).toEqual(referencia(c));
 expect(resumenCatalogo({...c,productos:[]})).toEqual(referencia({...c,productos:[]}));
});
test('el catálogo grande se recorre de forma lineal y las rutas persistidas no se recalculan',()=>{
 const c=publicarCatalogo(esquemaCatalogo.parse(inicial));const base=c.productos[0];let lecturas=0;
 const productos=Array.from({length:20000},(_,i)=>new Proxy({...base,id:'p-'+i,slug:'producto-'+i,marca:'marca-'+i%100},{get(target,key,receiver){if(key==='marca')lecturas++;return Reflect.get(target,key,receiver);}}));
 expect(resumenCatalogo({...c,productos}).total).toBe(20000);
 expect(lecturas).toBeLessThan(20000*4);
 expect(asignarRutasProductos(productos)).toBe(productos);
});
test('buscar vacío conserva orden y páginas sin normalizar descripciones',()=>{
 const c=publicarCatalogo(esquemaCatalogo.parse(inicial));let lecturas=0;
 const productos=c.productos.map(p=>new Proxy(p,{get(target,key,receiver){if(key==='descripcion')lecturas++;return Reflect.get(target,key,receiver);}}));
 const pagina=consultarCatalogo({...c,productos},new URLSearchParams({orden:'menor'}));
 expect(pagina.total).toBe(productos.length);expect(lecturas).toBe(0);
 expect(pagina.productos).toEqual([...c.productos].sort((a,b)=>(a.precio??Infinity)-(b.precio??Infinity)).slice(0,24));
 consultarCatalogo({...c,productos},new URLSearchParams({q:'cámara',idioma:'en'}));expect(lecturas).toBeGreaterThan(0);
});
