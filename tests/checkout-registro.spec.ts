import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
test.skip(process.env.SG_TEST_CUENTA_LOCAL!=='1','Registro exclusivo de Auth local y buzón de prueba.');
for(const idioma of ['es','en'])test(`registro y confirmación regresan al pedido ${idioma}`,async({page,context,request,baseURL})=>{
 expect(new URL(baseURL!).origin).toBe('http://127.0.0.1:3107');
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);await page.goto('/tienda');await expect(page.locator('.shop-orden select')).toBeEnabled();await page.locator('.shop-producto button').first().click();const carrito=await page.evaluate(()=>localStorage.getItem('sg-carrito-v1'));
 await page.goto('/finalizar-compra');await page.locator('.compra-acceso-invitado a').click();const email='checkout-'+randomUUID()+'@sgsolutions.test';
 await page.locator('#nombre-cuenta').fill('Ana Prueba');await page.locator('#correo-cuenta').fill(email);const clave='QA-'+randomUUID()+'!9Aa';await page.locator('#clave-cuenta').fill(clave);await page.locator('#confirmar-cuenta').fill(clave);await page.locator('[name=acepta][type=checkbox]').check();await page.locator('.cuenta-enviar').click();await expect(page.locator('.cuenta-formulario [role=status]')).toBeVisible();
 let mensaje:{ID:string}|undefined;await expect.poll(async()=>{const bandeja=await(await request.get('http://127.0.0.1:54324/api/v1/messages')).json();mensaje=bandeja.messages.find((m:{To:{Address:string}[]})=>m.To.some(t=>t.Address===email));return Boolean(mensaje);}).toBe(true);
 const cuerpo=await(await request.get('http://127.0.0.1:54324/api/v1/message/'+mensaje!.ID)).json();const enlace=cuerpo.HTML.match(/href="([^"]+)"/)[1].replaceAll('&amp;','&');expect(enlace).toMatch(/^http:\/\/127\.0\.0\.1:54321\//);await page.goto(enlace);
 await expect(page).toHaveURL(/\/finalizar-compra$/);await expect(page.locator('.compra-acceso')).toHaveCount(0);expect(await page.evaluate(()=>localStorage.getItem('sg-carrito-v1'))).toBe(carrito);await expect(page.locator('main form [name=correo]')).toHaveValue(email);
});
