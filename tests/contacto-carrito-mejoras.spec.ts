import {completarDatosAsesoria,contactoPrueba} from './datos-asesoria-fixture';
import {test,expect} from '@playwright/test';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {normalizarTelefonoWhatsApp} from '../src/lib/telefono-whatsapp';

test('números nacionales e internacionales sin aceptar texto ni códigos incompletos',()=>{
 for(const [entrada,esperado] of [['8888 8888','50688888888'],['+506 8888-8888','50688888888'],['+1 (212) 555-1234','12125551234'],['0034 612 345 678','34612345678'],['+44 20 7946 0958','442079460958']])expect(normalizarTelefonoWhatsApp(entrada)).toBe(esperado);
 for(const entrada of ['+506','+506 1234567','+506 123456789','abc','8888','+506+88888888','1234567890123456'])expect(normalizarTelefonoWhatsApp(entrada)).toBeNull();
});
for(const idioma of ['es','en'])test(`datos previos, validación y confirmación del carrito ${idioma}`,async({page,context})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 let datos:Record<string,unknown>|null=null,fallar=false;
 await page.route('**/api/asesoria',async r=>{datos=r.request().postDataJSON();await r.fulfill({status:fallar?503:201,json:fallar?{error:'no_disponible'}:{referencia:'SG-0001'}});});
 await page.addInitScript(()=>{window.open=()=>null;});
 await page.goto('/soluciones');await page.locator('.asesoria-hero-acciones>.boton').first().click();
 const formulario=page.locator('.contacto-asesoria form');
 await expect(page.getByRole('dialog').getByRole('button',{name:idioma==='es'?'Cerrar':'Close',exact:true})).toBeVisible();
 await expect(formulario.locator('[name=telefono]')).toHaveValue('+506 ');
 await formulario.locator('button').click();await expect(formulario.locator('[name=nombre]')).toBeFocused();
 await expect(formulario.locator('[aria-invalid=true]')).toHaveCount(5);
 await completarDatosAsesoria(page);
 await formulario.locator('[name=nombre]').fill('Cliente QA');await formulario.locator('[name=telefono]').fill('8888 8888');await formulario.locator('[name=consentimiento]').check();
 fallar=true;await formulario.locator('button').click();await expect(formulario.locator('[role=alert]')).toBeVisible();await expect(formulario.locator('[name=nombre]')).toHaveValue('Cliente QA');
 fallar=false;await formulario.locator('button').click();await expect(page.locator('.contacto-asesoria')).toHaveCount(0);
 expect(datos).toMatchObject({contacto:{telefono:'50688888888',necesidad:''}});

 await page.locator('.shop-producto .guardar-seleccion').first().click();
 await expect(page.locator('.carrito-confirmacion [role=status]')).toContainText(idioma==='es'?'Agregado al carrito':'Added to cart');
 await page.locator('.carrito-confirmacion').getByRole('button',{name:idioma==='es'?'Ver carrito':'View cart',exact:true}).click();
 await expect(page.locator('.carrito-panel')).toBeVisible();await expect(page.locator('.carrito-lineas li')).toHaveCount(1);
 await page.locator('.carrito-cabecera button').click();await expect(page.locator('.carrito-panel')).toHaveCount(0);
 await page.screenshot({path:`/tmp/sg-contacto-mejorado-${idioma}-${test.info().project.name}.png`});
 await page.goto('/');await expect(page.locator('.portal-menu')).toContainText(idioma==='es'?'Para empresas':'For businesses');await expect(page.locator('.portal-menu')).toContainText(idioma==='es'?'Ver planes':'View plans');
});

