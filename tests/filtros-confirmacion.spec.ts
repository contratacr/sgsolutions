import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`los filtros móviles solo se aplican con Ver resultados ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);await page.setViewportSize({width:390,height:844});
 await page.goto('/tienda');await expect(page.locator('.shop-orden-trigger')).toBeEnabled();
 await expect(page.locator('.shop-producto [aria-pressed]').first()).toBeEnabled();
 const estado=()=>page.evaluate(()=>({
  seleccion:document.querySelector('.shop-filtros-activos')!.textContent,
  conteo:document.querySelector('.conteo')!.textContent,
  productos:Array.from(document.querySelectorAll('.shop-grid h3 a')).map(e=>({texto:e.textContent,ruta:e.getAttribute('href')})),
  asesoria:document.querySelector('.shop-asesoria-inline')!.getAttribute('href'),
  busqueda:(document.querySelector('#buscar-equipo') as HTMLInputElement).value,
  preferencias:sessionStorage.getItem('sg-tienda-preferencias'),
 }));
 const antes=await estado(),panel=page.locator('.shop-panel-filtros');
 for(const cerrar of ['fuera','escape','boton','aplicar']){
  await page.locator('.shop-abrir-filtros').click();await expect(panel).toBeVisible();
  await panel.locator('.shop-categoria-empresa>button').click();
  await panel.locator('.shop-subcategorias button').first().click();
  await panel.locator('.shop-marcas-opciones input').first().check();
  const precio=panel.locator('input[type=range]').first();await expect(precio).toBeEnabled();await precio.focus();await precio.press('ArrowRight');
  await expect(panel.locator('.shop-categoria-empresa>button')).toHaveAttribute('aria-pressed','true');
  // Let the contextual price request finish; the catalog behind the dialog must stay intact.
  await expect(panel.locator('.shop-precio-rango')).toHaveAttribute('aria-busy','false');
  expect(await estado()).toEqual(antes);
  if(cerrar==='fuera')await page.mouse.click(385,400);
  else if(cerrar==='escape')await page.keyboard.press('Escape');
  else if(cerrar==='boton')await panel.locator(':scope>button').click();
  else await panel.locator('.shop-panel-filtros-acciones>.boton').first().click();
  await expect(panel).not.toBeVisible();
  if(cerrar!=='aplicar'){
   expect(await estado()).toEqual(antes);
   await page.reload();await expect(page.locator('.shop-orden-trigger')).toBeEnabled();
   expect(await estado()).toEqual(antes);
  }else{
   await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','false');
   await expect(page.locator('.shop-filtros-activos')).not.toHaveText('');
   expect((await estado()).preferencias).not.toBe(antes.preferencias);
   await page.reload();await expect(page.locator('.shop-filtros-activos')).not.toHaveText('');
  }
 }
});
