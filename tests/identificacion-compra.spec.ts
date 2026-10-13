import {test,expect} from '@playwright/test';
import {datosClienteCompra} from '../src/lib/datos-cliente-compra';
const contacto={nombre:'Ana',apellidos:'Prueba',correo:'prueba@example.com',telefono:'+50688883333',modalidad:'retiro',consentimiento:'on'};
test('la factura exige identificación y valida su tipo; el tiquete permite omitirla',()=>{
 expect(datosClienteCompra.safeParse({...contacto,factura:'tiquete'}).success).toBe(true);
 expect(datosClienteCompra.safeParse({...contacto,factura:'electronica'}).success).toBe(false);
 for(const [tipo,numero] of [['fisica','1-2345-6789'],['juridica','3-101-951810']])expect(datosClienteCompra.safeParse({...contacto,factura:'electronica',tipoIdentificacion:tipo,identificacion:numero}).success).toBe(true);
 for(const [tipo,numero] of [['fisica','123'],['fisica','3-101-951810'],['juridica','1-2345-6789'],['fisica','abc']])expect(datosClienteCompra.safeParse({...contacto,factura:'electronica',tipoIdentificacion:tipo,identificacion:numero}).success).toBe(false);
});
for(const idioma of ['es','en'])test(`identificación opcional en tiquete y obligatoria en factura ${idioma}`,async({page,context})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);await page.goto('/tienda');await page.locator('.shop-producto button').first().click();await page.goto('/finalizar-compra');
 const id=page.locator('main form [name=identificacion]');await expect(id).not.toHaveAttribute('required','');await expect(id.locator('..').locator('.campo-requisito')).toContainText(idioma==='es'?'Opcional':'Optional');
 await page.locator('main form [name=factura]').selectOption('electronica');await expect(id).toHaveAttribute('required','');await expect(id.locator('..').locator('.campo-obligatorio')).toHaveText('*');
 await id.fill('123');expect(await id.evaluate(e=>(e as HTMLInputElement).validity.patternMismatch)).toBe(true);
 await id.fill('1-2345-6789');expect(await id.evaluate(e=>(e as HTMLInputElement).checkValidity())).toBe(true);
 await page.locator('main form [name=tipoIdentificacion]').selectOption('juridica');expect(await id.evaluate(e=>(e as HTMLInputElement).validity.patternMismatch)).toBe(true);
 await id.fill('3-101-951810');expect(await id.evaluate(e=>(e as HTMLInputElement).checkValidity())).toBe(true);
 await page.locator('main form [name=factura]').selectOption('tiquete');await id.fill('');expect(await id.evaluate(e=>(e as HTMLInputElement).checkValidity())).toBe(true);
});

test('acepta y normaliza teléfonos con formato; rechaza prefijos sin número',()=>{
 for(const numero of ['+506 (8718) 4114','+506 8718-4114','8718.4114']){
  const r=datosClienteCompra.safeParse({...contacto,factura:'tiquete',telefono:numero});expect(r.success).toBe(true);if(r.success)expect(r.data.telefono).toMatch(/^\+?\d{8,15}$/);
 }
 for(const numero of ['+506','--------','1234','+506 abc'])expect(datosClienteCompra.safeParse({...contacto,factura:'tiquete',telefono:numero}).success).toBe(false);
});

for(const idioma of ['es','en'])test(`valida el teléfono antes de revisar y acepta su formato ${idioma}`,async({page,context})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);await page.goto('/tienda');await page.locator('.shop-producto button').first().click();await page.goto('/finalizar-compra');
 const form=page.locator('main form');for(const [nombre,valor]of Object.entries({nombre:'Ana',apellidos:'Prueba',correo:'qa@example.invalid',telefono:'+506'}))await form.locator(nombre==='telefono'?'.campo-telefono input[type=tel]':`[name=${nombre}]`).fill(valor);
 await form.locator('[name=consentimiento]').check();await form.locator('input[type=file]').setInputFiles({name:'prueba.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\n'+'0'.repeat(200))});await form.locator('button[type=submit]').click();
 await expect(form.locator('[name=telefono]')).toHaveAttribute('aria-invalid','true');await expect(form.locator('.campo-error')).toContainText(idioma==='es'?'teléfono válido':'valid phone');await expect(page.getByRole('button',{name:idioma==='es'?'Completar pedido':'Complete order',exact:true})).toHaveCount(0);
 await form.locator('[name=telefono]').locator('..').locator('input[type=tel]').fill('+506 (8718) 4114');await form.locator('button[type=submit]').click();await expect(page.getByRole('button',{name:idioma==='es'?'Completar pedido':'Complete order',exact:true})).toBeVisible();
});
