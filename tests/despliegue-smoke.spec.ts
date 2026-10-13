import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`rutas públicas y límites de pedidos ${idioma}`,async({page,context,baseURL,request})=>{
 test.setTimeout(120000);
 const host=new URL(baseURL!).hostname;
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:host,path:'/'}]);
 const errores:string[]=[];page.on('pageerror',e=>errores.push(e.message));
 for(const ruta of ['/','/tienda','/soporte','/empresas','/casos-de-exito','/nosotros','/cuenta','/terminos','/privacidad','/finalizar-compra']){
  const r=await page.goto(ruta);expect(r?.status(),ruta).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang',idioma);
  await expect(page.locator('main')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('header img[alt="SG Solutions"]')).toHaveCount(1);
  await expect(page.locator('footer img[alt="SG Solutions"]')).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),ruta).toBe(false);
 }
 for(const ruta of ['/api/compra/verificar','/api/pagos/tilopay/iniciar','/api/pedidos/manual']){
  const r=await request.post(ruta,{headers:{origin:new URL(baseURL!).origin},data:{}});
  expect([400,403]).toContain(r.status());
 }
 await page.goto('/panel/usuarios');await expect(page).toHaveURL(/\/admin$/);
 expect(errores).toEqual([]);
});
