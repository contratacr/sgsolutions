import {test,expect} from '@playwright/test';
for(const idioma of ['es','en']){
 test(`activación vencida segura y adaptable ${idioma}`,async({page,context})=>{
  await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
  await page.goto('/admin/activar#error=access_denied&error_code=otp_expired');
  await expect(page.locator('.acceso [role="alert"]')).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/activar$/);
  await expect(page.locator('html')).toHaveAttribute('lang',idioma);
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.locator('.acceso a[href="/admin"]').click();
  await expect(page).toHaveURL(/\/admin$/);
 });
}
