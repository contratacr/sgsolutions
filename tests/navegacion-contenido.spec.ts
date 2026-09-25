import {expect, test, type Locator} from '@playwright/test';

async function esperarCentrado(elemento: Locator) {
  await expect.poll(async () => elemento.evaluate((n) => {
    const caja = n.getBoundingClientRect();
    return Math.abs(caja.top + caja.height / 2 - innerHeight / 2);
  })).toBeLessThan(80);
}
async function esperarProductos(elemento: Locator) {
  await expect.poll(async () => elemento.evaluate((n) => n.getBoundingClientRect().top / innerHeight)).toBeGreaterThan(.12);
  await expect.poll(async () => elemento.evaluate((n) => n.getBoundingClientRect().top / innerHeight)).toBeLessThan(.32);
}
async function esperarInicioSeccion(elemento: Locator) {
  await expect.poll(async () => elemento.evaluate((n) => n.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
  await expect.poll(async () => elemento.evaluate((n) => n.getBoundingClientRect().top)).toBeLessThan(70);
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
  await esperarProductos(page.locator('.shop-grid'));

  const categoria = page.locator('.shop-categorias button').nth(1);
  await categoria.click();
  await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy', 'false');
  await expect(categoria).toHaveAttribute('aria-pressed', 'true');
  await esperarProductos(page.locator('.shop-grid'));
});

test('la selección de marca espera los productos nuevos y los muestra con desplazamiento suave', async ({page}, info) => {
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.goto('/tienda');
  await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy', 'false');
  await page.route('**/api/catalogo?*', async ruta => {
    if (new URL(ruta.request().url()).searchParams.get('marca')) await new Promise(resolve => setTimeout(resolve, 300));
    await ruta.continue();
  });
  const marca = page.locator('.marca-ficha').first();
  if (info.project.name === 'escritorio') await page.locator('.marcas-ventana').hover({force:true});
  await marca.click();
  await expect(marca).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy', 'false');
  await esperarProductos(page.locator('.shop-grid'));
});

test('los enlaces internos muestran el inicio de secciones largas y centran las tarjetas', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/empresas');
  await page.locator('a[href="#planes"]').first().click();
  await expect(page).toHaveURL(/#planes$/);
  await esperarInicioSeccion(page.locator('#planes'));

  for (const numero of [1,2,3]) {
    await page.locator(`.empresa-necesidades a[href="#solucion-${numero}"]`).click();
    await expect(page).toHaveURL(new RegExp(`#solucion-${numero}$`));
    await esperarCentrado(page.locator(`#solucion-${numero}`));
  }

  await page.goto('/soporte');
  await page.locator('a[href="/empresas#planes"]').click();
  await expect(page).toHaveURL(/\/empresas#planes$/);
  await esperarInicioSeccion(page.locator('#planes'));

  await page.goto('/privacidad');
  await page.locator('.legal-grid nav a[href="#legal-4"]').click();
  await expect(page).toHaveURL(/#legal-4$/);
  await expect(page.locator('#legal-4 h2')).toBeInViewport();
});
