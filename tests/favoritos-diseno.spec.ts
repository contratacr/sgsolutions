import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`favoritos conserva tarjetas de tienda y equipos empresariales ${idioma}`,async({page,context,request,baseURL},info)=>{
 const d=await(await request.get('/api/catalogo?orden=recomendados')).json();
 const seleccion=[...d.productos.filter((p:{coleccion?:string})=>p.coleccion!=='empresas').slice(0,4),...d.productos.filter((p:{coleccion?:string})=>p.coleccion==='empresas')];
 expect(seleccion).toHaveLength(8);
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await context.addInitScript(ids=>{if(!localStorage.getItem('sg-favoritos-invitado'))localStorage.setItem('sg-favoritos-invitado',JSON.stringify(ids));},seleccion.map(p=>p.id));
 await page.goto('/favoritos');const tarjetas=page.locator('.favoritos-grid .shop-producto');await expect(tarjetas).toHaveCount(8);
 for(let i=0;i<8;i++){
  const tarjeta=tarjetas.nth(i),p=seleccion[i];await expect(tarjeta.locator('.shop-marca')).toHaveText(p.marca);await expect(tarjeta.locator('.shop-codigo')).toContainText(p.codigoFabricante);
  await expect(tarjeta.locator('.shop-precio')).toBeVisible();await expect(tarjeta.locator('[aria-pressed]')).toHaveAttribute('aria-pressed','true');
  await expect(tarjeta.locator(i>=4?'a.producto-agregar':'button.producto-agregar')).toHaveCount(1);
 }
 expect(await page.locator('.favoritos-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(info.project.name==='safari-mobile'?2:4);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect.poll(()=>tarjetas.first().locator('img').evaluate(e=>(e as HTMLImageElement).complete&&(e as HTMLImageElement).naturalWidth>0),{timeout:15000}).toBe(true);
 await page.screenshot({path:`.privado/favoritos-tarjetas-${info.project.name}-${idioma}.png`,fullPage:true});
 await page.reload();await expect(tarjetas).toHaveCount(8);
 const empresarial=tarjetas.nth(4);await empresarial.hover();await empresarial.locator('.producto-acciones button').last().click();
 await expect(page.locator('.producto-preview')).toBeVisible();await expect(page.locator('.producto-preview .contador-cantidad')).toHaveCount(0);await page.keyboard.press('Escape');
 await tarjetas.nth(4).hover();await tarjetas.nth(4).locator('[aria-pressed]').click();await expect(tarjetas).toHaveCount(7);
 await page.reload();await expect(tarjetas).toHaveCount(7);await expect(page.locator('html')).toHaveAttribute('lang',idioma);
});

for(const idioma of ['es','en'])test(`favoritos vacío sin invitación y un único título ${idioma}`,async({page,context,request,baseURL},info)=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.goto('/favoritos');
 const vacio=page.locator('.favoritos-vacio'),aviso=page.locator('.favoritos-invitado');
 await expect(vacio).toBeVisible();await expect(aviso).toHaveCount(0);
 await expect(page.locator('main h1')).toHaveText(idioma==='es'?'Favoritos':'Favorites');await expect(page.locator('main h2')).toHaveCount(0);
 await expect(vacio.locator('a')).toHaveAttribute('href','/tienda');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`.privado/favoritos-vacio-${info.project.name}-${idioma}.png`});
 const datos=await(await request.get('/api/catalogo')).json();
 await page.evaluate(id=>localStorage.setItem('sg-favoritos-invitado',JSON.stringify([id])),datos.productos[0].id);
 await page.reload();await expect(page.locator('.favoritos-grid .shop-producto')).toHaveCount(1);await expect(aviso).toBeVisible();
 await page.locator('.favoritos-grid .shop-producto').hover();await page.locator('.favoritos-grid [aria-pressed]').click();
 await expect(vacio).toBeVisible();await expect(aviso).toHaveCount(0);
});
