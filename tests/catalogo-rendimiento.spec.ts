import {catalogoTienda,clasificacionesDeProducto} from '../src/lib/soluciones-empresariales';
import {test,expect} from '@playwright/test';
import {resumenCatalogo,consultarCatalogo} from '../src/lib/catalogo-consulta';
import {asignarRutasProductos} from '../src/lib/rutas-productos';
import {publicarCatalogo,esquemaCatalogo} from '../src/lib/catalogo-modelo';
import inicial from '../src/lib/catalogo-inicial.json';
test('los conteos conservan categorías y marcas canónicas con los límites reales',()=>{
 const c=catalogoTienda(publicarCatalogo(esquemaCatalogo.parse(inicial)));
 c.productos=[...c.productos,{...c.productos[0],id:'sin-marca',marca:''}];
 const resumen=resumenCatalogo(c);
 expect(resumen.total).toBe(c.productos.length);
 expect(new Set(resumen.marcas)).toEqual(new Set(c.productos.map(p=>p.marca).filter(Boolean)));
 for(const [marca,conteo] of Object.entries(resumen.conteosMarcas))expect(conteo.total).toBe(c.productos.filter(p=>p.marca===marca).length);
 for(const [id,total] of Object.entries(resumen.conteos))expect(total).toBe(c.productos.filter(p=>clasificacionesDeProducto(p).some(x=>x.categoria===id)).length);
 for(const sub of resumen.subcategorias)expect(sub.cantidad).toBe(c.productos.filter(p=>clasificacionesDeProducto(p).some(x=>x.categoria===sub.categoria&&x.subcategoria?.es===sub.nombre.es)).length);
 const precios=c.productos.flatMap(p=>p.precio!==null?[p.precio]:[]);
 expect(resumen.precioMinimo).toBe(Math.min(...precios));expect(resumen.precioMaximo).toBe(Math.max(...precios));
 expect(resumenCatalogo({...c,productos:[]})).toMatchObject({precioMinimo:0,precioMaximo:0,total:0,marcas:[]});
});
test('el catálogo grande se recorre de forma lineal y las rutas persistidas no se recalculan',()=>{
 const c=publicarCatalogo(esquemaCatalogo.parse(inicial));const base=c.productos[0];let lecturas=0;
 const productos=Array.from({length:20000},(_,i)=>new Proxy({...base,id:'p-'+i,slug:'producto-'+i,marca:'marca-'+i%100},{get(target,key,receiver){if(key==='marca')lecturas++;return Reflect.get(target,key,receiver);}}));
 expect(resumenCatalogo({...c,productos}).total).toBe(20000);
 expect(lecturas).toBeLessThan(20000*4);
 expect(asignarRutasProductos(productos)).toBe(productos);
});
test('buscar vacío conserva orden y evita lecturas extra de descripciones',()=>{
 const c=publicarCatalogo(esquemaCatalogo.parse(inicial));let lecturas=0;
 const productos=c.productos.map(p=>new Proxy(p,{get(target,key,receiver){if(key==='descripcion')lecturas++;return Reflect.get(target,key,receiver);}}));
 const pagina=consultarCatalogo({...c,productos},new URLSearchParams({orden:'menor'}));
 expect(pagina.total).toBe(productos.length);expect(lecturas).toBe(productos.length);
 expect(pagina.productos).toEqual([...catalogoTienda(c).productos].sort((a,b)=>(a.precio??Infinity)-(b.precio??Infinity)).slice(0,24));
});
