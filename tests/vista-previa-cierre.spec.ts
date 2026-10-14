import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`vista previa no deja ventanas abiertas ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);await page.goto('/tienda');
 const abrir=page.locator('.shop-producto .producto-acciones button:last-child');
 for(let i=0;i<5;i++){await page.locator('.shop-producto').nth(i).hover();await abrir.nth(i).click();await expect(page.locator('.producto-preview')).toHaveCount(1);await page.locator('.producto-preview-cerrar').click();await expect(page.locator('.producto-preview,.producto-preview-overlay')).toHaveCount(0);}
 await page.locator('.shop-producto').first().hover();await abrir.first().click();
 // Simulate competing opens during the same event frame; only the latest may remain.
 await abrir.nth(1).evaluate((boton:HTMLButtonElement)=>boton.click());await expect(page.locator('.producto-preview')).toHaveCount(1);await page.keyboard.press('Escape');await expect(page.locator('.producto-preview,.producto-preview-overlay')).toHaveCount(0);
 await page.locator('.shop-producto').first().hover();await abrir.first().click();await page.locator('.producto-preview-detalles').click();await expect(page).toHaveURL(/\/tienda\/.+/);await expect(page.locator('.producto-preview,.producto-preview-overlay')).toHaveCount(0);
 await page.goBack();await expect(page.locator('.shop-producto').first()).toBeVisible();await expect(page.locator('.producto-preview,.producto-preview-overlay')).toHaveCount(0);
});
