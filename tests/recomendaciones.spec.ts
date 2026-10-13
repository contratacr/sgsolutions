import {test,expect} from '@playwright/test';
import {recomendaciones} from '../src/lib/recomendaciones';
import {publicarCatalogo,esquemaCatalogo} from '../src/lib/catalogo-modelo';
import inicial from '../src/lib/catalogo-inicial.json';
test('recomendaciones excluyen stock bajo, precios pendientes y el producto actual',()=>{
 const c=esquemaCatalogo.parse(inicial),base=c.productos[0];
 c.productos=[15,14,30].map((stock,i)=>({...base,id:'qa-'+i,publicado:true,destacado:true,precioManual:1000,revisionPrecio:false,disponibilidadReferencia:'proveedor',eurocomp:{codigo:'qa-'+i,stock,costo:1,moneda:'USD',actualizado:new Date().toISOString()}}));
 const p=publicarCatalogo(c).productos,r=recomendaciones(p,['qa-0'],'qa-0');
 expect(r.destacados.map(x=>x.id)).toEqual(['qa-0','qa-2']);expect(r.sugeridos.map(x=>x.id)).toEqual(['qa-2']);
 expect(recomendaciones(p.map(x=>({...x,precio:null}))).destacados).toEqual([]);
});
for(const idioma of ['es','en'])test('preferencias, ficha, búsqueda y borrado '+idioma,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);await page.goto('/tienda');
 const rec=page.locator('.recomendaciones');await expect(rec).toBeVisible();await expect(rec.locator('.shop-producto').first()).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('sg-recomendaciones'))).toBeNull();
 await rec.locator('summary').click();await rec.getByRole('checkbox').check();
 await rec.locator('.shop-producto h3 a').first().click();await expect(page.locator('.ficha-compra h1')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sg-recomendaciones')??'{}').items?.length)).toBeGreaterThan(0);
 await page.goto('/tienda');await expect(page.getByRole('heading',{name:idioma==='es'?'Vistos recientemente':'Recently viewed',exact:true})).toBeVisible();
 await page.locator('#buscar-equipo').fill('AMD');await expect(rec).toBeHidden();await page.locator('#buscar-equipo').fill('');await expect(rec).toBeVisible();
 await rec.locator('summary').click();await rec.getByRole('button',{name:idioma==='es'?'Borrar historial y desactivar':'Clear history and disable'}).click();
 expect(await page.evaluate(()=>localStorage.getItem('sg-recomendaciones'))).toBeNull();
 await expect(page.getByRole('heading',{name:idioma==='es'?'Vistos recientemente':'Recently viewed',exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await rec.locator('h2').first().scrollIntoViewIfNeeded();
 await expect.poll(()=>rec.locator('.shop-foto img').first().evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
 await page.screenshot({path:'.privado/evidencias/recomendaciones-'+idioma+'-'+(page.viewportSize()?.width)+'.png',fullPage:false});
});
