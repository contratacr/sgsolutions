import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`Carrito ocupa toda la altura y mantiene sus acciones ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.goto('/tienda');await page.locator('#buscar-equipo').fill('cable');await expect(page.locator('.shop-producto button.producto-agregar').first()).toBeVisible();await expect(page.locator('.shop-orden-trigger')).toBeEnabled();
 await page.locator('.carrito-trigger').click();
 const panel=page.locator('.modal-carrito-panel');
 const comprobar=async()=>{const r=await panel.boundingBox();expect(r!.y).toBe(0);expect(r!.height).toBe(page.viewportSize()!.height);expect(r!.x+r!.width).toBe(page.viewportSize()!.width);};
 await comprobar();await page.keyboard.press('Escape');await expect(page.locator('.carrito-trigger')).toBeFocused();
 for(let i=0;i<6;i++)await page.locator('.shop-producto button.producto-agregar').nth(i).click();
 await page.locator('.carrito-trigger').click();await comprobar();
 const pie=panel.locator('.carrito-resumen'),contenido=panel.locator('.carrito-contenido');
 const antes=await pie.boundingBox();await contenido.evaluate(el=>{el.scrollTop=el.scrollHeight;});
 expect(await pie.boundingBox()).toEqual(antes);
 await expect(panel.getByRole('link',{name:idioma==='es'?'Finalizar compra':'Checkout',exact:true})).toBeVisible();
 expect(await contenido.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
 await panel.locator('.modal-cierre-exterior').click();await expect(panel).toHaveCount(0);
 await expect(page.locator('html')).toHaveAttribute('lang',idioma);
});
