import { expect, test } from '@playwright/test';

for (const idioma of ['es', 'en'] as const) {
  test(`el checkout no inicia cobros sin configuración ${idioma}`, async ({ page, request }) => {
    await page.goto('/finalizar-compra');
    if (idioma === 'en') await page.getByRole('button', { name: 'Read this page in English' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', idioma);
    await expect(page.locator('main')).toBeVisible();
    const respuesta = await request.post('/api/pagos/tilopay/iniciar', { data: {} });
    expect(respuesta.status()).toBe(503);
    expect(await respuesta.json()).toEqual({ error: 'no_disponible' });
    await page.goto('/finalizar-compra/resultado?estado=pagado&pedido=00000000-0000-0000-0000-000000000000');
    await expect(page.locator('html')).toHaveAttribute('lang', idioma);
    await expect(page.locator('h1')).toHaveText(idioma === 'es' ? 'Estamos verificando el resultado.' : 'We are checking the result.');
    await page.goto('/panel/pedidos');
    await expect(page).toHaveURL(/\/admin$/);
  });
}
