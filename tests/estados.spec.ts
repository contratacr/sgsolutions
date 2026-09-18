import {test,expect} from '@playwright/test';
for(const idioma of ['es','en']){
 test(`404 centrado y footer sin espacio inferior ${idioma}`,async({page,context})=>{
  await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
  const response=await page.goto('/ruta-inexistente');
  expect(response?.status()).toBe(404);
  await expect(page.locator('.estado-panel h1')).toHaveText(idioma==='es'?'Esta página no está disponible.':'This page is not available.');
  const medida=await page.locator('.estado-panel').evaluate(el=>{const r=el.getBoundingClientRect();return Math.abs(r.x+r.width/2-innerWidth/2);});
  expect(medida).toBeLessThan(2);
  await page.locator('footer').scrollIntoViewIfNeeded();
  expect(await page.locator('footer').evaluate(el=>Math.abs(document.documentElement.scrollHeight-(el.getBoundingClientRect().bottom+scrollY)))).toBeLessThan(2);
  await page.locator('.estado-acciones a[href="/"]').click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('html')).toHaveAttribute('lang',idioma);
 });
 test(`catálogo recuperable tras fallo de red ${idioma}`,async({page,context})=>{
  await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
  await page.route('**/api/catalogo?**',route=>route.abort());
  await page.goto('/tienda');
  await expect(page.locator('.estado-inline[role="alert"]')).toBeVisible();
  await page.unroute('**/api/catalogo?**');
  await page.locator('.estado-inline button').click();
  await expect(page.locator('.shop-producto').first()).toBeVisible();
  await expect(page.locator('.estado-inline[role="alert"]')).toHaveCount(0);
 });
}
