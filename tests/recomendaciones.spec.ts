import {test,expect} from '@playwright/test';
import {consultarCatalogo} from '../src/lib/catalogo-consulta';
import {recomendaciones} from '../src/lib/recomendaciones';
import {publicarCatalogo,esquemaCatalogo} from '../src/lib/catalogo-modelo';
import {seleccionInicioEmpresarial} from '../src/lib/soluciones-empresariales';
import {incorporarEmpresariales} from '../src/lib/incorporar-empresariales';
import inicial from '../src/lib/catalogo-inicial.json';
test('recomendaciones excluyen stock bajo, precios pendientes y el producto actual',()=>{
 const c=esquemaCatalogo.parse(inicial),base=c.productos[0];
 c.productos=[15,14,30].map((stock,i)=>({...base,id:'eurocomp-qa-'+i,publicado:true,destacado:true,precioManual:1000,revisionPrecio:false,disponibilidadReferencia:'proveedor',eurocomp:{codigo:'qa-'+i,stock,costo:1,moneda:'USD',actualizado:new Date().toISOString()}}));
 const p=publicarCatalogo(c).productos,r=recomendaciones(p,['eurocomp-qa-0'],'eurocomp-qa-0');
 expect(r.destacados.map(x=>x.id)).toEqual(['eurocomp-qa-0','eurocomp-qa-2']);expect(r.sugeridos.map(x=>x.id)).toEqual(['eurocomp-qa-2']);
 expect(recomendaciones(p.map(x=>({...x,precio:null}))).destacados).toEqual([]);
});
test('recomendados adapta afinidad y respeta precio y búsqueda',()=>{
 const catalogo=publicarCatalogo(esquemaCatalogo.parse(inicial));const base=catalogo.productos[0];
 const c={...catalogo,productos:[{...base,id:'qa-a',destacado:false,precio:1000,marca:'A'},{...base,id:'qa-b',destacado:true,precio:3000,marca:'B'},{...base,id:'qa-c',destacado:false,precio:2000,marca:'A'}]};
 expect(consultarCatalogo(c,new URLSearchParams()).productos[0].id).toBe('qa-b');
 expect(consultarCatalogo(c,new URLSearchParams({orden:'recomendados',explorados:'qa-a,qa-c'})).productos[0].marca).toBe('A');
 expect(consultarCatalogo(c,new URLSearchParams({orden:'menor',explorados:'qa-b'})).productos.map(p=>p.precio)).toEqual([1000,2000,3000]);
 expect(consultarCatalogo(c,new URLSearchParams({orden:'mayor'})).productos.map(p=>p.precio)).toEqual([3000,2000,1000]);
 expect(consultarCatalogo(c,new URLSearchParams({q:'no-match-zzzz'})).total).toBe(0);
});
for(const idioma of ['es','en'])test('recomendaciones temporales sin historial persistente '+idioma,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.goto('/tienda');
 await expect(page.locator('.recomendaciones-preferencias')).toHaveCount(0);
 await page.evaluate(()=>localStorage.setItem('sg-recomendaciones',JSON.stringify({activo:true,items:[{id:'antiguo',fecha:Date.now()}]})));
 await page.reload();
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('sg-recomendaciones'))).toBeNull();
 await page.locator('.shop-producto h3 a').first().click();
 await expect(page.locator('.ficha-compra h1')).toBeVisible();
 expect(await page.evaluate(()=>sessionStorage.getItem('sg-intereses-sesion'))).toBeNull();
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('sg-recomendaciones'))).toBeNull();
 await page.goto('/tienda');
 await expect(page.locator('.shop-orden-trigger')).toHaveAttribute('value','recomendados');
 await page.locator('.shop-orden-trigger').click();await page.locator('[data-orden="menor"]').click();
 await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','false');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});


test('la portada conserva compra directa y destaca cuatro soluciones sin perder productos',()=>{
 const c=publicarCatalogo(incorporarEmpresariales(esquemaCatalogo.parse(inicial)));
 const primera=consultarCatalogo(c,new URLSearchParams()),segunda=consultarCatalogo(c,new URLSearchParams({pagina:'2'}));
 expect(primera.productos).toHaveLength(24);
 expect(primera.productos.slice(0,1).every(p=>p.coleccion!=='empresas')).toBe(true);
 expect(primera.productos.flatMap((p,i)=>p.coleccion==='empresas'?[i+1]:[])).toEqual([2,4,7,10]);
 expect(primera.productos.filter(p=>p.coleccion==='empresas').map(p=>p.id)).toEqual(seleccionInicioEmpresarial.map(p=>p.id));
 expect(segunda.productos.every(p=>p.coleccion!=='empresas')).toBe(true);
 const todos=Array.from({length:primera.paginas},(_,i)=>consultarCatalogo(c,new URLSearchParams({pagina:String(i+1)})).productos).flat();
 expect(todos).toHaveLength(primera.total);expect(new Set(todos.map(p=>p.id)).size).toBe(primera.total);
 const sinPreferido={...c,productos:c.productos.filter(p=>p.id!==seleccionInicioEmpresarial[0].id)};
 const reemplazos=consultarCatalogo(sinPreferido,new URLSearchParams()).productos.filter(p=>p.coleccion==='empresas');
 expect(reemplazos).toHaveLength(4);expect(new Set(reemplazos.map(p=>p.solucionEmpresarial)).size).toBe(4);
 const soloDirectos={...c,productos:c.productos.filter(p=>p.coleccion!=='empresas')};
 expect(consultarCatalogo(soloDirectos,new URLSearchParams()).total).toBe(soloDirectos.productos.length);
 const soloEmpresas=consultarCatalogo(c,new URLSearchParams({categoria:'soluciones-empresariales'}));
 expect(soloEmpresas.productos.every(p=>p.coleccion==='empresas')).toBe(true);
 for(const orden of ['menor','mayor']){
  const precios=consultarCatalogo(c,new URLSearchParams({orden})).productos.map(p=>p.precio!);
  expect(precios).toEqual([...precios].sort((a,b)=>orden==='menor'?a-b:b-a));
 }
});

for(const idioma of ['es','en'])test(`tienda abre con veinte compras directas y cuatro soluciones ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);await page.goto('/tienda');
 await expect(page.locator('.shop-orden-trigger')).toBeEnabled();
 const tarjetas=page.locator('.shop-grid .shop-producto');await expect(tarjetas).toHaveCount(24);
 for(let i=0;i<24;i++)await expect(tarjetas.nth(i).locator([1,3,6,9].includes(i)?'a.producto-agregar':'button.producto-agregar')).toHaveCount(1);
 await expect(page.locator('html')).toHaveAttribute('lang',idioma);
});
