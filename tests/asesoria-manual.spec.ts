import {completarDatosAsesoria} from './datos-asesoria-fixture';
import {test,expect} from '@playwright/test';
import {esquemaCatalogo,publicarCatalogo,calcularPrecio} from '../src/lib/catalogo-modelo';
import {migrarCatalogoManual,catalogoPublicoManual} from '../src/lib/catalogo-manual';
import base from '../src/lib/catalogo-base.json';

test('migración manual conserva productos, precios y decisiones posteriores',()=>{
 const original=esquemaCatalogo.parse(base);delete original.gestion;const antes=structuredClone(original);
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

for(const idioma of ['es','en'])test(`asesoría opcional y compra directa ${idioma}`,async({page,context})=>{
 const errores:string[]=[];page.on('pageerror',e=>errores.push(e.message));
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await context.route('**/api/asesoria',r=>r.fulfill({status:201,json:{referencia:'SG-PRUEBA'}}));
 await context.route('https://wa.me/**',r=>r.fulfill({status:200,body:'WhatsApp simulado'}));
 await page.goto('/tienda');await expect(page.locator('.asesoria-hero h1')).toHaveText(idioma==='es'?'Tienda':'Store');
 await page.locator('.asesoria-hero-acciones>.boton').first().click();await completarDatosAsesoria(page);
 const ventana=page.waitForEvent('popup');await page.locator('.contacto-asesoria form>button').click();const popup=await ventana;await popup.waitForURL('https://wa.me/**');await popup.close();
 await expect(page).toHaveURL(/\/tienda$/);
 await page.locator('.shop-producto .guardar-seleccion').first().click();await page.getByRole('button',{name:idioma==='es'?'Abrir carrito':'Open cart',exact:true}).click();
 await expect(page.locator('.carrito-lineas li')).toHaveCount(1);await page.locator('.carrito-resumen a[href="/finalizar-compra"]').click();
 await expect(page.locator('main form input[name=nombre]')).toBeVisible();
 await page.reload();await expect(page.locator('html')).toHaveAttribute('lang',idioma);expect(errores).toEqual([]);
});

test('rutas de importación retiradas',async({request})=>{
 for(const ruta of ['/panel/catalogo/importar','/panel/catalogo/sincronizar'])expect((await request.get(ruta)).status()).toBe(404);
});
