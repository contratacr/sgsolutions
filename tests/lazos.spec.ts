import {test,expect} from '@playwright/test';

for(const idioma of ['es','en'])test(`inicio visible sin animaciones ${idioma}`,async({page,context})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');
 await expect(page.locator('.inicio-portada h1')).toBeVisible();
 await expect(page.locator('.inicio-triptico-paneles')).toBeVisible();
 await expect(page.locator('.inicio-caso,.inicio-cierre')).toHaveCount(0);
 expect(await page.evaluate(()=>scrollY)).toBe(0);
});
