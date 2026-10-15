import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'] as const)test(`Portada bajo el navbar móvil ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844});await page.goto('/');
  const cabecera=page.locator('.cabecera'),tienda=page.locator('.inicio-camino-tienda');
  await expect(cabecera).toHaveCSS('position','relative');await expect(cabecera).toHaveCSS('background-color','rgb(9, 23, 37)');
  const header=await cabecera.boundingBox(),card=await tienda.boundingBox();expect(card!.y).toBeGreaterThanOrEqual(header!.y+header!.height-1);
  await expect(page.locator('.carrito-trigger')).toHaveCSS('box-shadow','none');await expect(page.locator('.menu-movil')).toHaveCSS('box-shadow','none');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
 await page.locator('.menu-movil').click();await expect(page.locator('.menu-panel-enlaces')).toBeVisible();await page.keyboard.press('Escape');
 await page.locator('.carrito-trigger').click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
 await page.reload();await expect(page.locator('html')).toHaveAttribute('lang',idioma);
});
