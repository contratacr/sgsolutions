import {test,expect} from '@playwright/test';

test('tarjetas alineadas y cuadrícula móvil en ambos idiomas',async({page},info)=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto('/tienda');
 for(const idioma of ['es','en']){
  if(idioma==='en'){
   await page.getByRole('button',{name:'Read this page in English'}).click();
   await expect(page.locator('html')).toHaveAttribute('lang','en');
  }
  await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','false');
  await expect(page.locator('.shop-producto')).toHaveCount(24);
  await expect(page.locator('.marcas-controles')).toHaveCount(0);
  await expect(page.locator('.marcas-grupo')).toHaveCount(2);
  // También deben cargar los logos fuera de pantalla antes de entrar en la cinta.
  await expect.poll(()=>page.locator('.marca-logo img').evaluateAll(imgs=>imgs.every(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0))).toBe(true);
  await expect(page.locator('.marcas-pista')).toHaveCSS('animation-name','marcas-deslizar');
  // Measure final geometry, rather than the staggered scroll entrance frames.
  await page.evaluate(()=>document.querySelector('.shop-producto')?.scrollIntoView({block:'center'}));
  await expect.poll(()=>page.locator('.shop-producto[data-revelando]').count()).toBe(0);
  const posiciones=await page.locator('.shop-producto').evaluateAll(es=>es.slice(0,innerWidth<=650?2:3).map(e=>({precio:e.querySelector('.shop-precio')!.getBoundingClientRect().y,boton:e.querySelector('button')!.getBoundingClientRect().y})));
  for(const posicion of posiciones){expect(Math.abs(posicion.precio-posiciones[0].precio)).toBeLessThan(1);expect(Math.abs(posicion.boton-posiciones[0].boton)).toBeLessThan(1);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(info.project.name==='movil'){
   const grid=page.locator('.shop-grid');
   expect(await grid.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
   const cajas=await page.locator('.shop-producto').evaluateAll(es=>es.slice(0,3).map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y})));
   expect(cajas[1].x).toBeGreaterThan(cajas[0].x);expect(cajas[2].y).toBeGreaterThan(cajas[0].y);
  }
 }
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('lang','en');
});

test('cinta espera imágenes lentas y mantiene continuidad al cerrar el bucle',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 let liberar!:()=>void;
 const espera=new Promise<void>(resolve=>{liberar=resolve;});
 await page.route('**/imagenes/marcas/**',async route=>{await espera;await route.continue();});
 await page.goto('/tienda',{waitUntil:'domcontentloaded'});
 const pista=page.locator('.marcas-pista');
 await expect(pista).toHaveCSS('animation-play-state','paused');
 liberar();
 await expect(pista).toHaveAttribute('data-lista','true');
 await expect(pista).toHaveCSS('animation-play-state','running');
 const salto=await pista.evaluate(e=>{
  const a=e.getAnimations()[0];a.pause();
  const duracion=Number(a.effect!.getTiming().duration);
  const grupos=e.querySelectorAll('.marcas-grupo');
  a.currentTime=duracion-1;
  const antes=grupos[1].getBoundingClientRect().left;
  a.currentTime=duracion;
  return Math.abs(grupos[0].getBoundingClientRect().left-antes);
 });
 expect(salto).toBeLessThan(1);
});

 test('vista y filtros se conservan al regresar de una ficha',async({page})=>{
 await page.goto('/tienda');await page.getByRole('searchbox').fill('Lenovo');await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','false');await page.getByRole('button',{name:'Lista',exact:true}).click();await page.locator('.shop-producto').first().scrollIntoViewIfNeeded();await expect.poll(()=>page.locator('.shop-producto[data-revelando]').count()).toBe(0);await page.locator('.shop-producto h3 a').first().click();await expect(page).toHaveURL(/tienda\/.+/);await page.goBack();await expect(page.getByRole('searchbox')).toHaveValue('Lenovo');await expect(page.locator('.shop-grid')).toHaveAttribute('data-vista','lista');
 await page.getByRole('button',{name:'Read this page in English'}).click();await expect(page.getByRole('button',{name:'List',exact:true})).toHaveAttribute('aria-pressed','true');
 });
