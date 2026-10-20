import {test,expect} from '@playwright/test';
import es from '../messages/es.json';
import en from '../messages/en.json';
for(const idioma of ['es','en'] as const)for(const digital of [false,true]){
 test(`plazo de entrega antes del pago y sin desbordamiento ${idioma} ${digital?'digital':'fisico'}`,async({page,context,baseURL})=>{
  const t=(idioma==='es'?es:en).Compra;
  const promesa=idioma==='es'?'Entrega en un máximo de 7 días hábiles desde la confirmación del pago.':'Delivery within 7 business days after payment confirmation.';
  await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);await page.goto('/tienda');
  await page.evaluate(digital=>localStorage.setItem('sg-carrito-v1',JSON.stringify([{id:digital?'software-intcomex-se027mse92':'eurocomp-2a118312d9683064',cantidad:1}])),digital);
  await page.goto('/pagar');await expect(page.locator('[name=nombre]')).toBeEnabled();
  await expect(page.locator('[data-compra-paso="0"] .compra-aviso')).toContainText(promesa);
  await expect(page.locator('.compra-resumen')).toContainText(promesa);
  const modos=digital?['digital']:['retiro','envio','express'];
  for(const modo of modos){await page.locator(`[name=modalidad][value=${modo}]`).check();await expect(page.locator('[data-compra-paso="0"] .compra-aviso')).toContainText(promesa);}
  if(!digital)await page.locator('[name=modalidad][value=retiro]').check();
  await page.locator('[name=nombre]').fill('Ana');await page.locator('[name=apellidos]').fill('Prueba');await page.locator('[name=correo]').fill('qa@example.test');await page.locator('.campo-telefono:has(input[name=telefono]) input[type=tel]').fill('88888888');await page.locator('[name=identificacion]').fill('123456789');
  await page.getByRole('button',{name:t.pasoSiguiente,exact:true}).click();await expect(page.locator('[data-compra-paso="1"]')).toBeVisible();
  await page.getByRole('button',{name:t.pasoSiguiente,exact:true}).click();await expect(page.locator('[data-compra-paso="2"] .compra-aviso')).toContainText(promesa);
  await expect(page.locator('[name=consentimiento]')).not.toBeChecked();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.goto('/terminos');await expect(page.locator('main')).toContainText(idioma==='es'?'7 días hábiles':'7 business days');
 });
}
