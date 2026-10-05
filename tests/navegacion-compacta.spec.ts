import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`navegación compacta y marcas animadas ${idioma}`,async({page,context},info)=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto('/');await expect(page.locator('.medicion-aviso')).toHaveCount(0);
 if(info.project.name==='movil'){
  const menu=page.locator('.menu-movil');await menu.click();await expect(menu).toHaveAttribute('aria-expanded','true');
  await page.locator('main .entrada').click({position:{x:10,y:10}});await expect(menu).toHaveAttribute('aria-expanded','false');
  await menu.click();await page.keyboard.press('Escape');await expect(menu).toHaveAttribute('aria-expanded','false');await expect(menu).toBeFocused();
 }
 await page.goto('/soluciones');await expect(page.locator('.solucion-necesidad svg.lucide')).toHaveCount(4);
 const pista=page.locator('.marcas-pista');await expect(pista).toHaveAttribute('data-lista','true');
 await page.mouse.move(0,0);await expect(pista).toHaveCSS('animation-play-state','running');
 const inicial=await pista.evaluate(e=>getComputedStyle(e).transform);
 await expect.poll(()=>pista.evaluate(e=>getComputedStyle(e).transform)).not.toBe(inicial);
 await page.locator('.marcas-grupo').first().getByRole('button',{name:idioma==='es'?'Ver productos de Lenovo':'View Lenovo products',exact:true}).focus();
 await page.keyboard.press('Enter');await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','false');
 await expect.poll(()=>page.locator('.shop-grid').evaluate(e=>Math.round(e.getBoundingClientRect().top))).toBeGreaterThan(20);
 await expect.poll(()=>page.locator('.shop-grid').evaluate(e=>Math.round(e.getBoundingClientRect().top))).toBeLessThan(250);
 await page.locator('.shop-producto .guardar-seleccion').first().click();
 expect(await page.locator('.carrito-trigger').evaluate(e=>e.getBoundingClientRect().width)).toBe(44);
 await expect(page.locator('.carrito-cantidad')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:`/tmp/sg-navegacion-compacta-${idioma}-${info.project.name}.png`});
 await page.goto('/privacidad');await expect(page.locator('.medicion-aviso')).toHaveCount(0);
 await page.locator('.pie-preferencias').click();await expect(page.locator('.medicion-aviso')).toBeVisible();
 await page.getByRole('button',{name:idioma==='es'?'Rechazar opcionales':'Reject optional tracking',exact:true}).click();
 await page.goto('/terminos');await expect(page.locator('h1')).toBeVisible();
 await page.reload();await expect(page.locator('html')).toHaveAttribute('lang',idioma);
});
