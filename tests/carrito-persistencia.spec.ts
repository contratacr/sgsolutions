import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`carrito conserva cantidades al recargar y recuperar la pestaña ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.goto('/tienda');await page.locator('#buscar-equipo').fill('conector');await expect(page.locator('.shop-producto button.producto-agregar').first()).toBeVisible();await page.locator('.shop-producto button.producto-agregar').first().click();
 await expect(page.locator('.carrito-cantidad')).toHaveText('1');
 const guardado=await page.evaluate(()=>localStorage.getItem('sg-carrito-v1'));
 await page.reload();await expect(page.locator('.carrito-cantidad')).toHaveText('1');
 expect(await page.evaluate(()=>localStorage.getItem('sg-carrito-v1'))).toBe(guardado);
 // Simula restauración de una pestaña cuyo almacenamiento cambió mientras estaba suspendida.
 await page.evaluate(()=>{const datos=JSON.parse(localStorage.getItem('sg-carrito-v1')!);datos[0].cantidad=3;localStorage.setItem('sg-carrito-v1',JSON.stringify(datos));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
 await expect(page.locator('.carrito-cantidad')).toHaveText('3');
 // Un error transitorio de almacenamiento no debe borrar la copia en memoria.
 await page.evaluate(()=>{const original=Storage.prototype.getItem;Storage.prototype.getItem=()=>{throw new Error('storage unavailable');};window.dispatchEvent(new Event('focus'));Storage.prototype.getItem=original;});
 await expect(page.locator('.carrito-cantidad')).toHaveText('3');
 await page.evaluate(()=>{localStorage.setItem('sg-carrito-v1','[]');window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
 await expect(page.locator('.carrito-cantidad')).toHaveCount(0);
});
