import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test('rango de precio filtra con teclado y se restablece '+idioma,async({page,context,baseURL},info)=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);await page.goto('/tienda');await expect(page.locator('.shop-orden select')).toBeEnabled();
 const movil=(page.viewportSize()?.width??1440)<650;
 if(movil)await page.locator('.shop-abrir-filtros').click();
 const panel=page.locator(movil?'.shop-panel-filtros':'.shop-sidebar');
 const rango=panel.locator('.shop-precio-rango'),menor=rango.getByRole('slider',{name:idioma==='es'?'Precio mínimo (₡)':'Minimum price (₡)'}),mayor=rango.getByRole('slider',{name:idioma==='es'?'Precio máximo (₡)':'Maximum price (₡)'});
 await expect(rango).toBeVisible();await rango.screenshot({path:info.outputPath('precio.png')});await expect(rango.getByRole('button')).toHaveCount(0);
 const limite=Number(await mayor.getAttribute('max'));
 const respuesta=page.waitForResponse(r=>r.url().includes('/api/catalogo?')&&new URL(r.url()).searchParams.get('max')===String(limite-500));
 await mayor.focus();await mayor.press('ArrowLeft');const datos=await (await respuesta).json();expect(datos.productos.every((p:{precio:number|null})=>p.precio!==null&&p.precio<=limite-500)).toBe(true);
 await expect(page.locator('.shop-filtros-activos button')).toHaveCount(0);await menor.focus();await menor.press('End');expect(Number(await menor.inputValue())).toBeLessThanOrEqual(Number(await mayor.inputValue()));
 await menor.press('Home');await mayor.press('End');await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','false');
 await expect(menor).toHaveValue('0');await expect(mayor).toHaveValue(String(limite));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
