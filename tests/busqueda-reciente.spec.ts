import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`la búsqueda más reciente reemplaza filtros y resultados ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.addInitScript(idioma=>sessionStorage.setItem('sg-tienda-preferencias',JSON.stringify({idioma,categoria:'redes',subcategoria:'anterior',marca:'HP',marcasElegidas:['ASUS'],min:'999999',max:'9999999',busqueda:'anterior',orden:'recomendados'})),idioma);
 await page.goto('/tienda');
 const campo=page.locator('#buscar-equipo'),etiquetas=page.locator('.shop-filtros-activos');
 await expect(campo).toBeEnabled();
 for(const termino of ['Lenovo','Epson']){
  const recibida=page.waitForResponse(r=>r.url().includes('/api/catalogo?')&&new URL(r.url()).searchParams.get('q')===termino);
  await campo.fill(termino);
  const respuesta=await recibida,params=new URL(respuesta.url()).searchParams;
  expect(params.get('categoria')).toBe('todos');
  for(const k of ['marca','subcategoria','min','max'])expect(params.get(k)).toBe('');
  expect(params.getAll('marcas')).toEqual([]);expect(params.get('pagina')).toBe('1');
  const datos=await respuesta.json();expect(datos.total).toBeGreaterThan(0);
  await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','false');
  await expect(etiquetas.locator('button')).toHaveCount(1);
  await expect(etiquetas.locator('button')).toHaveText(termino);
  await expect(campo).toHaveValue(termino);
  await expect.poll(()=>page.locator('.shop-grid h3 a').evaluateAll(enlaces=>enlaces.map(e=>e.getAttribute('href')))).toEqual(datos.productos.map((p:{id:string;slug?:string})=>`/tienda/${encodeURIComponent(p.slug||p.id)}`));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
 await etiquetas.locator('button').click();await expect(campo).toHaveValue('');await expect(etiquetas.locator('button')).toHaveCount(0);
 await expect(page.locator('html')).toHaveAttribute('lang',idioma);
});
