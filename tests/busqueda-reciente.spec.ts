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
 await campo.press('Escape');
 await etiquetas.locator('button').click();await expect(campo).toHaveValue('');await expect(etiquetas.locator('button')).toHaveCount(0);
 await expect(page.locator('html')).toHaveAttribute('lang',idioma);
});

for(const idioma of ['es','en'])test(`marca reemplaza búsqueda y sugerencias accesibles ${idioma}`,async({page,context,baseURL},testInfo)=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.goto('/tienda');
 const campo=page.locator('#buscar-equipo');await expect(campo).toBeEnabled();
 await campo.fill('Kingston');await campo.press('Escape');
 await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','false');
 const movil=testInfo.project.name==='movil';
 if(movil)await page.locator('.shop-abrir-filtros').click();
 const filtros=movil?page.locator('dialog[open]'):page.locator('.shop-sidebar');
 await filtros.locator('.shop-buscar-marca[type=search]').last().fill('ACER');
 await filtros.getByRole('checkbox',{name:/ACER/i}).check();
 if(movil){
  await expect(campo).toHaveValue('Kingston');
  await page.keyboard.press('Escape');
  await expect(campo).toHaveValue('Kingston');
  await page.locator('.shop-abrir-filtros').click();
  await filtros.getByRole('checkbox',{name:/ACER/i}).check();
  await filtros.getByRole('button',{name:idioma==='es'?/Ver resultados/:/View results/i}).click();
 }
 await expect(campo).toHaveValue('');
 await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','false');
 await expect(page.locator('.shop-filtros-activos button')).toHaveCount(1);
 await expect(page.locator('.shop-filtros-activos button')).toContainText('ACER');
 await expect(page.locator('.shop-grid').locator('.shop-producto').first()).toBeVisible();
 await campo.fill('King');
 await expect(campo).toHaveAttribute('aria-expanded','true');
 await expect(page.getByRole('option').filter({hasText:/Kingston/i})).toBeVisible();
 await campo.press('ArrowDown');await campo.press('Enter');
 await expect(campo).toHaveValue('Kingston');
 await expect(page.locator('.shop-filtros-activos button')).toHaveCount(1);
 await expect(page.locator('.shop-filtros-activos button')).toContainText(/Kingston/i);
 await expect(campo).toHaveAttribute('aria-expanded','false');
});

for(const idioma of ['es','en'])test(`ace completa ACER y no superpone el campo ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);await page.goto('/tienda');
 const campo=page.locator('#buscar-equipo');await expect(campo).toBeEnabled();await campo.fill('ace');
 const opcion=page.getByRole('option').filter({hasText:/^ACER/});await expect(opcion).toBeVisible();
 const entrada=await campo.boundingBox(),lista=await page.getByRole('listbox').boundingBox();expect(lista!.y).toBeGreaterThan(entrada!.y+entrada!.height);
 await opcion.click();await expect(campo).toHaveValue('ACER');await expect(page.locator('.shop-filtros-activos button')).toHaveCount(1);await expect(page.locator('.shop-filtros-activos button')).toHaveText('ACER');
 await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','false');await expect(page.locator('.shop-grid h3').first()).toContainText(/ACER/i);
});
