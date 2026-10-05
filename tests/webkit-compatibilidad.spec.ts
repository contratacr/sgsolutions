import {test,expect} from '@playwright/test';
test.use({browserName:'webkit'});
test.skip(process.env.SG_TEST_WEBKIT!=='1','Ejecutar con WebKit instalado y SG_TEST_WEBKIT=1');
for(const idioma of ['es','en'])test(`Safari conserva precios, contacto y carrito sin errores ${idioma}`,async({page,context})=>{
 const errores:string[]=[];page.on('pageerror',e=>errores.push(e.message));
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 for(const ruta of ['/soluciones','/soluciones/portatil','/nosotros']){
  await page.goto(ruta);await page.waitForLoadState('networkidle');
  await expect(page.locator('html')).toHaveAttribute('lang',idioma);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
 await page.goto('/soluciones');await page.waitForLoadState('networkidle');
 await expect(page.locator('.shop-precio strong').first()).toHaveText(/₡\d{1,3}(\s\d{3})*/);
 await page.locator('.contacto-asesoria-trigger').click();
 await page.getByRole('dialog').getByRole('button',{name:idioma==='es'?'Cerrar':'Close',exact:true}).click();
 await page.locator('.shop-producto .guardar-seleccion').first().click();
 await expect(page.locator('.carrito-confirmacion')).toBeVisible();
 await page.locator('.carrito-confirmacion .boton-azul').click();
 await expect(page.locator('.carrito-lineas li')).toHaveCount(1);
 await page.screenshot({path:`/tmp/sg-safari-${idioma}-${test.info().project.name}.png`});
 expect(errores).toEqual([]);
});
