import {abrirCompraAprobada} from './aprobacion-fixture';
import { test, expect } from '@playwright/test';

test.skip(process.env.SG_TEST_MANUAL !== '1', 'Se ejecuta contra el entorno de pruebas con pedidos manuales activos.');

for (const idioma of ['es', 'en'] as const) {
  test(`pedido manual visible sin solicitar depósito previo ${idioma}`, async ({ page }) => {
    await page.goto('/soluciones/portatil');
    if (idioma === 'en') await page.getByRole('button', { name: 'Read this page in English' }).click();
    await page.locator('.ficha-agregar').click();
    await abrirCompraAprobada(page);
    await expect(page.locator('html')).toHaveAttribute('lang', idioma);
    await expect(page.locator('.compra-cuentas')).toHaveCount(0);
    await expect(page.locator('form .compra-aviso').first()).toContainText(idioma === 'es' ? 'después de confirmar' : 'after confirming');
    const form = page.locator('main form');
    await form.locator('[name=nombre]').fill('Prueba');
    await form.locator('[name=apellidos]').fill('Flujo');
    await form.locator('[name=correo]').fill('prueba@example.com');
    await form.locator('[name=telefono]').fill('88888888');
    await form.locator('[name=consentimiento]').check();
    await form.locator('[type=submit]').click();
    await expect(page.getByRole('button', { name: idioma === 'es' ? 'Completar pedido' : 'Complete order' })).toBeVisible();
    await expect(page.locator('main a[href^="https://wa.me/"]')).toHaveCount(0);
    await page.goto('/finalizar-compra/pedido?pedido=00000000-0000-0000-0000-000000000000&acceso=' + '0'.repeat(64));
    await expect(page.locator('h1')).toHaveText(idioma === 'es' ? 'No pudimos abrir este pedido.' : 'We could not open this order.');
    await expect(page.locator('html')).toHaveAttribute('lang', idioma);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
