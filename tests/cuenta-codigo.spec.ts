import {test,expect} from '@playwright/test';
import es from '../messages/es.json';import en from '../messages/en.json';
for(const idioma of ['es','en'] as const)test(`registro con código, error y retorno ${idioma}`,async({page,context})=>{
 const t=(idioma==='es'?es:en).CuentaCliente;
 await context.addCookies([{name:'sg-idioma',value:idioma,url:'http://127.0.0.1:3120'}]);
 await page.clock.install();
 await page.goto('/cuenta?retorno=%2Fpagar');await page.locator('.cuenta-cambio button').click();
 await page.locator('#nombre-cuenta').fill('Prueba Código');await page.locator('#correo-cuenta').fill('fixture@example.com');
 await page.locator('#clave-cuenta').fill('Ab1!xyzw');await page.locator('#confirmar-cuenta').fill('Ab1!xyzw');await page.locator('[name=acepta]').check();await page.locator('.cuenta-enviar').click();
 const codigo=page.getByRole('textbox',{name:t.codigoEtiqueta});await expect(codigo).toBeFocused();await expect(page.getByRole('button',{name:t.codigoVerificar})).toBeDisabled();
 await codigo.fill('000000');await page.getByRole('button',{name:t.codigoVerificar}).click();await expect(page.locator('.cuenta-codigo [role=alert]')).toHaveText(t.codigoInvalido);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:`.privado/evidencias/codigo-${idioma}-${test.info().project.name}.png`,fullPage:true});
 await page.clock.runFor(61000);await page.getByRole('button',{name:t.codigoReenviar,exact:true}).click();await expect(page.locator('.cuenta-codigo [role=status]')).toHaveText(t.codigoEnviado);await expect(codigo).toHaveValue('');
 await codigo.fill('123456');await page.getByRole('button',{name:t.codigoVerificar}).click();await expect(page).toHaveURL(/\/pagar$/);const tokens=(await context.cookies()).filter(c=>c.name.includes('auth-token'));expect(tokens.length).toBeGreaterThan(0);expect(tokens.every(c=>c.httpOnly)).toBe(true);expect(await page.evaluate(()=>document.cookie)).not.toContain('auth-token');
});

for(const idioma of ['es','en'] as const)test(`ingresar con contraseña regresa a compra ${idioma}`,async({page,context})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:'http://127.0.0.1:3120'}]);
 await page.goto('/cuenta?retorno=%2Fpagar');
 await page.locator('.cuenta-cambio button').click();await page.locator('.cuenta-cambio button').click();
 await page.locator('#correo-cuenta').fill('fixture@example.com');await page.locator('#clave-cuenta').fill('Ab1!xyzw');
 await page.locator('.cuenta-enviar').click();await expect(page).toHaveURL(/\/pagar$/);
});
for(const idioma of ['es','en'] as const)test(`cabecera conserva destino de compra al ingresar ${idioma}`,async({page,context},info)=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:'http://127.0.0.1:3120'}]);
 await page.goto('/pagar');
 if(info.project.name==='safari-movil'){
  await page.locator('.menu-movil').click();await page.locator('.menu-panel-cuenta').click();
 }else await page.locator('a.cuenta-nav').click();
 await expect(page).toHaveURL(/\/cuenta\?retorno=%2Fpagar$/);
 await expect(page.locator('[name=retorno]')).toHaveValue('/pagar');
 await page.locator('.cuenta-cambio button').click();await page.locator('.cuenta-cambio button').click();
 await page.locator('#correo-cuenta').fill('fixture@example.com');await page.locator('#clave-cuenta').fill('Ab1!xyzw');await page.locator('.cuenta-enviar').click();await expect(page).toHaveURL(/\/pagar$/);
});
