import {test,expect} from '@playwright/test';
for(const idioma of ['es','en']){
 test(`productos reales y desplazamiento ${idioma}`,async({page,context,baseURL},info)=>{
  await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);await page.goto('/tienda');
  const campo=page.locator('#buscar-equipo');await expect(campo).toBeEnabled();
  const respuesta=page.waitForResponse(r=>r.url().includes('sugerencias=1')&&new URL(r.url()).searchParams.get('q')==='Dell');
  await campo.fill('Dell');const datos=await (await respuesta).json();expect(datos.productos.length).toBeGreaterThan(0);expect(datos.productos.length).toBeLessThanOrEqual(6);
  const opciones=page.getByRole('option');await expect(opciones).toHaveCount(datos.productos.length);
  await expect(opciones.first().locator('img')).toBeVisible();await expect(opciones.first()).toContainText(datos.productos[0].nombre[idioma]);
  await campo.blur();await expect(page.getByRole('listbox')).toBeVisible();
  // Reduce el viewport para verificar el espacio disponible; no emula un teclado físico de iOS.
  if(/mobile|iphone/.test(info.project.name))await page.setViewportSize({width:390,height:500});
  const panel=page.locator('.shop-sugerencias-panel');await panel.scrollIntoViewIfNeeded();
  await page.getByRole('button',{name:idioma==='es'?/Ver todos los resultados/:/View all results/}).scrollIntoViewIfNeeded();
  const medidas=await panel.evaluate(el=>({client:el.clientHeight,scroll:el.scrollHeight,top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom}));expect(medidas.client).toBeGreaterThan(0);expect(medidas.scroll).toBeGreaterThanOrEqual(medidas.client);expect(medidas.bottom).toBeLessThanOrEqual((page.viewportSize()?.height??0)+1);
  await page.screenshot({path:`/tmp/sg-sugerencias-${info.project.name}-${idioma}.png`});
  await page.getByRole('button',{name:idioma==='es'?/Ver todos los resultados/:/View all results/}).click();await expect(page.getByRole('listbox')).toHaveCount(0);await expect(page.locator('.shop-termino-buscado')).toContainText('Dell');
  await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','false');
  await campo.fill('Kingston');await expect(opciones.first()).toBeVisible();await opciones.first().click();await expect(page).toHaveURL(/\/tienda\/.+/);
 });
 test(`alternativa de marca y respuesta antigua ${idioma}`,async({page,context,baseURL})=>{
  await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
  await page.route('**/api/catalogo?**',async route=>{
   if(new URL(route.request().url()).searchParams.get('sugerencias')==='1')return route.fulfill({json:{productos:[],total:0,pagina:1,paginas:1,rangoPrecios:{minimo:0,maximo:0}}});
   return route.continue();
  });
  await page.goto('/tienda');const campo=page.locator('#buscar-equipo');await expect(campo).toBeEnabled();await campo.fill('ace');
  await expect(page.getByRole('option').filter({hasText:/ACER/})).toBeVisible();await page.getByRole('option').filter({hasText:/ACER/}).click();await expect(campo).toHaveValue('ACER');
  await campo.fill('zzzzsincoincidencias');await expect(page.getByRole('option')).toHaveCount(0);
 });
}
