import {test,expect} from '@playwright/test';
import {rutaPublica} from '../src/lib/analitica-modelo';

test('rutas antiguas redirigen conservando producto y parámetros',async({request})=>{
 for(const sufijo of ['', '/portatil']){
  const respuesta=await request.get(`/soluciones${sufijo}?origen=compartido`,{maxRedirects:0});
  expect(respuesta.status()).toBe(308);
  expect(new URL(respuesta.headers().location,'http://127.0.0.1:3107').pathname).toBe(`/tienda${sufijo}`);
  expect(respuesta.headers().location).toContain('origen=compartido');
 }
 expect(rutaPublica('/tienda')).toBe(true);
 expect(rutaPublica('/tienda/portatil')).toBe(true);
});

for(const idioma of ['es','en'])test(`navegación y enlaces públicos de Soluciones ${idioma}`,async({page,context})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.goto('/tienda');
 await expect(page.locator('html')).toHaveAttribute('lang',idioma);
 await expect(page.locator('a[href="/soluciones"],a[href^="/soluciones/"]')).toHaveCount(0);
 const enlace=page.locator('.shop-producto h3 a').first();
 const ruta=(await enlace.getAttribute('href'))!;
 expect(ruta).toMatch(/^\/tienda\//);
 await enlace.click();
 await expect(page).toHaveURL(new RegExp(ruta+'$'),{timeout:15000});
 await expect(page.locator('html')).toHaveAttribute('lang',idioma);
 await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content',new RegExp('/tienda/'));
 await page.locator('.ficha-volver').click();
 await expect(page).toHaveURL(/\/tienda$/);
 await page.reload();await expect(page.locator('html')).toHaveAttribute('lang',idioma);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
