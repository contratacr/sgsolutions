import { test, expect } from '@playwright/test';




for (const idioma of ['es', 'en'] as const) {
  test(`pedido manual revisa datos y conserva enlace anterior ${idioma}`, async ({ page, context, baseURL }) => {
    await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
    await page.goto('/tienda'); await page.locator('.shop-producto h3 a').first().click();
    await page.locator('.ficha-agregar').click();
    await page.goto('/finalizar-compra');
    await expect(page.locator('html')).toHaveAttribute('lang', idioma);
    await expect(page.locator('.compra-cuentas')).toBeVisible();
    const form = page.locator('main form');
    await form.locator('[name=nombre]').fill('Prueba');
    await form.locator('[name=apellidos]').fill('Flujo');
    await form.locator('[name=correo]').fill('prueba@example.com');
    await form.locator('[name=telefono]').fill('88888888');
    await form.locator('[name=consentimiento]').check();
    await form.locator('input[type=file]').setInputFiles({name:'qa.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\n'+'0'.repeat(200))});
    await form.locator('[type=submit]').click();
    await expect(page.locator('main .pedido-volver')).toBeVisible();
    await expect(page.locator('main a[href^="https://wa.me/"]')).toHaveCount(0);
    await page.goto('/finalizar-compra/pedido?pedido=00000000-0000-0000-0000-000000000000&acceso=' + '0'.repeat(64));
    await expect(page.locator('h1')).toHaveText(idioma === 'es' ? 'No pudimos abrir este pedido.' : 'We could not open this order.');
    await expect(page.locator('html')).toHaveAttribute('lang', idioma);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
