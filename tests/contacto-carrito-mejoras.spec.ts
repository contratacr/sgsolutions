import {contactoPrueba} from './datos-asesoria-fixture';
import {test,expect} from '@playwright/test';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {normalizarTelefonoWhatsApp} from '../src/lib/telefono-whatsapp';

test('números nacionales e internacionales sin aceptar texto ni códigos incompletos',()=>{
 for(const [entrada,esperado] of [['8888 8888','50688888888'],['+506 8888-8888','50688888888'],['+1 (212) 555-1234','12125551234'],['0034 612 345 678','34612345678'],['+44 20 7946 0958','442079460958']])expect(normalizarTelefonoWhatsApp(entrada)).toBe(esperado);
 for(const entrada of ['+506','+506 1234567','+506 123456789','abc','8888','+506+88888888','1234567890123456'])expect(normalizarTelefonoWhatsApp(entrada)).toBeNull();
});
for(const idioma of ['es','en'])test(`asesoría directa y confirmación del carrito ${idioma}`,async({page,context})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.goto('/tienda');const enlace=page.locator('.shop-asesoria-inline').first();
 await expect(enlace).toHaveAttribute('target','_blank');await expect(enlace).toHaveAttribute('rel','noopener noreferrer');
 const url=new URL((await enlace.getAttribute('href'))!);expect(url.hostname).toBe('wa.me');expect(url.searchParams.get('text')).toContain('SG Solutions');
 await expect(page.locator('.contacto-asesoria')).toHaveCount(0);
 await page.locator('.shop-producto .producto-agregar').first().click();
 await expect(page.locator('.carrito-confirmacion [role=status]')).toContainText(idioma==='es'?'Agregado al carrito':'Added to cart');
 await page.locator('.carrito-confirmacion').getByRole('button',{name:idioma==='es'?'Ver carrito':'View cart',exact:true}).click();
 await expect(page.locator('.carrito-panel')).toBeVisible();await expect(page.locator('.carrito-lineas li')).toHaveCount(1);
 await page.locator('.modal-carrito-panel > .modal-cierre-exterior').click();await expect(page.locator('.carrito-panel')).toHaveCount(0);
 await page.screenshot({path:`/tmp/sg-contacto-mejorado-${idioma}-${test.info().project.name}.png`});
 await page.goto('/');await expect(page.locator('.inicio-camino-empresas')).toContainText(idioma==='es'?'Empresas':'Business');await expect(page.locator('.inicio-camino-empresas')).toHaveAttribute('href','/empresas');
});

test('WhatsApp abre una conversación externa y conserva la tienda',async({page,context})=>{
 let solicitudes=0;page.on('request',r=>{if(new URL(r.url()).pathname==='/api/asesoria')solicitudes++;});
 await context.route('https://wa.me/**',r=>r.fulfill({status:200,body:'WhatsApp simulado: no se envía ningún mensaje'}));
 await page.goto('/tienda');const popupPromesa=page.waitForEvent('popup');await page.locator('.shop-asesoria-inline').first().click();const popup=await popupPromesa;
 await popup.waitForURL('https://wa.me/**');await expect(popup.locator('body')).toContainText('WhatsApp simulado');await popup.close();
 await expect(page.locator('.shop-grid')).toBeVisible();await expect(page).toHaveURL(/\/tienda$/);expect(solicitudes).toBe(0);
});

test('pocas marcas llenan la ventana durante todo el ciclo',async({page})=>{
 test.skip(process.env.SG_TEST_ALTAS!=='1','Requiere catálogo local aislado');
 const archivo='.privado/admin-local/catalogo.json',original=await readFile(archivo,'utf8');
 const catalogo=JSON.parse(original);catalogo.contenido.gestion='manual';
 catalogo.contenido.productos=catalogo.contenido.productos.filter((p:{marca:string;publicado:boolean})=>p.publicado&&p.marca==='LENOVO').slice(0,1);
 try{
  await writeFile(archivo,JSON.stringify(catalogo));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/tienda');const banda=page.locator('.marcas-grupo').first();
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
