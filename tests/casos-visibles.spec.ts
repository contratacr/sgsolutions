import {test,expect} from '@playwright/test';

for(const idioma of ['es','en'])test(`casos visibles al navegar aunque no funcione la animación ${idioma}`,async({page,context},info)=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.addInitScript(()=>{
  // Simular un navegador que registra elementos pero no entrega eventos de entrada.
  window.IntersectionObserver=class {observe(){}unobserve(){}disconnect(){}takeRecords(){return [];}root=null;rootMargin='';thresholds=[];} as unknown as typeof IntersectionObserver;
 });
 await page.goto('/');
 const menu=page.getByRole('button',{name:idioma==='es'?'Abrir menú':'Open menu',exact:true});
 if(info.project.name==='movil'){
  await menu.click();
  await page.getByRole('dialog').getByRole('link',{name:idioma==='es'?'Casos de éxito':'Success stories',exact:true}).click();
 }else await page.locator('header').getByRole('link',{name:idioma==='es'?'Casos de éxito':'Success stories',exact:true}).click();
 await expect(page).toHaveURL(/\/casos-de-exito$/);
 await expect(page.locator('.caso')).toHaveCount(4);
 const medidas=await page.locator('.historia-foto').evaluateAll(fotos=>fotos.map(foto=>{const r=foto.getBoundingClientRect();return {ancho:r.width,alto:r.height};}));
 for(const medida of medidas){expect(medida.ancho).toBeCloseTo(medidas[0].ancho,0);expect(medida.alto).toBe(medidas[0].alto);}
 await expect(page.locator('.historias [data-revelar-pendiente],.historias [data-revelando]')).toHaveCount(0);
 for(const foto of await page.locator('.historia-foto').all()){
  await foto.scrollIntoViewIfNeeded();
  await expect(foto).toBeVisible();
  await expect(foto).toHaveCSS('opacity','1');
  await expect.poll(()=>foto.locator('img').evaluate(e=>(e as HTMLImageElement).complete&&(e as HTMLImageElement).naturalWidth>0)).toBe(true);
 }
 await page.reload();
 await expect(page.locator('.caso')).toHaveCount(4);
 await expect(page.locator('html')).toHaveAttribute('lang',idioma);
});
