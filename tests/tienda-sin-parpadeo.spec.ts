import {test,expect} from '@playwright/test';

for(const idioma of ['es','en']){
 test(`productos estables al desplazarse y actualizar filtros ${idioma}`,async({page,context})=>{
  await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
  await page.addInitScript(()=>{
   const original=Element.prototype.animate;
   Element.prototype.animate=function(...args:Parameters<Element['animate']>){
    if(this.matches('.shop-producto'))this.setAttribute('data-animacion-producto','1');
    return original.apply(this,args);
   };
  });
  await page.goto('/tienda');
  await expect(page.locator('.shop-orden-trigger')).toBeEnabled();
  const productos=page.locator('.shop-producto');
  await expect(productos.first()).toBeVisible();
  await productos.last().scrollIntoViewIfNeeded();
  await expect(page.locator('.shop-producto[data-animacion-producto],.shop-producto[data-revelar-pendiente]')).toHaveCount(0);
  let liberar!:()=>void;
  const espera=new Promise<void>(r=>{liberar=r;});
  await page.route('**/api/catalogo?**',async ruta=>{await espera;await ruta.continue();});
  const antes=await productos.first().locator('h3').innerText();
  await page.locator('.shop-orden-trigger').click();await page.locator('[data-orden="mayor"]').click();
  await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','true');
  await expect(productos.first().locator('h3')).toHaveText(antes);
  await expect(page.locator('.esqueleto-producto')).toHaveCount(0);
  await expect(productos.first().getByRole('button')).toBeDisabled();
  liberar();
  await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','false');
  await expect(productos.first()).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang',idioma);
 });
}
