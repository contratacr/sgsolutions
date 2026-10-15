import {test,expect} from '@playwright/test';
import {costoEntrega} from '../src/lib/envio';
import {datosClienteCompra} from '../src/lib/datos-cliente-compra';
import {siguientesEstadosEntrega} from '../src/lib/estado-entrega';
const datos={nombre:'Cliente',apellidos:'QA',correo:'cliente@example.com',telefono:'+50688888888',modalidad:'express',factura:'tiquete',consentimiento:'on'};
test('Express cobra solamente productos y exige dirección antes de preparar envío',()=>{
 expect(costoEntrega('express')).toBe(0);expect(costoEntrega('envio')).toBe(4000);expect(costoEntrega('retiro')).toBe(0);
 const vacio=datosClienteCompra.safeParse(datos);expect(vacio.success).toBe(false);if(!vacio.success)expect(vacio.error.issues.map(x=>x.path[0])).toEqual(expect.arrayContaining(['provincia','canton','distrito','direccion']));
 expect(datosClienteCompra.safeParse({...datos,provincia:'Alajuela',canton:'Atenas',distrito:'Atenas',direccion:'Frente a Plaza El Bosque'}).success).toBe(true);
 expect(siguientesEstadosEntrega('preparando','express')).toEqual(['enviado']);
});
for(const idioma of ['es','en'])test(`Express permite revisar productos sin cobrar el envío ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);let cobros=0;await page.route('**/api/pagos/**',async ruta=>{cobros++;await ruta.fulfill({status:500});});
 await page.goto('/tienda');await expect(page.locator('.shop-orden-trigger')).toBeEnabled();await page.locator('.shop-producto').first().hover();await page.locator('.producto-agregar').first().click();await page.goto('/pagar');
 const total=await page.locator('.compra-total dd').innerText();await page.locator('input[name=modalidad][value=express]').check();await expect(page.locator('input[name=modalidad]')).toHaveCount(3);await expect(page.locator('.compra-total dd')).toHaveText(total);await expect(page.locator('.compra-express-cotizacion')).toContainText(idioma==='es'?'se paga por separado':'paid separately');await expect(page.locator('.compra-metodos')).toBeHidden();
 for(const campo of ['provincia','canton','distrito','direccion'])await expect(page.locator(`[name=${campo}]`)).toHaveAttribute('required','');
 await page.locator('[name=nombre]').fill('Cliente');await page.locator('[name=apellidos]').fill('QA');await page.locator('[name=correo]').fill('cliente@example.com');await page.locator('.campo-telefono:has(input[name=telefono]) input[type=tel]').fill('88888888');await page.locator('[name=identificacion]').fill('123456789');await page.locator('[name=provincia]').selectOption('Alajuela');await page.locator('[name=canton]').selectOption('Atenas');await page.locator('[name=distrito]').selectOption('Atenas');await page.locator('[name=direccion]').fill('Frente a Plaza El Bosque');await page.getByRole('button',{name:idioma==='es'?'Siguiente':'Next',exact:true}).click();await page.getByRole('button',{name:idioma==='es'?'Siguiente':'Next',exact:true}).click();await page.locator('#compra-comprobante').setInputFiles({name:'comprobante.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n'+'.'.repeat(200))});await page.locator('[name=consentimiento]').check();await page.locator('main form button[type=submit]').click();await expect(page.locator('.pedido-datos')).toContainText(idioma==='es'?'Servicio de Express':'Express delivery service');await expect(page.locator('.compra-total dd')).toHaveText(total);expect(cobros).toBe(0);
});
