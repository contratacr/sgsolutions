import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`filtros sin recortes ni contadores superpuestos en cada breakpoint ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 for(const width of [320,390,650,768,850,851,1024,1440]){
  await page.setViewportSize({width,height:900});await page.goto('/tienda');
  const movil=width<=850;
  if(movil){await expect(page.locator('.shop-sidebar')).toBeHidden();await page.locator('.shop-abrir-filtros').click();}
  const panel=page.locator(movil?'.shop-panel-filtros':'.shop-sidebar');
  const categoria=panel.getByRole('button',{name:idioma==='es'?'Soluciones Empresariales':'Business Solutions',exact:true});
  if(await categoria.getAttribute('aria-expanded')!=='true')await categoria.click();
  expect(await categoria.evaluate(e=>getComputedStyle(e).borderLeftColor)).toBe('rgba(0, 0, 0, 0)');
  const recortes=await panel.locator('.shop-categorias button').evaluateAll(botones=>botones.filter(b=>{
   if(b.scrollWidth>b.clientWidth+1)return true;
   const nombre=b.querySelector('.shop-empresa-nombre'),contador=b.querySelector('.shop-categoria-indicador');
   return nombre&&contador&&nombre.getBoundingClientRect().right>contador.getBoundingClientRect().left+1;
  }).map(b=>b.textContent));
  expect(recortes,`${width}px ${idioma}`).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});

for(const idioma of ['es','en'])test(`móvil destaca la categoría sin marca lateral y abre las categorías cerradas ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.setViewportSize({width:390,height:844});await page.goto('/tienda?categoria=soluciones-empresariales');
 await page.locator('.shop-abrir-filtros').click();
 const boton=page.locator('.shop-panel-filtros .shop-categoria-empresa>button');
 await expect(boton).toHaveAttribute('aria-expanded','false');
 expect(await boton.evaluate(e=>getComputedStyle(e,'::before').content)).toBe('none');
 const revisar=async()=>{
  expect(await boton.locator('.shop-categoria-indicador>span').evaluate(e=>getComputedStyle(e).color)).toBe('rgb(88, 112, 132)');
  await expect.poll(()=>boton.evaluate(e=>e.querySelector('.shop-empresa-nombre')!.getBoundingClientRect().left-e.getBoundingClientRect().left)).toBeGreaterThanOrEqual(10);
 };
 await revisar();
 await boton.click();await expect(boton).toHaveAttribute('aria-expanded','true');await revisar();
 await page.locator('.shop-panel-filtros .shop-panel-filtros-acciones>.boton').first().click();
 await page.locator('.shop-abrir-filtros').click();await expect(boton).toHaveAttribute('aria-expanded','false');
 await page.reload();await page.locator('.shop-abrir-filtros').click();await expect(boton).toHaveAttribute('aria-expanded','false');
});

for(const idioma of ['es','en'])test(`filtros compactos bloquean fondo y recuperan posición ${idioma}`,async({page,context,baseURL,isMobile})=>{
 await page.setViewportSize({width:390,height:500});
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.goto('/tienda');await expect(page.locator('.shop-orden-trigger')).toBeEnabled();
 await page.evaluate(()=>window.scrollTo({top:260,behavior:'instant'}));
 await page.locator('.shop-abrir-filtros').click();
 const panel=page.locator('.shop-panel-filtros');await expect(panel).toBeVisible();
 await expect(page.locator('body')).toHaveCSS('position','fixed');
 const inicial=await page.locator('body').evaluate(e=>e.getBoundingClientRect().top);
 expect(Math.round((await panel.boundingBox())!.width)).toBeLessThanOrEqual(320);
 if(!isMobile){await page.mouse.move(380,450);await page.mouse.wheel(0,500);}await page.waitForTimeout(150);
 expect(await page.locator('body').evaluate(e=>e.getBoundingClientRect().top)).toBe(inicial);
 expect(await page.locator('body').evaluate(e=>e.dispatchEvent(new Event('touchmove',{bubbles:true,cancelable:true})))).toBe(false);
 expect(await page.locator('body').evaluate(e=>e.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true})))).toBe(false);
 await expect(panel).toBeVisible();
 expect(await panel.evaluate(e=>e.matches(':modal'))).toBe(true);
 expect(await panel.evaluate(e=>e.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true})))).toBe(false);
 const contenido=panel.locator('.modal-nativo-cuerpo');await contenido.evaluate(e=>{e.scrollTop=60;});
 expect(await contenido.evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
 await panel.locator(':scope>button').click();await expect(panel).not.toBeVisible();
 await expect(page.locator('body')).not.toHaveCSS('position','fixed');
 expect(await page.evaluate(()=>scrollY)).toBe(-inicial);
 await page.reload();await expect(page.locator('html')).toHaveAttribute('lang',idioma);
});
