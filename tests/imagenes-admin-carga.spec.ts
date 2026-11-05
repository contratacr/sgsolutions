import {test,expect} from '@playwright/test';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import es from '../messages/es.json';
import en from '../messages/en.json';
import base from '../src/lib/catalogo-base.json';
import sharp from 'sharp';

test.afterEach(async()=>{await unlink('.privado/contenido-pruebas/catalogo.json').catch(()=>{});});
for(const idioma of ['es','en'] as const)for(const seccion of ['catalogo','contenido'])test(`subida estable, validación y recuperación ${seccion} ${idioma}`,async({page,context},info)=>{
 const textos=idioma==='es'?es:en,t=textos.AdminImagenes;
 const {token}=JSON.parse(await readFile('.privado/contenido-pruebas/sesion.json','utf8'));
 await context.addCookies([{name:'sg-admin-local',value:token,domain:'127.0.0.1',path:'/'},{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.route('https://**/*',route=>route.abort());
 await writeFile('.privado/contenido-pruebas/catalogo.json',JSON.stringify({contenido:{...base,productos:[]},revision:1}),{mode:0o600});
 await page.goto(`/panel/${seccion}`);
 if(seccion==='catalogo')await page.getByRole('button',{name:textos.AdminCatalogo.agregarProducto,exact:true}).click();
 else await page.locator('details.admin-item:visible').first().locator(':scope > summary').click();
 const gestor=page.locator('.gestor-imagenes:visible').first(),fotos=gestor.locator('.gestor-foto'),archivo=gestor.locator('input[type=file]'),inicial=await fotos.count();
 // Exercise a real HTTP upload, not the versioned action protocol or an intercepted success.
 const respuesta=page.waitForResponse(r=>r.url().endsWith('/api/panel/imagenes')&&r.request().method()==='POST');
 await archivo.setInputFiles('public/imagenes/logo-principal.png');
 const subida=await respuesta;expect(subida.status()).toBe(200);expect(subida.request().headers()['next-action']).toBeUndefined();
 const {src}=await subida.json();expect(src).toMatch(/^\/imagenes\/admin-contenido-pruebas\//);
 expect((await context.request.get(src)).status()).toBe(200);await expect(fotos).toHaveCount(inicial+1);
 // A later invalid file must not discard the preceding successfully uploaded photo.
 const selector=page.waitForEvent('filechooser');await gestor.getByRole('button',{name:t.agregar,exact:true}).click();
 await (await selector).setFiles([{name:'valida.png',mimeType:'image/png',buffer:await readFile('public/imagenes/logo-principal.png')},{name:'falsa.png',mimeType:'image/png',buffer:Buffer.from('<svg/>')}]);
 await expect(gestor.getByRole('alert')).toHaveText(t.archivoInvalido);await expect(fotos).toHaveCount(inicial+2);
 await archivo.setInputFiles({name:'grande.png',mimeType:'image/png',buffer:Buffer.alloc(8*1024*1024+1)});
 await expect(gestor.getByRole('alert')).toHaveText(t.archivoInvalido);await expect(fotos).toHaveCount(inicial+2);
 await page.route('**/api/panel/imagenes',route=>route.fulfill({status:503,json:{error:'errorCarga'}}),{times:1});
 await archivo.setInputFiles('public/imagenes/logo-principal.png');await expect(gestor.getByRole('alert')).toHaveText(t.errorCarga);await expect(fotos).toHaveCount(inicial+2);
 await archivo.setInputFiles('public/imagenes/logo-principal.png');await expect(fotos).toHaveCount(inicial+3);await expect(gestor.getByRole('alert')).toHaveCount(0);
 await gestor.screenshot({path:info.outputPath('galeria.png')});
 expect((await context.request.post('/api/panel/imagenes',{headers:{Origin:'https://otro.example'},multipart:{archivo:{name:'foto.png',mimeType:'image/png',buffer:await readFile('public/imagenes/logo-principal.png')}}})).status()).toBe(403);
 await context.clearCookies();
 for(const ruta of ['/api/panel/imagenes','/api/panel/soporte/adjuntos'])expect((await context.request.post(ruta,{headers:{Origin:'http://127.0.0.1:3124'},data:'sin sesión'})).status()).toBe(403);
});

test('API: JPG/PNG/WebP, dimensiones y multipart limitado',async({context})=>{
 const {token}=JSON.parse(await readFile('.privado/contenido-pruebas/sesion.json','utf8'));
 await context.addCookies([{name:'sg-admin-local',value:token,domain:'127.0.0.1',path:'/'}]);
 const headers={Origin:'http://127.0.0.1:3124'};
 for(const formato of ['jpeg','png','webp'] as const){
  const buffer=await sharp('public/imagenes/logo-principal.png').resize({width:32}).toFormat(formato).toBuffer();
  const r=await context.request.post('/api/panel/imagenes',{headers,multipart:{archivo:{name:`foto.${formato}`,mimeType:'application/octet-stream',buffer}}});
  expect(r.status()).toBe(200);const {src}=await r.json();const foto=await context.request.get(src);expect(foto.status()).toBe(200);expect(foto.headers()['content-type']).toBe(`image/${formato}`);
 }
 const enorme=await readFile('public/imagenes/logo-principal.png');enorme.writeUInt32BE(6000,16);enorme.writeUInt32BE(6000,20);
 expect((await context.request.post('/api/panel/imagenes',{headers,multipart:{archivo:{name:'enorme.png',mimeType:'image/png',buffer:enorme}}})).status()).toBe(400);
 expect((await context.request.post('/api/panel/imagenes',{headers,data:Buffer.alloc(9*1024*1024)})).status()).toBe(400);
 expect((await context.request.post('/api/panel/imagenes',{headers,data:'sin multipart'})).status()).toBe(400);
});
