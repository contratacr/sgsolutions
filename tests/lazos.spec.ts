import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`lazos animados desde la carga sin interacción ${idioma}`,async({page,context})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.goto('/');
 await expect(page.locator('.escenario')).toHaveAttribute('data-escena','3d');
 await expect(page.locator('.escena-canvas canvas')).toBeVisible();
 const primero=await page.screenshot();
 await page.waitForTimeout(1200);
 const segundo=await page.screenshot();
 expect(primero.equals(segundo)).toBeFalsy();
 expect(await page.evaluate(()=>scrollY)).toBe(0);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForTimeout(300);
 const quieto=await page.screenshot();
 await page.waitForTimeout(500);
 expect(quieto.equals(await page.screenshot())).toBeTruthy();
});

