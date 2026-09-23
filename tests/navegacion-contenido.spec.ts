import {expect, test, type Locator} from '@playwright/test';

async function esperarCentrado(elemento: Locator) {
  await expect.poll(async () => elemento.evaluate((n) => {
    const caja = n.getBoundingClientRect();
    return Math.abs(caja.top + caja.height / 2 - innerHeight / 2);
  })).toBeLessThan(80);
}

test('los filtros de tienda llevan al contenido actualizado', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/tienda');
  await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy', 'false');

  const marca = page.locator('.marca-logo').first();
  await marca.click();
  await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy', 'false');
  const titulo = page.locator('.shop-resultados h2');
  await expect(titulo).toBeFocused();
  await esperarCentrado(titulo);

  const categoria = page.locator('.shop-categorias button').nth(1);
  await categoria.click();
  await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy', 'false');
  await expect(categoria).toHaveAttribute('aria-pressed', 'true');
  await esperarCentrado(titulo);
});

test('los enlaces internos centran su sección en la misma página y entre páginas', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/empresas');
  await page.locator('a[href="#planes"]').first().click();
  await expect(page).toHaveURL(/#planes$/);
  await esperarCentrado(page.locator('#planes'));

  await page.goto('/soporte');
  await page.locator('a[href="/empresas#planes"]').click();
  await expect(page).toHaveURL(/\/empresas#planes$/);
  await esperarCentrado(page.locator('#planes'));
});
