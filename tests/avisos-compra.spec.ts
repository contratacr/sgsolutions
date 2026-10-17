import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`avisos y contadores coherentes con cierre automático ${idioma}`,async({page,context,baseURL,isMobile},info)=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);await page.goto('/tienda');
 await page.locator('#buscar-equipo').fill('FXXDCFH1001C');
 const tarjeta=page.locator('.shop-producto').filter({hasText:'FXXDCFH1001C'}),favorito=tarjeta.locator('[aria-pressed]');
 await expect(favorito).toBeEnabled();await tarjeta.hover();
 await page.clock.install();await favorito.click();await page.mouse.move(0,0);
 const aviso=page.locator('.accion-confirmacion');await expect(aviso).toHaveCount(1);await expect(page.locator('.favoritos-confirmacion')).toBeVisible();
 const estilo=await aviso.evaluate(e=>{const s=getComputedStyle(e);return {fondo:s.backgroundColor,borde:s.borderRadius,padding:s.padding,width:s.width,top:s.top,right:s.right};});
 const insignia=page.locator('.favoritos-nav-movil .indicador-cantidad');await expect(insignia).toHaveText('1');
 if(isMobile){await aviso.locator('strong').tap();await page.clock.fastForward(5100);await expect(aviso).toHaveCount(0);}
 else{
  await aviso.hover();await page.clock.fastForward(6000);await expect(aviso).toBeVisible();
  await page.mouse.move(0,0);await page.clock.fastForward(5100);await expect(aviso).toHaveCount(0);
 }
 await tarjeta.hover();await tarjeta.locator('button.producto-agregar').click();await page.mouse.move(0,0);await expect(page.locator('.carrito-confirmacion')).toBeVisible();
 expect(await aviso.evaluate(e=>{const s=getComputedStyle(e);return {fondo:s.backgroundColor,borde:s.borderRadius,padding:s.padding,width:s.width,top:s.top,right:s.right};})).toEqual(estilo);
 const comparar=(e:Element)=>{const s=getComputedStyle(e);return [s.backgroundColor,s.color,s.height,s.minWidth,s.fontSize,s.borderRadius];};
 expect(await page.locator('.carrito-cantidad').evaluate(comparar)).toEqual(await insignia.evaluate(comparar));
 await page.screenshot({path:`.privado/aviso-carrito-${info.project.name}-${idioma}.png`});
 // A new favorite replaces the cart confirmation instead of stacking another message.
 await tarjeta.hover();await favorito.click();await favorito.click();await page.mouse.move(0,0);
 await expect(aviso).toHaveCount(1);await expect(page.locator('.favoritos-confirmacion')).toBeVisible();await expect(page.locator('.carrito-confirmacion')).toHaveCount(0);
 await page.screenshot({path:`.privado/aviso-favoritos-${info.project.name}-${idioma}.png`});
 await aviso.locator('a').focus();await page.clock.fastForward(6000);await expect(aviso).toBeVisible();
 await page.locator('#buscar-equipo').focus();await page.clock.fastForward(5100);await expect(aviso).toHaveCount(0);
 await tarjeta.hover();await tarjeta.locator('button.producto-agregar').click();await page.mouse.move(0,0);await expect(aviso).toHaveCount(1);
 await page.clock.fastForward(5100);await expect(aviso).toHaveCount(0);
 await expect(page.locator('.carrito-cantidad')).toHaveText('2');await expect(insignia).toHaveText('1');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
