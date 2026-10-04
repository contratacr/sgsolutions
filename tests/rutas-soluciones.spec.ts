import {test,expect} from '@playwright/test';
import {rutaPublica} from '../src/lib/analitica-modelo';

test('rutas antiguas redirigen conservando producto y parámetros',async({request})=>{
 for(const sufijo of ['', '/portatil']){
  const respuesta=await request.get(`/tienda${sufijo}?origen=compartido`,{maxRedirects:0});
  expect(respuesta.status()).toBe(308);
  expect(new URL(respuesta.headers().location,'http://127.0.0.1:3107').pathname).toBe(`/soluciones${sufijo}`);
  expect(respuesta.headers().location).toContain('origen=compartido');
 }
 expect(rutaPublica('/soluciones')).toBe(true);
 expect(rutaPublica('/soluciones/portatil')).toBe(true);
});

for(const idioma of ['es','en'])test(`navegación y enlaces públicos de Soluciones ${idioma}`,async({page,context})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.goto('/soluciones');
 await expect(page.locator('html')).toHaveAttribute('lang',idioma);
 await expect(page.locator('a[href="/tienda"],a[href^="/tienda/"]')).toHaveCount(0);
 const enlace=page.locator('.shop-producto h3 a').first();
 const ruta=(await enlace.getAttribute('href'))!;
 expect(ruta).toMatch(/^\/soluciones\//);
 await enlace.click();
 await expect(page).toHaveURL(new RegExp(ruta+'$'));
 await expect(page.locator('html')).toHaveAttribute('lang',idioma);
 await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content',new RegExp('/soluciones/'));
 const consulta=page.locator('.ficha-compra a[href^="https://wa.me/"]').first();
 const texto=new URL((await consulta.getAttribute('href'))!).searchParams.get('text')!;
 expect(texto).not.toContain('/tienda/');
 await page.locator('.ficha-volver').click();
 await expect(page).toHaveURL(/\/soluciones$/);
 await page.reload();await expect(page.locator('html')).toHaveAttribute('lang',idioma);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
