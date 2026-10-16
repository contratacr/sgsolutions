import {test,expect} from '@playwright/test';
import type {CatalogoPublico} from '../src/lib/catalogo-modelo';

for(const idioma of ['es','en'])test(`buscar y paginar no alterna productos al actualizar recomendaciones ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 const catalogo=await(await page.request.get('/api/catalogo')).json();
 const base=catalogo.productos[0] as CatalogoPublico['productos'][number];
 expect(base).toBeTruthy();
 const paginas:number[]=[];
 await page.route('**/api/catalogo?**',async route=>{
  const params=new URL(route.request().url()).searchParams;
  if(params.get('q')!=='camara'){await route.continue();return;}
  const pagina=Number(params.get('pagina')||1);paginas.push(pagina);
  const productos=Array.from({length:24},(_,i)=>({...base,id:`qa-camara-${pagina}-${i}`,slug:`qa-camara-${pagina}-${i}`,nombre:{es:`Cámara ${pagina} ${i}`,en:`Camera ${pagina} ${i}`}}));
  await route.fulfill({json:{productos,total:48,pagina,paginas:2}});
 });
 await page.goto('/tienda');
 await page.locator('#buscar-equipo').fill('camara');
 const primero=page.locator('.shop-grid .shop-producto h3').first();
 const prefijo=idioma==='es'?'Cámara':'Camera';
 await expect(primero).toHaveText(`${prefijo} 1 0`);
 const siguiente=page.locator('.shop-paginacion button').last(),anterior=page.locator('.shop-paginacion button').first();
 await siguiente.click();
 await expect(primero).toHaveText(`${prefijo} 2 0`);
 // The old feedback loop dispatched a new page-1 query within the next render.
 await page.waitForTimeout(700);
 await expect(primero).toHaveText(`${prefijo} 2 0`);
 await expect(siguiente).toBeDisabled();
 await anterior.click();await expect(primero).toHaveText(`${prefijo} 1 0`);
 await siguiente.click();await expect(primero).toHaveText(`${prefijo} 2 0`);
 await page.locator('.shop-grid .shop-producto').nth(12).scrollIntoViewIfNeeded();
 const posicion=await page.evaluate(()=>scrollY);
 await page.waitForTimeout(1200);
 await expect(primero).toHaveText(`${prefijo} 2 0`);
 expect(paginas).toEqual([1,2,1,2]);
 expect(Math.abs(await page.evaluate(()=>scrollY)-posicion)).toBeLessThan(2);
 await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','false');
 await expect(page.locator('.shop-grid .producto-agregar').first()).toBeEnabled();
 // An actual search change must still reset the page.
 await page.locator('#buscar-equipo').fill('camara ');
 await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','false');
 await expect(page.locator('.shop-paginacion button').first()).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

for(const idioma of ['es','en'])for(const conBusqueda of [false,true])test(`categoría de tres páginas conserva la selección ${idioma} búsqueda ${conBusqueda}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 const catalogo=await(await page.request.get('/api/catalogo')).json();
 const base=catalogo.productos[0] as CatalogoPublico['productos'][number];
 expect(base).toBeTruthy();
 const peticiones:{categoria:string;pagina:number;q:string}[]=[];
 await page.route('**/api/catalogo?**',async route=>{
  const params=new URL(route.request().url()).searchParams;
  const categoria=params.get('categoria');
  if(!categoria||categoria==='todos'){await route.continue();return;}
  const pagina=Number(params.get('pagina')||1);peticiones.push({categoria,pagina,q:params.get('q')||''});
  const productos=Array.from({length:24},(_,i)=>({...base,categoria,id:`qa-categoria-${pagina}-${i}`,slug:`qa-categoria-${pagina}-${i}`,nombre:{es:`Equipo ${pagina} ${i}`,en:`Equipment ${pagina} ${i}`}}));
  await route.fulfill({json:{productos,total:72,pagina,paginas:3}});
 });
 await page.goto('/tienda');await expect(page.locator('#buscar-equipo')).toBeEnabled();
 if(conBusqueda){await page.locator('#buscar-equipo').fill('camara');await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','false');}
 const abrir=page.locator('.shop-abrir-filtros');
 if(await abrir.isVisible()){
  await abrir.click();await page.locator('dialog .shop-categoria-rama > button').first().click();
  await page.locator('.shop-panel-filtros-acciones > button').click();
 }else await page.locator('.shop-sidebar .shop-categoria-rama > button').first().click();
 const primero=page.locator('.shop-grid .shop-producto h3').first(),prefijo=idioma==='es'?'Equipo':'Equipment';
 await expect(primero).toHaveText(`${prefijo} 1 0`);
 const categoria=peticiones[0].categoria;
 const botones=page.locator('.shop-paginacion button');
 for(const [direccion,pagina] of [['next',2],['next',3],['previous',2],['previous',1],['next',2],['next',3]] as const){
  await (direccion==='next'?botones.last():botones.first()).click();
  await expect(primero).toHaveText(`${prefijo} ${pagina} 0`);
  await page.waitForTimeout(500);
  await expect(primero).toHaveText(`${prefijo} ${pagina} 0`);
 }
 await page.waitForTimeout(1200);
 expect(peticiones.map(p=>p.pagina)).toEqual([1,2,3,2,1,2,3]);
 expect(peticiones.every(p=>p.categoria===categoria&&p.q===(conBusqueda?'camara':''))).toBe(true);
 await expect(botones.last()).toBeDisabled();
 await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','false');
 await expect(page.locator('.shop-grid .producto-agregar').first()).toBeEnabled();
});
