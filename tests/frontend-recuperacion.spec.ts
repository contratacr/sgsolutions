import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`fallo de red conserva productos y permite reintento ${idioma}`,async({page,context})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.goto('/tienda');
 await expect(page.locator('.shop-producto')).toHaveCount(24);
 await expect(page.locator('#buscar-equipo')).toBeEnabled();
 await page.route('**/api/catalogo?**',r=>r.fulfill({status:503,json:{error:'no disponible'}}));
 await page.locator('#buscar-equipo').fill('Lenovo');
 const alerta=page.locator('.estado-inline[role=alert]');
 await expect(alerta).toBeVisible();
 await expect(page.locator('.shop-producto')).toHaveCount(24);
 await expect(page.locator('.carga-esqueleto')).toHaveCount(0);
 await expect(page.locator('html')).toHaveAttribute('lang',idioma);
 await page.unroute('**/api/catalogo?**');
 await alerta.getByRole('button').click();
 await expect(alerta).toHaveCount(0);
 await expect(page.locator('.shop-producto').first()).toContainText(/lenovo/i);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:`/tmp/sg-frontend-${idioma}-${test.info().project.name}.png`,fullPage:false});
});
test('volver inmediatamente a la pestaña no vuelve a consultar el catálogo',async({page})=>{
 let consultas=0;page.on('request',r=>{if(r.url().includes('/api/catalogo?'))consultas++;});
 await page.goto('/tienda');await expect(page.locator('#buscar-equipo')).toBeEnabled();
 await page.evaluate(()=>{for(let i=0;i<5;i++)document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForTimeout(500);expect(consultas).toBe(0);
});
test('accesos administrativos no admiten caché ni filtran referencia',async({request})=>{
 for(const ruta of ['/admin','/admin/doble-factor','/admin/activar']){
  const r=await request.get(ruta,{maxRedirects:0});
  expect(r.headers()['cache-control']).toContain('no-store');
  expect(r.headers()['referrer-policy']).toBe('no-referrer');
 }
});
for(const idioma of ['es','en'])test(`medición local de navegación e idioma persistente ${idioma}`,async({page,context},info)=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 const mediciones=[];
 for(const ruta of ['/','/tienda','/favoritos','/cuenta']){
  await page.goto(ruta);
  await expect(page.locator('html')).toHaveAttribute('lang',idioma);
  await expect(page.locator('main')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  mediciones.push(await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;return {ruta:location.pathname,ttfb:n.responseStart-n.requestStart,dom:n.domContentLoadedEventEnd,entorno:'local-dev-no-representa-produccion'};}));
 }
 await info.attach('tiempos-locales',{body:JSON.stringify(mediciones,null,2),contentType:'application/json'});
});
