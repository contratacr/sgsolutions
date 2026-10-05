import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`catálogo inmediato y skeleton recuperable con red lenta ${idioma}`,async({page,context})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 let peticiones=0;
 page.on('request',r=>{if(r.url().includes('/api/catalogo?'))peticiones++;});
 await page.goto('/soluciones');
 await expect(page.locator('.shop-producto')).toHaveCount(24);
 await expect(page.locator('.carga-esqueleto')).toHaveCount(0);
 await page.waitForTimeout(400);
 expect(peticiones).toBe(0);
 let liberar!:()=>void;const espera=new Promise<void>(r=>{liberar=r;});
 await page.route('**/api/catalogo?**',async r=>{await espera;await r.continue();});
 await page.getByRole('searchbox').fill('Lenovo');
 await expect(page.locator('.carga-esqueleto[role=status]')).toBeVisible();
 await expect(page.locator('.esqueleto-producto')).toHaveCount(6);
 await expect(page.locator('.estado-carga')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(page.locator('.esqueleto').first()).toHaveCSS('animation-name','none');
 await page.locator('.carga-esqueleto').scrollIntoViewIfNeeded();
 await page.screenshot({path:`/tmp/sg-skeleton-${idioma}-${test.info().project.name}.png`});
 liberar();await expect(page.locator('.carga-esqueleto')).toHaveCount(0);
 await expect(page.locator('.shop-producto').first()).toContainText('Lenovo');
 await page.getByRole('searchbox').fill('');
 await expect(page.locator('.shop-producto')).toHaveCount(24);
});

test('carrito guardado no aparece vacío mientras consulta productos',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('sg-carrito-v1',JSON.stringify([{id:'producto-pendiente-qa',cantidad:1}])));
 let liberar!:()=>void;const espera=new Promise<void>(r=>{liberar=r;});
 await page.route('**/api/catalogo?ids=**',async r=>{await espera;await r.fulfill({json:{productos:[]}});});
 await page.goto('/soluciones');
 await page.getByRole('button',{name:'Abrir carrito',exact:true}).click();
 await expect(page.locator('.carrito-esqueleto')).toBeVisible();
 await expect(page.locator('.carrito-vacio')).toHaveCount(0);
 liberar();await expect(page.locator('.carrito-esqueleto')).toHaveCount(0);
 await expect(page.locator('.carrito-panel')).toContainText('no está disponible');
});
