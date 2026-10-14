import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`filtros completos al regresar arriba ${idioma}`,async({page,context,baseURL},info)=>{
 test.skip(info.project.name==='safari-mobile','El móvil usa el panel de filtros independiente.');
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);await page.goto('/tienda');const panel=page.locator('.shop-sidebar');
 for(let i=0;i<3;i++){
  await page.evaluate(()=>window.scrollTo(0,800));await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(800);
  await panel.evaluate(e=>{e.scrollTop=e.scrollHeight;});expect(await panel.evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
  await page.evaluate(()=>window.scrollTo(0,0));await expect.poll(()=>panel.evaluate(e=>e.scrollTop)).toBe(0);
  await expect(panel.locator('h2').first()).toBeInViewport();
 }
});
