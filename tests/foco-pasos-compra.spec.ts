import {test,expect} from '@playwright/test';
for(const idioma of ['es','en']){
 test(`foco sin doble borde y WhatsApp sin sombra ${idioma}`,async({page,context})=>{
  await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
  await page.goto('/tienda');
  await expect(page.locator('.shop-orden select')).toBeEnabled();
  const buscador=page.locator('.shop-buscador');
  await buscador.locator('input').focus();
  const estilos=await buscador.evaluate(el=>({outline:getComputedStyle(el).outlineStyle,shadow:getComputedStyle(el).boxShadow}));
  expect(estilos.outline).toBe('none');expect(estilos.shadow).toContain('inset');
  expect(await buscador.locator('input').evaluate(el=>getComputedStyle(el).boxShadow)).toBe('none');
  expect(await page.locator('.whatsapp-flotante').evaluate(el=>getComputedStyle(el).boxShadow)).toBe('none');
  await page.locator('.shop-producto button').first().click();await page.goto('/finalizar-compra');
  const form=page.locator('main form');
  await expect(page.locator('.campos-nota')).toHaveCount(0);
  for(const [nombre,valor]of Object.entries({nombre:'Ana',apellidos:'Prueba',correo:'prueba@example.com',telefono:'+506 88888888'}))await form.locator(nombre==='telefono'?'.campo-telefono input[type=tel]':`[name=${nombre}]`).fill(valor);
  await form.locator('input[type=file]').setInputFiles({name:'prueba.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\n'+'0'.repeat(200))});
  await form.locator('[name=consentimiento]').check();
  await form.locator('button[type=submit]').click();
  const paso=page.locator('.compra-paso');await expect(paso).toBeFocused();
  await expect.poll(()=>paso.evaluate(el=>Math.round(el.getBoundingClientRect().top))).toBeGreaterThanOrEqual(90);
  expect(await paso.evaluate(el=>el.getBoundingClientRect().top)).toBeLessThan(130);
  await page.locator('.pedido-volver').click();await expect(paso).toBeFocused();
  expect(await paso.evaluate(el=>el.getBoundingClientRect().top)).toBeLessThan(130);
  await page.locator('footer').scrollIntoViewIfNeeded();
  const enlace=page.locator('footer a[href="/empresas"]').first();
  await enlace.click();await expect(page).toHaveURL(/\/empresas$/);
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBe(0);
 });
}
