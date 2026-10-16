import {test,expect} from '@playwright/test';
import es from '../messages/es.json';import en from '../messages/en.json';
for(const idioma of ['es','en'] as const)test(`tarjeta se paga dentro del formulario sin navegación intermedia ${idioma}`,async({page,context,baseURL})=>{
 const t=(idioma==='es'?es:en).Compra;
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);let verificaciones=0,inicios=0;
 await page.route('https://app.tilopay.com/sdk/v2/sdk_tpay.min.js',r=>r.fulfill({contentType:'application/javascript',body:`window.Tilopay={Init:async()=>({test:1,methods:[{id:'card',name:'Card',type:'card'}]}),startPayment:async()=>{document.body.dataset.sdkPago='1'}}`}));
 await page.route('**/api/compra/verificar',async ruta=>{verificaciones++;await ruta.fulfill({json:{id:'qa',token:'qa'}});});
 await page.route('**/api/pagos/tilopay/iniciar',async ruta=>{inicios++;await ruta.fulfill({json:{sdk:{token:'qa',amount:100,orderNumber:'qa'},metodo:'card'}});});
 await page.goto('/tienda');await expect(page.locator('.shop-orden-trigger')).toBeEnabled();await page.locator('.shop-producto').first().hover();await page.locator('.producto-agregar').first().click();await expect(page.locator('.carrito-cantidad')).toHaveText('1');await page.goto('/pagar');
 await page.locator('[name=nombre]').fill('Cliente');await page.locator('[name=apellidos]').fill('QA');await page.locator('[name=correo]').fill('cliente@example.com');await page.locator('[name=identificacion]').fill('123456789');await page.locator('.campo-telefono input[type=tel]').fill('88888888');
 await page.getByRole('button',{name:t.pasoSiguiente,exact:true}).click();await page.getByRole('button',{name:t.pasoSiguiente,exact:true}).click();
 await page.locator('input[value=tarjeta]').check();await page.locator('#tlpy_cc_number').fill('4111111111111111');await page.locator('#tlpy_cc_expiration_date').fill('12/30');await page.locator('#tlpy_cvv').fill('123');await page.locator('[name=consentimiento]').check();
 await page.locator('.compra-acciones-finales button[type=submit]').click();await expect(page.locator('body')).toHaveAttribute('data-sdk-pago','1');await expect(page).toHaveURL(/\/pagar$/);expect(verificaciones).toBe(1);expect(inicios).toBe(1);
});
