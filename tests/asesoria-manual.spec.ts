import {test,expect} from '@playwright/test';
import {esquemaCatalogo,publicarCatalogo,calcularPrecio} from '../src/lib/catalogo-modelo';
import {migrarCatalogoManual,catalogoPublicoManual} from '../src/lib/catalogo-manual';
import base from '../src/lib/catalogo-base.json';

test('migración manual conserva productos, precios y decisiones posteriores',()=>{
 const original=esquemaCatalogo.parse(base),antes=structuredClone(original);
 const manual=migrarCatalogoManual(original),publico=publicarCatalogo(manual);
 expect(original).toEqual(antes);
 expect(manual.productos.length).toBe(original.productos.length);
 for(const c of publico.categorias)expect(publico.productos.filter(p=>p.categoria===c.id)).toHaveLength(5);
 expect(publico.productos.every(p=>p.disponibilidad==='consultar')).toBe(true);
 expect(publico.productos.map(p=>p.id).sort()).toEqual(catalogoPublicoManual(publicarCatalogo(original)).productos.map(p=>p.id).sort());
 for(const p of manual.productos){const previo=original.productos.find(x=>x.id===p.id)!;expect(p.precioManual).toBe(previo.revisionPrecio&&previo.precioManual===null?null:calcularPrecio(previo.costoUsd,original.ajustes,previo.precioManual,previo.costoCrc)??previo.precioReferencia);expect(p.proveedor).toBeUndefined();expect(p.estadoIntcomex).toBeUndefined();}
 const extra=manual.productos.find(p=>!p.publicado)!;extra.publicado=true;extra.precioManual=123000;
 expect(migrarCatalogoManual(manual)).toEqual(manual);
 expect(catalogoPublicoManual(publicarCatalogo(manual)).productos.some(p=>p.id===extra.id)).toBe(true);
});

for(const idioma of ['es','en'])test(`asesoría, selección y regreso al pedido ${idioma}`,async({page,context},info)=>{
 const errores:string[]=[];page.on('pageerror',e=>errores.push(e.message));
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.goto('/soluciones');
 await expect(page.locator('html')).toHaveAttribute('lang',idioma);
 await page.locator('.medicion-aviso button').first().click();
 await expect(page.locator('.asesoria-hero h1')).toHaveText('SG Solutions');

 await page.screenshot({path:`/tmp/sg-asesoria-${idioma}-${info.project.name}.png`});
 await page.locator('.shop-categorias button').nth(1).click();
 await expect(page.locator('.shop-producto')).toHaveCount(5);
 await page.locator('.shop-producto').first().scrollIntoViewIfNeeded();
 await page.screenshot({path:`/tmp/sg-productos-${idioma}-${info.project.name}.png`});
 const producto=page.locator('.shop-producto').first(),consulta=producto.locator('a[href^="https://wa.me/"]');
 await expect(consulta).toHaveAttribute('rel','noopener noreferrer');
 const url=new URL((await consulta.getAttribute('href'))!);
 expect(url.pathname).toBe('/50664399417');
 expect(url.searchParams.get('text')).toContain(idioma==='es'?'Me interesan estos productos':'I am interested in these products');
 const codigo=await producto.locator('.shop-codigo').innerText();
 expect(url.searchParams.get('text')).toContain(codigo.split(' ').at(-1));
 await context.route('**/api/asesoria',route=>route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({referencia:'SG-PRUEBA'})}));
 await context.route('https://wa.me/**',route=>route.fulfill({status:200,body:'WhatsApp test — no message sent'}));
 const popupPromise=page.waitForEvent('popup');await consulta.click();const popup=await popupPromise;await popup.waitForURL("https://wa.me/**");await popup.close();
 await page.getByRole('button',{name:idioma==='es'?'Abrir carrito':'Open cart',exact:true}).click();
 await expect(page.locator('.carrito-lineas li')).toHaveCount(1);
 await expect(page.locator('.carrito-resumen a[href^="https://wa.me/"]')).toBeVisible();
 await expect(page.locator('.carrito-resumen a[href="/finalizar-compra"]')).toHaveCount(0);
 await page.goto('/finalizar-compra');
 await expect(page.locator('main form')).toHaveCount(0);
 await expect(page.locator('.compra-paso-asesoria button')).toHaveCount(0);
 await page.reload();await expect(page.locator('main form')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 expect(errores).toEqual([]);
});

test('rutas de importación retiradas',async({request})=>{
 for(const ruta of ['/panel/catalogo/importar','/panel/catalogo/sincronizar'])expect((await request.get(ruta)).status()).toBe(404);
});
