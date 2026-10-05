import {abrirCompraAprobada,limpiarAprobacionesTrasPrueba} from './aprobacion-fixture';
import {expect, test} from '@playwright/test';
limpiarAprobacionesTrasPrueba();

for (const idioma of ['es', 'en'] as const) {
  test(`errores de formulario y página inexistente en ${idioma}`, async ({page,context}) => {
    await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
    await page.goto('/soluciones/portatil');
    await expect(page.locator('html')).toHaveAttribute('lang', idioma);
    await page.locator('.ficha-agregar').click();
    await abrirCompraAprobada(page);
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
