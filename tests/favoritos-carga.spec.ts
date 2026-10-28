import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`favoritos aparecen juntos y quitar uno conserva los demás ${idioma}`,async({page,context,request,baseURL},info)=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 // The layout already has page one cached; page two supplies a missing favorite.
 const primera=await (await request.get('/api/catalogo')).json();
 const segunda=await (await request.get('/api/catalogo?pagina=2')).json();
 const conocido=primera.productos[0],pendiente=segunda.productos.find((p:{id:string})=>!primera.productos.some((x:{id:string})=>x.id===p.id));
 expect(pendiente).toBeTruthy();
 const ids=[conocido.id,pendiente.id];
 await page.addInitScript(ids=>localStorage.setItem('sg-favoritos-invitado',JSON.stringify(ids)),ids);
 await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 let liberar!:()=>void,solicitud!:()=>void;
 const bloqueada=new Promise<void>(r=>solicitud=r),puerta=new Promise<void>(r=>liberar=r);
 await page.route('**/api/catalogo?ids=*',async route=>{
  solicitud();await puerta;await route.fulfill({json:{productos:[conocido,pendiente]}});
 });
 await page.goto('/favoritos');await bloqueada;
 const tarjetas=page.locator('.favoritos-grid .shop-producto');
 await expect(page.locator('.favoritos-seccion .carga-esqueleto')).toBeVisible();
 await expect(tarjetas).toHaveCount(0);
 await expect(page.locator('.favoritos-vacio')).toHaveCount(0);
 await expect(page.locator('.favoritos-invitado')).toHaveCount(0);
 await page.evaluate(()=>{
  const raiz=document.querySelector('.favoritos-seccion')!;
  const conteos:number[]=[];
  const observar=()=>conteos.push(raiz.querySelectorAll('.favoritos-grid .shop-producto').length);
  (window as unknown as {conteosFavoritos:number[]}).conteosFavoritos=conteos;
  new MutationObserver(observar).observe(raiz,{subtree:true,childList:true});
 });
 liberar();await expect(tarjetas).toHaveCount(2);
 expect(await page.evaluate(()=>(window as unknown as {conteosFavoritos:number[]}).conteosFavoritos)).not.toContain(1);
 await expect(page.locator('.favoritos-invitado')).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('lang',idioma);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:`.privado/favoritos-carga-${info.project.name}-${idioma}.png`,fullPage:true});
 await page.unroute('**/api/catalogo?ids=*');
 let liberarQuitar!:()=>void;
 const puertaQuitar=new Promise<void>(r=>liberarQuitar=r);
 await page.route('**/api/catalogo?ids=*',async route=>{await puertaQuitar;await route.fulfill({json:{productos:[pendiente]}});});
 await tarjetas.first().hover();await tarjetas.first().locator('[aria-pressed]').click();
 await expect(tarjetas).toHaveCount(1);
 await expect(page.locator('.favoritos-seccion .carga-esqueleto')).toHaveCount(0);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('sg-favoritos-invitado')??'[]'))).toEqual([pendiente.id]);
 liberarQuitar();await expect(tarjetas).toHaveCount(1);
 expect(await page.evaluate(()=>(window as unknown as {conteosFavoritos:number[]}).conteosFavoritos.slice(1))).not.toContain(0);
});
