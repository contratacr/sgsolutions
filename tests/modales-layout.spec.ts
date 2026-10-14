import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`cierre exterior y contenido completo ${idioma}`,async({page,context,baseURL},info)=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 async function comprobar(){const marco=page.locator('.modal-marco');await expect(marco).toBeVisible();const cuerpo=await marco.locator('.modal-cuerpo').boundingBox(),cierre=await marco.locator('.modal-cierre-exterior').boundingBox();expect(cuerpo).toBeTruthy();expect(cierre).toBeTruthy();expect(cierre!.y).toBeGreaterThanOrEqual(0);expect(cierre!.y+cierre!.height).toBeLessThanOrEqual(cuerpo!.y+1);expect(cuerpo!.x).toBeGreaterThanOrEqual(0);expect(cuerpo!.x+cuerpo!.width).toBeLessThanOrEqual(page.viewportSize()!.width+1);await marco.locator('.modal-cierre-exterior').click();await expect(marco).toHaveCount(0);}
 await page.goto('/tienda');await page.locator('.carrito-trigger').click();await comprobar();
 if(info.project.name==='safari-mobile'){await page.locator('.menu-movil').click();await comprobar();await page.locator('.shop-abrir-filtros').click();const dialogo=page.locator('.shop-panel-filtros');await expect(dialogo).toBeVisible();const cuerpo=await dialogo.locator('.modal-nativo-cuerpo').boundingBox(),cierre=await dialogo.locator(':scope>button').boundingBox();expect(cierre!.y+cierre!.height).toBeLessThanOrEqual(cuerpo!.y);await dialogo.locator(':scope>button').click();}
 await page.goto('/casos-de-exito');await page.locator('.historia-foto').first().click();await comprobar();
 await page.goto('/empresas');await page.locator('.planes .boton, .plan .boton, .plan-tarjeta .boton').first().click();await comprobar();
});
