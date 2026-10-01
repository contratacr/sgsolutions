import {expect, test} from '@playwright/test';

for (const idioma of ['es', 'en'] as const) {
  test(`errores de formulario y página inexistente en ${idioma}`, async ({page}) => {
    await page.goto('/tienda');
    if (idioma === 'en') await page.getByRole('button', {name: 'Read this page in English'}).click();
    await expect(page.locator('html')).toHaveAttribute('lang', idioma);

    await page.locator('.shop-producto h3 a').first().click();
    await page.locator('.ficha-compra button').click();
    await page.locator('.ficha-compra a[href="/finalizar-compra"]').click();
    const consentimiento = page.locator('[name="consentimiento"]');
    const mensaje = await consentimiento.evaluate((campo: HTMLInputElement) => {
      campo.checkValidity();
      return campo.validationMessage;
    });
    expect(mensaje).toBe(idioma === 'es' ? 'Marque esta casilla para continuar.' : 'Check this box to continue.');
    await expect(consentimiento).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('main form .aviso-formulario')).toContainText(idioma === 'es' ? 'Revise los campos señalados' : 'Review the highlighted fields');

    await consentimiento.check();
    await expect(consentimiento).not.toHaveAttribute('aria-invalid');
    await page.goto('/ruta-inexistente-de-prueba');
    await expect(page.locator('h1')).toHaveText(idioma === 'es' ? 'Esta página no está disponible.' : 'This page is not available.');
  });
}
