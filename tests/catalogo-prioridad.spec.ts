import {test,expect} from '@playwright/test';
import {writeFile,unlink} from 'node:fs/promises';
import base from '../src/lib/catalogo-base.json';
import {esquemaCatalogo} from '../src/lib/catalogo-modelo';
import fotos from '../src/lib/imagenes-productos-verificadas.json';
const archivo='.privado/contenido-pruebas/catalogo.json';
test.afterEach(async()=>{await unlink(archivo).catch(()=>{});});
for(const idioma of ['es','en'] as const){
 test('oferta prioritaria estable al hidratar, resolver favoritos y volver de una ficha '+idioma,async({page,context})=>{
  const c=esquemaCatalogo.parse(base),foto=fotos.find(f=>c.productos.some(p=>p.id===f.id))!,modelo=c.productos.find(p=>p.id===foto.id)!;
  const manual=(id:string,nombre:string,categoria:string)=>({...modelo,id,origen:'manual' as const,slug:id,categoria,imagen:foto.imagen,codigoEurocomp:undefined,eurocomp:undefined,codigoIntcomex:undefined,proveedor:undefined,coleccion:undefined,nombre:{es:nombre,en:nombre},precioManual:25000,precioDescuento:null,publicado:true,destacado:false});
  const anterior=manual('manual-anterior','QA anterior','computadoras');
  const oferta={...manual('manual-oferta','QA oferta','redes'),ofertaPrioritaria:true,precioDescuento:20000,ofertaInicio:'2020-01-01T00:00:00Z',ofertaFin:'2099-01-01T00:00:00Z'};
  c.productos=[anterior,oferta];
  await writeFile(archivo,JSON.stringify({contenido:c,revision:1}),{mode:0o600});
  await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
  await context.route('https://**/*',route=>route.abort());
  await page.addInitScript(()=>{
   localStorage.setItem('sg-favoritos-invitado',JSON.stringify(['manual-anterior']));
   const muestras:string[]=[];Object.assign(window,{primeros:muestras});
   const tomar=()=>{const texto=document.querySelector('.shop-grid .shop-producto h3')?.textContent?.trim();if(texto&&muestras.at(-1)!==texto)muestras.push(texto);};
   new MutationObserver(tomar).observe(document,{childList:true,subtree:true});
  });
  const consultas:string[]=[];page.on('request',r=>{if(r.url().includes('/api/catalogo?')&&new URL(r.url()).searchParams.has('pagina'))consultas.push(r.url());});
  await page.goto('/tienda');await expect(page.locator('#buscar-equipo')).toBeEnabled();
  await expect(page.locator('.shop-grid .shop-producto h3').first()).toHaveText('QA oferta');
  await page.waitForTimeout(400);
  expect(await page.evaluate(()=>Reflect.get(window,'primeros'))).toEqual(['QA oferta']);expect(consultas).toEqual([]);
  await page.locator('.shop-grid h3 a[href="/tienda/manual-anterior"]').click();
  await expect(page.locator('.ficha-pagina')).toBeVisible();
  // Viewing a product records session interests; returning must not rerank the catalogue.
  const similares=await page.locator('.recomendaciones h3').allTextContents();await page.waitForTimeout(300);expect(await page.locator('.recomendaciones h3').allTextContents()).toEqual(similares);
  await page.locator('.recomendaciones h3 a[href="/tienda/manual-oferta"]').click();
  await expect(page.locator('.ficha-pagina h1')).toHaveText('QA oferta');
  await expect(page.locator('.recomendaciones h3 a[href="/tienda/manual-oferta"]')).toHaveCount(0);
  await expect(page.locator('.recomendaciones h3 a[href="/tienda/manual-anterior"]')).toBeVisible();
  await page.goBack();
  await page.goBack();
  await expect(page.locator('.shop-grid .shop-producto h3').first()).toHaveText('QA oferta');await page.waitForTimeout(400);
  expect(consultas.some(q=>new URL(q).searchParams.has('explorados'))).toBe(false);
  await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','false');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 });
 test('consulta lenta muestra skeleton, nunca tarjetas del filtro anterior, y descarta respuestas obsoletas '+idioma,async({page,context,request})=>{
  await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
  await context.route('https://**/*',route=>route.abort());
  const inicial=await(await request.get('/api/catalogo')).json(),producto=inicial.productos[0];
  let liberar!:()=>void;const pendiente=new Promise<void>(r=>liberar=r);
  const consultas:string[]=[];
  await page.route('**/api/catalogo?**',async route=>{
   const p=new URL(route.request().url()).searchParams;
   if(!p.has('pagina')||!['lenta','reciente'].includes(p.get('q')??'')){await route.continue();return;}
   const q=p.get('q')!;consultas.push(q);if(q==='lenta')await pendiente;
   await route.fulfill({json:{...inicial,total:1,pagina:1,paginas:1,productos:[{...producto,id:'manual-'+q,nombre:{es:'QA '+q,en:'QA '+q}}]}}).catch(()=>{});
  });
  await page.goto('/tienda');await page.locator('#buscar-equipo').fill('lenta');await page.locator('#buscar-equipo').press('Escape');
  await expect(page.locator('.shop-resultados .carga-esqueleto')).toBeVisible();await expect(page.locator('.shop-grid .shop-producto')).toHaveCount(0);
  await expect.poll(()=>consultas.includes('lenta')).toBe(true);
  await page.locator('#buscar-equipo').fill('reciente');await page.locator('#buscar-equipo').press('Escape');
  await expect(page.locator('.shop-grid .shop-producto h3').first()).toHaveText('QA reciente');
  liberar();await page.waitForTimeout(400);await expect(page.locator('.shop-grid .shop-producto h3').first()).toHaveText('QA reciente');
  await expect(page.locator('.shop-resultados .carga-esqueleto')).toHaveCount(0);await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','false');
 });
}
