import {test,expect} from '@playwright/test';
import es from '../messages/es.json';import en from '../messages/en.json';
for(const idioma of ['es','en'] as const)for(const modo of [1,0,-1])test(`SDK integrado ${idioma}, entorno ${modo}`,async({page,context,baseURL})=>{
 const t=(idioma==='es'?es:en).Compra;let inicios=0;
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.route('https://app.tilopay.com/sdk/v2/sdk_tpay.min.js',r=>r.fulfill({contentType:'application/javascript',body:`window.Tilopay={Init:async()=>({test:${modo===-1?"undefined":modo},methods:[{id:'qa-card',name:'Card',type:'card'}]}),startPayment:async()=>{document.body.dataset.sdkPago='1';return undefined}}`}));
 await page.route('**/api/compra/verificar',r=>r.fulfill({json:{id:'qa',token:'qa'}}));
 await page.route('**/api/pagos/tilopay/iniciar',async r=>{
  inicios++;const data=r.request().postData()!;expect(data).not.toContain('4111111111111111');expect(data).not.toContain('tlpy_');expect(JSON.parse(data).sdk).toBe(true);
  await r.fulfill({json:{sdk:{token:'qa',amount:100,orderNumber:'qa'},metodo:'qa-card'}});
 });
 await page.goto('/tienda');await expect(page.locator('.shop-orden-trigger')).toBeEnabled();await page.locator('.shop-producto button').first().click();await page.goto('/pagar');
 await page.locator('[name=nombre]').fill('Cliente');await page.locator('[name=apellidos]').fill('Prueba');await page.locator('[name=correo]').fill('qa@example.com');await page.locator('[name=identificacion]').fill('123456789');await page.locator('.campo-telefono input[type=tel]').fill('88888888');
 await page.getByRole('button',{name:t.pasoSiguiente,exact:true}).click();await page.getByRole('button',{name:t.pasoSiguiente,exact:true}).click();
 await page.locator('[name=pago][value=tarjeta]').check();
 await expect(page.locator('.tarjeta-integrada')).toBeVisible();
 await page.locator('#tlpy_cc_number').fill('4111111111111111');await page.locator('#tlpy_cc_expiration_date').fill('12/30');await page.locator('#tlpy_cvv').fill('123');
 await page.locator('[name=consentimiento]').check();await page.locator('.compra-acciones-finales button[type=submit]').click();
 if(modo===1)await expect(page.locator('body')).toHaveAttribute('data-sdk-pago','1');
 else {await expect(page.getByRole('alert').filter({hasText:t.errorPago})).toBeVisible();await expect(page.locator('body')).not.toHaveAttribute('data-sdk-pago','1');}
 expect(inicios).toBe(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
