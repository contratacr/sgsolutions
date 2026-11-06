import {llegarAPago} from './ayudas/compra';
import {test,expect} from '@playwright/test';
import {VERSION_PREFERENCIAS_MEDICION} from '../src/lib/preferencias-medicion';
import es from '../messages/es.json';
import en from '../messages/en.json';
for(const idioma of ['es','en'] as const)test('carrito conserva contexto durante navegación lenta '+idioma,async({page,context,baseURL})=>{
 const t=idioma==='es'?es:en;
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.route('https://**/*',route=>route.abort());
 await page.addInitScript(version=>localStorage.setItem('sg-medicion',JSON.stringify({version,analitica:false,publicidad:false})),VERSION_PREFERENCIAS_MEDICION);
 await page.goto('/tienda');
 await page.locator('#buscar-equipo').fill('conector');await page.locator('#buscar-equipo').press('Enter');
 const agregar=page.locator('button.producto-agregar').first();await agregar.click();await expect(agregar).toContainText(idioma==='es'?'Agregado':'Added');
 await page.locator('.carrito-trigger').click();
 const dialogo=page.getByRole('dialog');await expect(dialogo).toBeVisible();
 let liberar!:()=>void;const espera=new Promise<void>(r=>{liberar=r;});
 await page.route('**/pagar*',async route=>{await espera;await route.continue();});
 await dialogo.getByRole('link',{name:t.Carrito.finalizar,exact:true}).click({noWaitAfter:true});
 // A blocked navigation must not reveal the underlying product/store page.
 try{await expect(dialogo).toBeVisible();await expect(dialogo.getByRole('link',{name:t.Carrito.abriendoCompra,exact:true})).toBeVisible();}finally{liberar();}
 await expect(page).toHaveURL(/\/pagar$/);await expect(dialogo).not.toBeVisible();
 await expect(page.locator('.compra-pagina')).toBeVisible();
 await expect(page.locator('.compra-pagina input').first()).toBeVisible();
 await page.goBack();await expect(page).toHaveURL(/\/tienda/);await expect(dialogo).not.toBeVisible();
});

for(const idioma of ['es','en'] as const)for(const metodo of ['sinpe','transferencia'])test(`confirmación sin carrito vacío ${metodo} ${idioma}`,async({page,context,baseURL})=>{
 const t=(idioma==='es'?es:en).Compra;
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.addInitScript(version=>localStorage.setItem('sg-medicion',JSON.stringify({version,analitica:false,publicidad:false})),VERSION_PREFERENCIAS_MEDICION);
 await page.route('https://**/*',r=>r.abort());
 await page.goto('/tienda?q=conector');
 const agregar=page.locator('button.producto-agregar').first();await agregar.click();await expect(agregar).toContainText(idioma==='es'?'Agregado':'Added');
 await page.goto('/pagar');
 await llegarAPago(page,idioma);
 await page.locator(`input[value=${metodo}]`).check();
 await page.locator('input[type=file]').setInputFiles({name:'prueba.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n'+'.'.repeat(200))});
 await page.locator('[name=consentimiento]').check();
 await page.locator('.compra-pagina button[type=submit]').click();
 await expect(page.getByRole('button',{name:t.completarPedido,exact:true})).toBeVisible();
 let creados=0,adjuntos=0;
 const destino='/pedido/'+'a'.repeat(64);
 await page.route('**/api/compra/verificar',r=>r.fulfill({json:{id:'qa',token:'qa'}}));
 await page.route('**/api/pedidos/manual',r=>{creados++;expect(r.request().postDataJSON().metodo).toBe(metodo);return r.fulfill({json:{urlCorta:destino}});});
 await page.route('**/api/pedidos/manual/comprobante',r=>{adjuntos++;return r.fulfill({json:{ok:true}});});
 let liberar!:()=>void,solicitado!:()=>void;
 const espera=new Promise<void>(r=>{liberar=r;}),navegando=new Promise<void>(r=>{solicitado=r;});
 await page.route('**'+destino,async r=>{solicitado();await espera;await r.fulfill({contentType:'text/html; charset=utf-8',body:'<html><head><meta charset="utf-8"></head><body><h1>Confirmación simulada</h1></body></html>'});});
 let informar!:(v:unknown)=>void;
 const observado=new Promise<unknown>(r=>{informar=r;});
 await page.exposeFunction('observarConfirmacionQA',(v:unknown)=>informar(v));
 await page.evaluate(({vacio,creando})=>{
  const observer=new MutationObserver(()=>{
   const carrito=JSON.parse(localStorage.getItem('sg-carrito-v1')||'[]');
   if(carrito.length)return;
   observer.disconnect();
   const estado={resumen:Boolean(document.querySelector('.compra-grid')),vacio:[...document.querySelectorAll('h2')].some(n=>n.textContent===vacio),bloqueado:[...document.querySelectorAll('button')].some(n=>n.textContent?.includes(creando)&&n.disabled),carrito};
   void (window as unknown as {observarConfirmacionQA:(v:unknown)=>Promise<void>}).observarConfirmacionQA(estado);
  });
  observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true});
 },{vacio:t.vacio,creando:t.creandoPedido});
 await page.getByRole('button',{name:t.completarPedido,exact:true}).click({noWaitAfter:true});
 try{
  await navegando;
  const visible=await observado;
  expect(visible).toEqual({resumen:true,vacio:false,bloqueado:true,carrito:[]});
  expect(creados).toBe(1);expect(adjuntos).toBe(1);
 }finally{liberar();}
 await expect(page).toHaveURL(new RegExp(destino+'$'));
 await expect(page.getByRole('heading',{name:'Confirmación simulada'})).toBeVisible();
});
