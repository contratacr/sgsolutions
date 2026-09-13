import {test,expect} from '@playwright/test';

test('una foto remota fallida muestra respaldo accesible en ES y EN',async({page})=>{
 await page.route('https://store.intcomex.com/**',route=>route.abort());
 await page.route('https://p3-ofp.static.pub/**',route=>route.abort());
 await page.goto('/tienda');
 await page.locator('#buscar-equipo').fill('GY51S61921');
 await expect(page.locator('.shop-producto')).toHaveCount(1);
 const foto=page.locator('.shop-foto img');
 await foto.scrollIntoViewIfNeeded();
 await expect(foto).toHaveAttribute('src','/imagenes/producto-sin-imagen.svg');
 await expect(page.locator('.shop-imagen-pendiente')).toBeVisible();
 const espanol=await page.locator('.shop-imagen-pendiente').textContent();
 await expect.poll(()=>foto.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
 await page.getByRole('button',{name:'Read this page in English'}).click();
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await page.locator('#buscar-equipo').fill('GY51S61921');
 await expect(page.locator('.shop-producto')).toHaveCount(1);
 await foto.scrollIntoViewIfNeeded();
 await expect(page.locator('.shop-imagen-pendiente')).not.toHaveText(espanol!);
});
