import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`tarjeta redirige desde el formulario sin revisión intermedia ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);let verificaciones=0,inicios=0;
 await page.route('**/api/compra/verificar',async ruta=>{verificaciones++;await ruta.fulfill({json:{id:'qa',token:'qa'}});});
 await page.route('**/api/pagos/tilopay/iniciar',async ruta=>{inicios++;await ruta.fulfill({json:{url:`${baseURL}/?qa=tarjeta-directa`}});});
 await page.goto('/tienda');await expect(page.locator('.shop-orden-trigger')).toBeEnabled();await page.locator('.shop-producto').first().hover();await page.locator('.producto-agregar').first().click();await page.goto('/pagar');
 await page.locator('[name=nombre]').fill('Cliente');await page.locator('[name=apellidos]').fill('QA');await page.locator('[name=correo]').fill('cliente@example.com');await page.locator('.campo-telefono input[type=tel]').fill('88888888');await page.locator('input[value=tarjeta]').check();await page.locator('[name=consentimiento]').check();
 await expect(page.locator('main form button[type=submit]')).toHaveText(idioma==='es'?'Completar pedido':'Complete order');
 await page.locator('main form button[type=submit]').click();await expect(page).toHaveURL(/qa=tarjeta-directa/);expect(verificaciones).toBe(1);expect(inicios).toBe(1);
});
