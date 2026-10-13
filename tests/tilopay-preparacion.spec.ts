import { expect, test } from '@playwright/test';

for (const idioma of ['es', 'en'] as const) {
  test(`el checkout no inicia cobros sin configuración ${idioma}`, async ({ page, request, context, baseURL }) => {
    await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
    await page.goto('/finalizar-compra');
    await expect(page).toHaveURL(/\/pagar$/);
    await expect(page.locator('html')).toHaveAttribute('lang', idioma);
    await expect(page.locator('main')).toBeVisible();
    const respuesta = await request.post('/api/pagos/tilopay/iniciar', {headers:{origin:'http://127.0.0.1:3107'}, data: {} });
    expect(respuesta.status()).toBe(403);
    expect(await respuesta.json()).toEqual({ error: 'asesoria_requerida' });
    await page.goto('/finalizar-compra/resultado?estado=pagado&pedido=00000000-0000-0000-0000-000000000000');
    await expect(page.locator('html')).toHaveAttribute('lang', idioma);
    await expect(page.locator('h1')).toHaveText(idioma === 'es' ? 'Estamos verificando el resultado.' : 'We are checking the result.');
    await page.goto('/panel/pedidos');
    await expect(page).toHaveURL(/\/admin$/);
  });
}
