import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test('Fondos del contenido y navegación '+idioma,async({page,context,baseURL})=>{
 test.setTimeout(120000);
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 for(const ruta of ['/','/tienda','/favoritos','/pagar','/cuenta','/cuenta/recuperar','/empresas','/soporte','/contacto','/nosotros','/casos-de-exito','/terminos','/privacidad','/vista-previa/pedidos','/vista-previa/disponibilidad','/vista-previa/correos']){
  await page.goto(ruta);await expect(page.locator('main:visible').first()).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang',idioma);
  const grises=await page.locator('main:visible').first().evaluate(main=>[main,...main.querySelectorAll('section,article,form,aside')].filter(el=>{
   const r=el.getBoundingClientRect();if(r.width<100||r.height<50)return false;
   const c=getComputedStyle(el).backgroundColor.match(/[\d.]+/g)?.map(Number);
   return c&&c.length>=3&&(c.length===3||c[3]===1)&&Math.min(...c.slice(0,3))>=190&&Math.max(...c.slice(0,3))-Math.min(...c.slice(0,3))<=40&&c.slice(0,3).some(n=>n!==255);
  }).map(el=>el.className));
  expect(grises,ruta).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),ruta).toBe(true);
 }
});
test('Los siete módulos del panel conservan superficies blancas',async({page})=>{
 await page.goto('/vista-previa/pedidos');
 const opciones=page.locator('.propuesta-nav button');
 for(let i=0;i<7;i++){
  await opciones.nth(i).click();
  await expect(opciones.nth(i)).toHaveAttribute('aria-current','page');
  const main=page.locator('main:visible').first();await expect(main).toBeVisible();
  expect(await main.evaluate(el=>[el,...el.querySelectorAll('section,article')].filter(e=>{const c=getComputedStyle(e).backgroundColor.match(/[\d.]+/g)?.map(Number);return c&&c.length>=3&&(c.length===3||c[3]===1)&&Math.min(...c.slice(0,3))>=190&&Math.max(...c.slice(0,3))-Math.min(...c.slice(0,3))<=40&&c.slice(0,3).some(n=>n!==255)}).map(e=>e.className))).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
});
