import {test,expect} from '@playwright/test';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import base from '../src/lib/catalogo-base.json';
import {esquemaCatalogo} from '../src/lib/catalogo-modelo';
const archivo='.privado/contenido-pruebas/catalogo.json';
test.afterEach(async()=>{await unlink(archivo).catch(()=>{});});
for(const idioma of ['es','en'])test('oferta se guarda y se usa en tarjeta, ficha y carrito '+idioma,async({page,context},info)=>{
 const c=esquemaCatalogo.parse(base),producto=c.productos.find(p=>p.publicado)!;
 producto.precioManual=2500;producto.precioDescuento=null;producto.revisionPrecio=false;producto.eurocomp={codigo:producto.codigoEurocomp!,stock:50,costo:1,moneda:'USD',actualizado:new Date().toISOString()};c.productos=[producto];
 await writeFile(archivo,JSON.stringify({contenido:c,revision:1}),{mode:0o600});const {token}=JSON.parse(await readFile('.privado/contenido-pruebas/sesion.json','utf8'));
 await context.addCookies([{name:'sg-admin-local',value:token,domain:'127.0.0.1',path:'/'},{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.goto('/panel/catalogo');await page.locator('.admin-producto-fila button').first().click();
 const campo=page.getByLabel(idioma==='es'?'Precio de oferta (₡) Opcional':'Sale price (₡) Optional');await campo.fill('3000');await expect(page.locator('.admin-producto-editor [role=alert]')).toBeVisible();
 await campo.fill('1500');await page.locator('.admin-actions button').first().click();await expect.poll(async()=>JSON.parse(await readFile(archivo,'utf8')).contenido.productos[0].precioDescuento).toBe(1500);
 await page.goto('/tienda');await expect(page.locator('.shop-precio del')).toContainText('2');await expect(page.locator('.shop-precio .precio-producto-oferta strong')).toContainText('1');await expect(page.locator('.shop-precio .precio-producto-oferta strong')).toHaveCSS('color','rgb(198, 40, 50)');await page.locator('.shop-producto').filter({hasText:producto.codigoFabricante}).locator('.shop-precio').screenshot({path:info.outputPath('oferta.png')});
 await page.locator('.shop-producto').filter({hasText:producto.codigoFabricante}).locator('h3 a').click();await expect(page.locator('.ficha-precio del')).toBeVisible();await expect(page.locator('.ficha-precio strong')).toContainText('1');await expect(page.locator('.ficha-precio strong')).toHaveCSS('color','rgb(198, 40, 50)');
 await page.locator('.ficha-agregar').click();await page.locator('.carrito-confirmacion').getByRole('button',{name:idioma==='es'?'Ver carrito':'View cart',exact:true}).click();await expect(page.locator('.carrito-producto del')).toBeVisible();
 await expect(page.locator('.carrito-resumen>div>strong').last()).toHaveText('₡1\u00a0500');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