test('WhatsApp conserva la app y abre una página útil durante la preparación',async({page,context})=>{
 let liberar!:()=>void;const espera=new Promise<void>(r=>liberar=r);
 await context.route('**/api/asesoria',async r=>{await espera;await r.fulfill({status:201,json:{referencia:'SG-0002'}});});
 await context.route('https://wa.me/**',r=>r.fulfill({status:200,body:'WhatsApp simulado: no se envía ningún mensaje'}));
 await page.goto('/soluciones');await page.locator('.shop-producto .boton-naranja').first().click();await completarDatosAsesoria(page);const popupPromesa=page.waitForEvent('popup');
 await page.locator('.contacto-asesoria form>button').click();const popup=await popupPromesa;
 await popup.waitForURL('**/soluciones');await expect(popup.locator('main')).toBeVisible();await expect(page).toHaveURL(/\/soluciones$/);
 liberar();await popup.waitForURL('https://wa.me/**');await popup.close();
 await expect(page.locator('.shop-grid')).toBeVisible();await expect(page).toHaveURL(/\/soluciones$/);
});

test('pocas marcas llenan la ventana durante todo el ciclo',async({page})=>{
 test.skip(process.env.SG_TEST_ALTAS!=='1','Requiere catálogo local aislado');
 const archivo='.privado/admin-local/catalogo.json',original=await readFile(archivo,'utf8');
 const catalogo=JSON.parse(original);catalogo.contenido.gestion='manual';
 catalogo.contenido.productos=catalogo.contenido.productos.filter((p:{id:string})=>p.id==='portatil');
 try{
  await writeFile(archivo,JSON.stringify(catalogo));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/soluciones');const banda=page.locator('.marcas-grupo').first();
  await expect(banda.locator('button:not([aria-hidden=true])')).toHaveCount(1);
  await expect(banda.locator('button')).not.toHaveCount(1);
  const geometria=await page.locator('.marcas-ventana').evaluate(e=>{const grupos=e.querySelectorAll('.marcas-grupo');return {ventana:e.clientWidth,primera:grupos[0].getBoundingClientRect().width,segunda:grupos[1].getBoundingClientRect().width};});
  expect(geometria.primera).toBeGreaterThanOrEqual(geometria.ventana);expect(Math.abs(geometria.primera-geometria.segunda)).toBeLessThan(1);
 }finally{await writeFile(archivo,original);}
});

test('servidor valida teléfonos y asigna referencias consecutivas a solicitudes simultáneas',async({request})=>{
 test.skip(process.env.SG_TEST_ALTAS!=='1','Requiere consultas locales aisladas');
 const archivo='.privado/admin-local/asesorias.json';let original:string|null=null;
 try{original=await readFile(archivo,'utf8');}catch{}
 const headers={origin:'http://127.0.0.1:3107'};
 try{
  const contacto={idioma:'es',articulos:[],contacto:{nombre:'Cliente QA',telefono:'+506 1234567'},consentimiento:true};
  expect((await request.post('/api/asesoria',{headers,data:contacto})).status()).toBe(400);
  const anteriores=original?JSON.parse(original):[];const siguiente=Math.max(0,...anteriores.map((s:{numero?:number})=>s.numero??0))+1;
  const respuestas=await Promise.all(['8888 8888','+1 (212) 555-1234'].map(telefono=>request.post('/api/asesoria',{headers,data:{...contacto,contacto:{...contactoPrueba,telefono}}})));
  for(const r of respuestas)expect(r.status()).toBe(201);
  const referencias=await Promise.all(respuestas.map(async r=>(await r.json()).referencia));
  expect(referencias.sort()).toEqual([siguiente,siguiente+1].map(n=>`SG-${String(n).padStart(4,'0')}`).sort());
  const nuevas=JSON.parse(await readFile(archivo,'utf8')).filter((s:{numero:number})=>s.numero>=siguiente);
  expect(nuevas.map((s:{contacto:{telefono:string}})=>s.contacto.telefono).sort()).toEqual(['50688888888','12125551234'].sort());
 }finally{if(original===null)await unlink(archivo).catch(()=>{});else await writeFile(archivo,original);}
});
