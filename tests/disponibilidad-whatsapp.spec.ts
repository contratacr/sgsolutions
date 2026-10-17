import {test,expect,type Locator} from '@playwright/test';
for(const idioma of ['es','en'])test(`disponibilidad sin contador ni cantidad; asesoría conserva su intención ${idioma}`,async({page,context,baseURL},info)=>{
 if(/movil|mobile/.test(info.project.name))await page.setViewportSize({width:320,height:900});
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);await page.goto('/tienda?categoria=soluciones-empresariales');
 const verificar=async(enlace:Locator)=>{
  const href=await enlace.getAttribute('href');const texto=new URL(href!).searchParams.get('text')!;
  expect(texto).toContain(idioma==='es'?'consultar la disponibilidad':'check availability');
  expect(texto).not.toMatch(/\d+ ×/);expect(texto).toContain(idioma==='es'?'Código':'Code');
  expect(texto).toContain(idioma==='es'?'plazo de entrega':'delivery timeframe');
  expect(texto).not.toMatch(/recibir asesoría|would like some advice|aprovechar estos equipos/i);
  await expect(enlace).toHaveAttribute('rel','noopener noreferrer');
 };
 const tarjeta=page.locator('.shop-producto').first();
 if(/movil|mobile/.test(info.project.name)){
  expect(await tarjeta.locator('a.producto-agregar').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  expect(await tarjeta.locator('.disponibilidad-etiqueta').evaluate(e=>{const r=document.createRange();r.selectNodeContents(e);return r.getClientRects().length;})).toBe(1);
 }
await verificar(tarjeta.locator('a.producto-agregar'));
 const detalle=await tarjeta.locator('.shop-foto>a').first().getAttribute('href');
 await tarjeta.locator('.producto-acciones button').last().click({force:true});
 await expect(page.locator('.producto-preview .contador-cantidad')).toHaveCount(0);
 await verificar(page.locator('.producto-preview .producto-compra-fila>a'));
 await page.goto(detalle!);await expect(page.locator('.producto-compra-fila .contador-cantidad')).toHaveCount(0);
 await verificar(page.locator('.producto-compra-fila>a'));
 const asesor=page.locator('.shop-asesoria-inline').first();
 expect(new URL((await asesor.getAttribute('href'))!).searchParams.get('text')).toContain(idioma==='es'?'recibir asesoría':'would like some advice');
});
