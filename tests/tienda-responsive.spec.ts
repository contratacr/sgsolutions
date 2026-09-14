import {test,expect} from '@playwright/test';

test('tarjetas alineadas y desplazamiento móvil en ambos idiomas',async({page},info)=>{
 await page.goto('/tienda');
 for(const idioma of ['es','en']){
  if(idioma==='en') await page.getByRole('button',{name:'Read this page in English'}).click();
  await expect(page.locator('.shop-producto')).toHaveCount(24);
  await expect(page.locator('.marcas-controles')).toHaveCount(0);
  const posiciones=await page.locator('.shop-producto').evaluateAll(es=>es.slice(0,3).map(e=>({precio:e.querySelector('.shop-precio')!.getBoundingClientRect().y,boton:e.querySelector('button')!.getBoundingClientRect().y})));
  for(const posicion of posiciones){expect(Math.abs(posicion.precio-posiciones[0].precio)).toBeLessThan(1);expect(Math.abs(posicion.boton-posiciones[0].boton)).toBeLessThan(1);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(info.project.name==='movil'){
   const grid=page.locator('.shop-grid');
   expect(await grid.evaluate(e=>e.scrollWidth>e.clientWidth)).toBe(true);
   await grid.evaluate(e=>e.scrollTo({left:330,behavior:'instant'}));
   await expect.poll(()=>grid.evaluate(e=>e.scrollLeft)).toBeGreaterThan(100);
  }
 }
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('lang','en');
});
