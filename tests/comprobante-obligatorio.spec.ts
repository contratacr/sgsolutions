import {test,expect} from '@playwright/test';

for(const idioma of ['es','en']){
 test(`comprobante obligatorio solo en pagos manuales ${idioma}`,async({page,context,browserName},info)=>{
  await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
  await page.goto('/tienda');
  await page.locator('.shop-producto button').first().click();
  await page.goto('/finalizar-compra');
  const form=page.locator('main form'),archivo=form.locator('input[type=file]');
  for(const metodo of ['sinpe','transferencia']){
   await form.locator(`[name=pago][value=${metodo}]`).check();
   await expect(archivo).toHaveAttribute('required','');
   await expect(form.locator('.compra-comprobante label .campo-obligatorio')).toHaveText('*');
   await expect(form.locator('.compra-cuentas')).toBeVisible();
   await expect(form.locator('.compra-comprobante')).not.toContainText(/opcional|optional|Si ya realizó|If you have already/);
  }
  await form.locator('.compra-comprobante').screenshot({path:`${process.cwd()}/.privado/qa-local/comprobante-${browserName}-${info.project.name}-${idioma}.png`});
  for(const [nombre,valor] of Object.entries({nombre:'Ana',apellidos:'Prueba',correo:'prueba@example.com',telefono:'+506 88888888'}))await form.locator(nombre==='telefono'?'.campo-telefono input[type=tel]':`[name=${nombre}]`).fill(valor);
  await form.locator('[name=consentimiento]').check();
  await form.locator('button[type=submit]').click();
  await expect(form).toBeVisible();
  await expect(archivo).toHaveAttribute('aria-invalid','true');
  await archivo.setInputFiles({name:'pago.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\n'+'0'.repeat(200))});
  await expect(form.locator('.compra-archivo-nombre')).toHaveText('pago.pdf');
  await form.locator('button[type=submit]').click();
  await expect(form).toHaveCount(0);
  await page.locator('.pedido-volver').click();
  await expect(form.locator('.compra-archivo-nombre')).toHaveText('pago.pdf');
  await form.locator('[name=pago][value=tarjeta]').check();
  await expect(form.locator('.compra-comprobante')).toHaveCount(0);
  await expect(form.locator('.compra-cuentas')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('lang',idioma);
  await page.goto('/cuenta');
  await page.getByRole('button',{name:idioma==='es'?'Regístrese':'Sign up',exact:true}).click();
  await expect(page.locator('#cuenta-correo-registro .cuenta-campo label .campo-obligatorio')).toHaveCount(4);
  await expect(page.locator('.cuenta-aceptacion .campo-obligatorio')).toBeVisible();
 });
}
