import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`teléfono separado y número internacional ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);await page.goto('/tienda');await page.locator('#buscar-equipo').fill('conector');await expect(page.locator('.shop-producto button.producto-agregar').first()).toBeVisible();await expect(page.locator('.shop-orden-trigger')).toBeEnabled();await page.locator('.shop-producto button').first().click();await page.goto('/pagar');
 const campo=page.locator('.campo-telefono').first(),numero=campo.locator('input[type=tel]'),pais=campo.locator('select'),valor=campo.locator('input[type=hidden]');
 await expect(page.locator('input[name=identificacion]')).toBeVisible();
 const tipo=await page.locator('select[name=tipoIdentificacion]').boundingBox(),identificacion=await page.locator('input[name=identificacion]').boundingBox();
 if((page.viewportSize()?.width??0)>760){expect(Math.abs(tipo!.y-identificacion!.y)).toBeLessThan(2);expect(Math.abs(tipo!.height-identificacion!.height)).toBeLessThan(2);}
 await expect(pais).toHaveValue('CR');await expect(pais.locator('option:checked')).toHaveAttribute('label','+506');await expect(pais).toHaveAccessibleName(/Costa Rica/);expect((await pais.boundingBox())!.width).toBeGreaterThanOrEqual(100);await expect(numero).toHaveValue('');await numero.fill('86065342');await expect(valor).toHaveValue('+50686065342');await numero.fill('860653429999');await expect(numero).toHaveValue('86065342');
 await numero.fill('123');await numero.evaluate((el:HTMLInputElement)=>el.reportValidity());await expect(campo.locator('..').locator('.validacion-campo-error')).toContainText(idioma==='es'?'8 dígitos':'8 digits');
 await pais.selectOption('US');await numero.fill('2025550123');await expect(valor).toHaveValue('+12025550123');await numero.fill('2025550123999');await expect(numero).toHaveValue('2025550123');
 await numero.fill('+34 612 345 678');await expect(pais).toHaveValue('ES');await expect(numero).toHaveValue('612345678');await expect(valor).toHaveValue('+34612345678');
 const correo=page.locator('input[name=correo]');await correo.fill('cliente@dominio');await correo.evaluate((el:HTMLInputElement)=>el.reportValidity());await expect(correo.locator('..').locator('.validacion-campo-error')).toBeVisible();await correo.fill('cliente@example.com');await expect(correo.locator('..').locator('.validacion-campo-error')).toHaveCount(0);
 await numero.fill('');await expect(valor).toHaveValue('');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
