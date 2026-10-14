import {test,expect} from '@playwright/test';
import {consultarCatalogo} from '../src/lib/catalogo-consulta';
import {recomendaciones} from '../src/lib/recomendaciones';
import {publicarCatalogo,esquemaCatalogo} from '../src/lib/catalogo-modelo';
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
 await expect(page.locator('.shop-orden select')).toHaveValue('recomendados');
 await page.locator('.shop-orden select').selectOption('menor');
 await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','false');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
