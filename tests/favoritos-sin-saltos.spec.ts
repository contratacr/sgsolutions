import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`agregar y quitar favoritos no mueve la cabecera ni los productos ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.goto('/tienda?categoria=soluciones-empresariales');
 const boton=page.locator('.shop-producto .producto-acciones button[aria-pressed]').first();
 await expect(boton).toBeEnabled();
 const estado=()=>page.evaluate(()=>({alto:document.querySelector('.shop-resultados-cabecera')!.getBoundingClientRect().height,productos:document.querySelector('.shop-grid')!.getBoundingClientRect().top,orden:document.querySelector('.shop-orden')!.getBoundingClientRect().top}));
 const antes=await estado();await boton.click({force:true});
 await expect(page.locator('.shop-favoritos-contador')).toHaveText('1');
 expect(await estado()).toEqual(antes);
 await boton.click({force:true});await expect(page.locator('.shop-favoritos-enlace')).toBeHidden();
 expect(await estado()).toEqual(antes);
});
