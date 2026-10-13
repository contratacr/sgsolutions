import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`error de casilla cercano y limpieza ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);await page.goto('/tienda');await expect(page.locator('.shop-orden select')).toBeEnabled();await page.locator('.shop-producto button').first().click();await page.goto('/pagar');
 const casilla=page.locator('input[name=consentimiento]');await casilla.evaluate((el:HTMLInputElement)=>el.reportValidity());
 const etiqueta=casilla.locator('..'),error=etiqueta.locator('.validacion-campo-error');await expect(error).toBeVisible();await expect(casilla).toHaveAttribute('aria-describedby',/validacion/);
 const texto=await etiqueta.locator('span:not(.validacion-campo-error)').first().boundingBox(),mensaje=await error.boundingBox();expect(mensaje!.y-(texto!.y+texto!.height)).toBeLessThanOrEqual(6);expect(mensaje!.y-(texto!.y+texto!.height)).toBeGreaterThanOrEqual(0);
 await casilla.check();await expect(error).toHaveCount(0);await expect(etiqueta).not.toHaveClass(/validacion-opcion-con-error/);
 const nombre=page.locator('input[name=nombre]');await nombre.fill('');await nombre.evaluate((el:HTMLInputElement)=>el.reportValidity());await expect(nombre.locator('..').locator('.validacion-campo-error')).toBeVisible();await nombre.fill('Ana');await expect(nombre.locator('..').locator('.validacion-campo-error')).toHaveCount(0);
});
