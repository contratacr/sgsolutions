import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`agregar y quitar favoritos no mueve la cabecera ni los productos ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.goto('/tienda?categoria=soluciones-empresariales');
 const boton=page.locator('.shop-producto .producto-acciones button[aria-pressed]').first();
 await expect(boton).toBeEnabled();
 const estado=()=>page.evaluate(()=>({controles:['.shop-asesoria-inline','.shop-favoritos-enlace','.shop-orden','.shop-abrir-filtros'].map(selector=>{const r=document.querySelector('.shop-resultados-cabecera '+selector)!.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}),alto:document.querySelector('.shop-resultados-cabecera')!.getBoundingClientRect().height,productos:document.querySelector('.shop-grid')!.getBoundingClientRect().top,orden:document.querySelector('.shop-orden')!.getBoundingClientRect().top}));
 const antes=await estado();await boton.click({force:true});
 await expect(page.locator('.shop-favoritos-contador')).toHaveText('1');
 expect(await estado()).toEqual(antes);
 await boton.click({force:true});await expect(page.locator('.shop-favoritos-enlace')).toBeHidden();
 expect(await estado()).toEqual(antes);
});

for(const idioma of ['es','en'])test(`acciones mantienen filas y alineación en todos los anchos ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 for(const width of [320,390,520,650,850,1024,1440]){
  await page.setViewportSize({width,height:900});await page.goto('/tienda');
  await expect(page.locator('.shop-orden-trigger')).toBeEnabled();
  const posiciones=()=>page.locator('.shop-controles-tienda').evaluate(e=>Object.fromEntries(['.shop-abrir-filtros','.shop-orden','.shop-asesoria-inline','.shop-favoritos-enlace','.conteo'].map(s=>{const r=e.querySelector(s)!.getBoundingClientRect();return [s,{x:r.x,y:r.y,right:r.right,bottom:r.bottom}];})));
  const antes=await posiciones();
  if(width<=850){
   expect(Math.abs(antes['.shop-orden'].y-antes['.shop-abrir-filtros'].y)).toBeLessThan(1);
   await expect(page.locator('.shop-controles-tienda>.shop-favoritos-enlace')).toBeHidden();
   await expect(page.locator('.favoritos-nav-movil')).toBeVisible();
   await expect(page.locator('.favoritos-nav-movil')).toHaveAttribute('href','/favoritos');
   await expect(page.locator('.shop-orden>span')).toHaveText(idioma==='es'?'Ordenar:':'Sort by:');
   expect(Math.abs(antes['.shop-asesoria-inline'].y-antes['.conteo'].y)).toBeLessThan(1);
   expect(antes['.conteo'].right).toBeLessThanOrEqual(antes['.shop-asesoria-inline'].x+1);
   expect(antes['.shop-orden'].right).toBeCloseTo(antes['.shop-asesoria-inline'].right,0);
  }
  const boton=page.locator('.shop-producto .producto-acciones button[aria-pressed]').first();await expect(boton).toBeEnabled();
  await boton.click({force:true});await expect(page.locator('.shop-favoritos-contador')).toHaveText('1');expect(await posiciones()).toEqual(antes);
  await boton.click({force:true});await expect(page.locator('.shop-favoritos-enlace')).toBeHidden();expect(await posiciones()).toEqual(antes);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});
