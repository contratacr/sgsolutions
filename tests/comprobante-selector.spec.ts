import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`Seleccionar comprobante abre el selector en SINPE y transferencia ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.goto('/tienda');await expect(page.locator('.shop-orden-trigger')).toBeEnabled();await page.locator('.shop-producto').first().hover();await page.locator('.producto-agregar').first().click();await page.goto('/pagar');
 for(const metodo of ['sinpe','transferencia']){
  await page.locator(`input[value=${metodo}]`).check();
  const selector=page.waitForEvent('filechooser',{timeout:5000});
  await page.locator('.compra-archivo-boton').click();
  await (await selector).setFiles({name:`${metodo}.pdf`,mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n'+'.'.repeat(200))});
  await expect(page.locator('.compra-archivo-nombre')).toHaveText(`${metodo}.pdf`);
 }
});
