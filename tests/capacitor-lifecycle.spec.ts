import {test,expect} from '@playwright/test';
import es from '../messages/es.json';import en from '../messages/en.json';
for(const idioma of ['es','en'])test(`retorno nativo conserva carrito, idioma y borrador sin guardar tarjeta ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.goto('/tienda');await page.locator('#buscar-equipo').fill('conector');await expect(page.locator('.shop-producto button.producto-agregar').first()).toBeVisible();await expect(page.locator('.shop-orden-trigger')).toBeEnabled();await page.locator('.shop-producto').first().hover();await page.locator('.producto-agregar').first().click();
 await expect(page.locator('.carrito-cantidad')).toHaveText('1');
 await page.evaluate(()=>{const items=JSON.parse(localStorage.getItem('sg-carrito-v1')!);items[0].cantidad=3;localStorage.setItem('sg-carrito-v1',JSON.stringify(items));});
 await expect(page.locator('.carrito-cantidad')).toHaveText('1');
 await page.evaluate(()=>window.dispatchEvent(new Event('sg-app-resume')));
 await expect(page.locator('.carrito-cantidad')).toHaveText('3');
 await page.goto('/pagar');await page.locator('[name=nombre]').fill('Ana');await page.locator('[name=apellidos]').fill('Prueba');
 await page.locator('[name=correo]').fill('qa@example.com');await page.locator('[name=identificacion]').fill('123456789');await page.locator('.campo-telefono input[type=tel]').fill('88888888');
 const t=(idioma==='es'?es:en).Compra;
 await page.getByRole('button',{name:t.pasoSiguiente,exact:true}).click();await page.getByRole('button',{name:t.pasoSiguiente,exact:true}).click();
 await page.locator('[name=nombre]').evaluate((input:HTMLInputElement)=>{input.value='Autocompletado nativo';});
 // El formulario nativo tampoco solicita datos de tarjeta.
 await expect(page.locator('[id^=tlpy_],input[autocomplete^="cc-"]')).toHaveCount(0);
 await page.locator('[name=pago][value=tarjeta]').check();
 await page.evaluate(()=>window.dispatchEvent(new Event('sg-app-background')));
 const draft=await page.evaluate(()=>sessionStorage.getItem('sg-compra-borrador-v1:carrito'));
 expect(JSON.parse(draft!).datos.nombre).toBe('Autocompletado nativo');expect(draft).not.toContain('4111111111111111');expect(draft).not.toContain('987');expect(draft).not.toContain('tlpy_');
 await page.reload();await expect(page.locator('[name=nombre]')).toHaveValue('Autocompletado nativo');await expect(page.locator('.carrito-cantidad')).toHaveText('3');await expect(page.locator('html')).toHaveAttribute('lang',idioma);
});
