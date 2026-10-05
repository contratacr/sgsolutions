import {test, expect} from '@playwright/test';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash, randomBytes} from 'node:crypto';

test.describe.configure({mode:'serial'});

for (const idioma of ['es', 'en'] as const) test(`recorrido completo del panel ${idioma}`, async ({page, context}) => {
  test.skip(process.env.SG_TEST_ALTAS !== '1', 'Requiere servidor local aislado');
  test.setTimeout(120000);
  const rutaCuenta = '.privado/admin-local/cuenta.json';
  const original = await readFile(rutaCuenta, 'utf8');
  const cuenta = JSON.parse(original);
  const token = randomBytes(32).toString('hex');
  cuenta.sesiones.push({hash:createHash('sha256').update(token).digest('hex'), vence:Date.now()+120000});
  const errores: string[] = [];
  page.on('pageerror', error => {
    // React's development profiler can measure aborted auth redirects with a
    // negative timestamp (vercel/next.js#86060). Keep all application errors.
    if (/^Failed to execute 'measure' on 'Performance': '\u200b(?:Panel|Administrar)' cannot have a negative time stamp\.$/.test(error.message)) return;
    errores.push(error.message);
  });

  try {
    await page.goto('/admin');
    await expect(page.getByRole('heading', {level:1})).toBeVisible();
    await expect(page.locator('[name="correo"]')).toBeVisible();
    await page.goto('/panel');
    await expect(page).toHaveURL(/\/admin$/);

    await writeFile(rutaCuenta, JSON.stringify(cuenta), {mode:0o600});
    await context.addCookies([
      {name:'sg-admin-local', value:token, domain:'127.0.0.1', path:'/'},
      {name:'sg-idioma', value:idioma, domain:'127.0.0.1', path:'/'},
    ]);
    const rutas = [
      '/panel',
      '/panel/catalogo',
      '/panel/contenido',
      '/panel/pedidos',
      '/panel/estadisticas',
    ];
    for (const ruta of rutas) {
      await page.goto(ruta);
      await expect(page.getByRole('heading', {level:1})).toBeVisible();
      await expect(page.locator('[data-cerrar-sesion] button')).toBeVisible();
      await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), ruta).toBeTruthy();
    }

    await page.goto('/panel/catalogo');
    await expect(page.locator('.admin-producto-fila')).toHaveCount(20);
    await page.locator('.admin-producto-fila button').first().click();
    await expect(page.locator('.admin-producto-editor')).toBeVisible();
    await expect(page.locator('.admin-editor-indice a')).toHaveCount(5);
    await page.locator('.admin-volver-lista').click();
    await expect(page.locator('.admin-producto-fila')).toHaveCount(20);
    for (const tab of await page.locator('.admin-tabs button').all()) {
      await tab.click();
      await expect(tab).toHaveAttribute('aria-pressed', 'true');
    }

    await page.goto('/panel/contenido');
    for (const tab of await page.locator('.admin-tabs button').all()) {
      await tab.click();
      await expect(tab).toHaveAttribute('aria-pressed', 'true');
    }
    await page.locator('.admin-tabs button').first().click();
    await page.locator('details.admin-item summary').first().click();
    await expect(page.locator('.gestor-imagenes:visible').first()).toBeVisible();

    await page.goto('/panel');
    await expect(page.locator('.selector-idioma button[aria-pressed="true"]')).toHaveAttribute('value', idioma);
    await page.reload();
    await expect(page.locator('.selector-idioma button[aria-pressed="true"]')).toHaveAttribute('value', idioma);
    await page.locator('[data-cerrar-sesion] button').click();
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto('/panel/catalogo');
    await expect(page).toHaveURL(/\/admin$/);
    expect(errores).toEqual([]);
  } finally {
    await writeFile(rutaCuenta, original, {mode:0o600});
  }
});
