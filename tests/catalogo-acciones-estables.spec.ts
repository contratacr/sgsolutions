import {test,expect} from '@playwright/test';

for(const idioma of ['es','en'])test(`acciones de producto no parpadean al navegar y ordenar ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 // Sample every painted frame, including React commits and disabled loading states.
 await page.addInitScript(()=>{
  const state={frames:0,flashes:[] as string[]};
  Object.assign(window,{accionesEstables:state});
  function sample(){
   const desktop=matchMedia('(hover:hover) and (pointer:fine)').matches;
   if(!desktop){
    document.querySelectorAll<HTMLElement>('.shop-producto .producto-accion,.shop-producto .producto-agregar').forEach(control=>{
     const opacity=Number(getComputedStyle(control).opacity);
     if(opacity!==1&&state.flashes.length<5)state.flashes.push(`${control.className}: ${opacity}`);
    });
   }
   if(desktop){
    document.querySelectorAll<HTMLElement>('.shop-producto').forEach(card=>{
     if(card.matches(':hover,:focus-within'))return;
     card.querySelectorAll<HTMLElement>('.producto-agregar,.producto-acciones').forEach(control=>{
      let opacity=1,visible=true;
      for(let element:HTMLElement|null=control;element;element=element.parentElement){
       const style=getComputedStyle(element);
       opacity*=Number(style.opacity);
       if(style.visibility!=='visible'||style.display==='none')visible=false;
      }
      if(visible&&opacity>.01&&state.flashes.length<5)state.flashes.push(control.className);
     });
    });
   }
   state.frames++;requestAnimationFrame(sample);
  }
  requestAnimationFrame(sample);
 });
 await page.mouse.move(0,0);
 // A cold entry includes the server-rendered, initially disabled favorite button.
 await page.goto('/tienda');
 await expect(page.locator('.shop-grid .producto-accion').first()).toBeEnabled();
 await page.waitForTimeout(200);
 expect(await page.evaluate(()=>Reflect.get(window,'accionesEstables').flashes)).toEqual([]);
 await page.goto('/soporte');
 // Same-tab App Router navigation, which also mounts the initial product controls.
 await page.evaluate(()=>{
  const link=document.querySelector<HTMLAnchorElement>('header a[href="/tienda"]');
  if(!link)throw new Error('Store navigation missing');
  link.click();
 });
 await expect(page).toHaveURL(/\/tienda$/);
 const sort=page.locator('.shop-orden-trigger'),cards=page.locator('.shop-grid .shop-producto');
 await expect(sort).toBeEnabled();await page.locator('#buscar-equipo').fill('conector');await expect(cards.first().locator('button.producto-agregar')).toBeVisible();
 const desktop=await page.evaluate(()=>matchMedia('(hover:hover) and (pointer:fine)').matches);
 const base=await(await page.request.get('/api/catalogo?q=conector')).json();
 let release!:()=>void;
 const pending=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/catalogo?**',async route=>{
  const params=new URL(route.request().url()).searchParams;
  if(params.get('orden')!=='mayor'){await route.continue();return;}
  await pending;
  // Sold-out controls remain disabled after the request as well.
  await route.fulfill({json:{...base,productos:base.productos.map((p:object)=>({...p,disponibilidad:'agotado'}))}});
 });
 try{
  await sort.click();await page.mouse.move(0,0);await page.locator('[data-orden=mayor]').press('Enter');
  await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','true');
  await expect(cards.first().locator('.producto-agregar')).toBeDisabled();
  await page.waitForTimeout(300);
  expect(await page.evaluate(()=>Reflect.get(window,'accionesEstables').flashes)).toEqual([]);
 }finally{release();}
 await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','false');
 await page.mouse.move(0,0);await page.waitForTimeout(300);
 expect(await page.evaluate(()=>Reflect.get(window,'accionesEstables').flashes)).toEqual([]);
 if(desktop){
  expect(await page.evaluate(()=>Reflect.get(window,'accionesEstables').flashes)).toEqual([]);
  // Keyboard focus still reveals the card, including disabled/sold-out controls.
  await cards.first().locator('.shop-foto>a:not(.producto-agregar)').focus();
  await expect(cards.first().locator('.producto-acciones')).toHaveCSS('opacity','1');
  await expect(cards.first().locator('.producto-agregar')).toHaveCSS('opacity','1');
  await cards.first().locator('.producto-accion').first().focus();
  await expect(cards.first().locator('.producto-accion').first()).toBeFocused();
  await page.locator('#buscar-equipo').focus();
  await cards.first().hover();
  await expect(cards.first().locator('.producto-acciones')).toBeVisible();
 }else{
  // Touch devices must retain persistent controls without requiring hover.
  await expect(cards.first().locator('.producto-agregar')).toBeVisible();
  await expect(cards.first().locator('.producto-acciones')).toBeVisible();
 }
});
