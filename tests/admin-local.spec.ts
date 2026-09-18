import {test,expect} from '@playwright/test';
test.describe.configure({mode:'serial'});
for(const idioma of ['es','en'])test(`administración local ${idioma}`,async({page,context})=>{
 test.skip(!process.env.SG_PRUEBA_CLAVE,'Requiere cuenta local de prueba');
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.goto('/panel');await expect(page).toHaveURL(/\/admin$/);
 await page.locator('[name="correo"]').fill('lsanchez@sgsolutionscr.com');
 await page.locator('[name="clave"]').fill(process.env.SG_PRUEBA_CLAVE!);
 await page.locator('main form button').click();await expect(page).toHaveURL(/\/panel$/);
 await expect(page.getByRole('heading',{level:1})).toBeVisible();
 for(const ruta of ['/panel/catalogo','/panel/contenido']){
  await page.goto(ruta);await expect(page.locator('.admin-actions button').first()).toBeVisible();
  await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);
  await expect(page.locator('[data-cerrar-sesion] button')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  await page.locator('.admin-item summary').first().click();
  const campo=page.locator('.admin-item textarea').first();
  const original=await campo.inputValue();
  await campo.fill(original+' QA');
  await page.locator('.admin-actions button').first().click();
  await expect(page.locator('.admin-actions:visible [role="status"]')).toHaveText(idioma==='es'?/guardad/i:/saved/i,{timeout:30000});
  await page.reload();await expect(page.locator('.admin-actions button').first()).toBeVisible();
  await page.locator('.admin-item summary').first().click();
  await expect(page.locator('.admin-item textarea').first()).toHaveValue(original+' QA');
  await page.locator('.admin-item textarea').first().fill(original);
  await page.locator('.admin-actions button').first().click();
  await expect(page.locator('.admin-actions:visible [role="status"]')).toHaveText(idioma==='es'?/guardad/i:/saved/i);
 }
 await page.goto('/panel');await page.screenshot({path:`evidencias/admin-${idioma}-${page.viewportSize()?.width}.png`});await page.locator('[data-cerrar-sesion] button').click();await expect(page).toHaveURL(/\/admin$/);
 await page.goto('/panel/contenido');await expect(page).toHaveURL(/\/admin$/);
 await page.goto('/acceso');await expect(page).toHaveURL(/\/admin$/);
});
