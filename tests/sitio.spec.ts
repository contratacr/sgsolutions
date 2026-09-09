import {test, expect} from '@playwright/test';
import fs from 'node:fs/promises';

test('portada real, imágenes, cabeceras y tamaño de descarga', async ({page}, prueba) => {
  const errores: string[] = [];
  page.on('pageerror', error => errores.push(error.message));
  const respuesta = await page.goto('/');
  await expect(page.getByRole('heading', {level: 1})).toContainText('En buenas manos.');
  if (prueba.project.name === 'escritorio') await expect(page.locator('.escenario')).toHaveAttribute('data-escena', '3d', {timeout: 15000});
  await page.waitForLoadState('networkidle');
  expect(respuesta?.headers()['x-content-type-options']).toBe('nosniff');
  expect(respuesta?.headers()['content-security-policy']).toContain("frame-ancestors 'self'");
  await expect(page.locator('a[href^="https://wa.me/50624467846"]').first()).toBeVisible();
  const revision = await page.evaluate(() => ({
    desborda: document.documentElement.scrollWidth > innerWidth,
    imagenesRotas: [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src),
    recursos: performance.getEntriesByType('resource').map(r => ({url: r.name, bytes: (r as PerformanceResourceTiming).transferSize})),
    documento: (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).transferSize
  }));
  expect(revision.desborda).toBe(false);
  expect(revision.imagenesRotas).toEqual([]);
  expect(errores).toEqual([]);
  const bytesIniciales = revision.documento + revision.recursos.reduce((s,r) => s + r.bytes, 0);
  expect(bytesIniciales).toBeLessThan(1_500_000);
  await fs.mkdir('evidencias', {recursive: true});
  await fs.writeFile(`evidencias/rendimiento-${prueba.project.name}.json`, JSON.stringify({...revision, bytesIniciales, errores}, null, 2));
  await page.screenshot({path: `evidencias/portada-${prueba.project.name}.png`, animations: 'disabled', scale: 'css'});
  for (const imagen of await page.locator('img').all()) {
    await imagen.scrollIntoViewIfNeeded();
    await imagen.evaluate(async elemento => { await (elemento as HTMLImageElement).decode(); });
  }
  await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
  await page.screenshot({path: `evidencias/inicio-${prueba.project.name}.png`, fullPage: true, animations: 'disabled', scale: 'css'});
});

test('tienda filtra, conserva cantidades y no habilita cobros inexistentes', async ({page}, prueba) => {
  const errores: string[] = [];
  page.on('pageerror', error => errores.push(error.message));
  await page.goto('/tienda');
  await page.getByRole('button', {name: 'Seguridad', exact: true}).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('button', {name: 'Agregar al carrito'}).click();
  await page.getByRole('button', {name: 'Abrir carrito'}).click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toBeVisible();
  await dialogo.getByRole('spinbutton').fill('3');
  await expect(dialogo.getByRole('button', {name: 'Pago en línea próximamente'})).toBeDisabled();
  const enlace = await dialogo.getByRole('link', {name: 'Consultar selección por WhatsApp'}).getAttribute('href');
  expect(decodeURIComponent(enlace!)).toContain('3 × Soluciones de videovigilancia');
  await page.screenshot({path: `evidencias/carrito-${prueba.project.name}.png`, animations: 'disabled', scale: 'css'});
  await page.reload();
  await page.getByRole('button', {name: 'Abrir carrito'}).click();
  await expect(page.getByRole('spinbutton')).toHaveValue('3');
  await page.keyboard.press('Escape');
  await expect(dialogo).not.toBeVisible();
  await page.getByRole('button', {name: 'Abrir carrito'}).click();
  await page.getByRole('button', {name: 'Quitar Soluciones de videovigilancia'}).click();
  await expect(page.getByText('Todavía no agregaste equipo.')).toBeVisible();
  expect(errores).toEqual([]);
});

test('cambio de idioma persistente y navegación', async ({page}, prueba) => {
  await page.goto('/');
  await page.getByRole('button', {name: 'Read this page in English'}).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', {level: 1})).toContainText('In good hands.');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  if (prueba.project.name === 'movil') await page.getByRole('button', {name: 'Open menu'}).click();
  await page.getByRole('link', {name: 'Shop', exact: true}).click();
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Equipment is just the start.');
  await page.getByRole('button', {name: 'Leer esta página en español'}).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('panel sin sesión no revela datos y carrito ignora almacenamiento manipulado', async ({page}) => {
  await page.goto('/panel');
  await expect(page).toHaveURL(/\/acceso$/);
  await expect(page.getByText('El acceso del equipo todavía no está habilitado.')).toBeVisible();
  await page.evaluate(() => localStorage.setItem('sg-carrito-v1', '[{"id":"desconocido","cantidad":3},{"id":"gamer","cantidad":-9}]'));
  await page.goto('/tienda');
  await page.getByRole('button', {name: 'Abrir carrito'}).click();
  await expect(page.getByText('Todavía no agregaste equipo.')).toBeVisible();
});

test('entrada navega, carga 3D progresivo y permite pausarlo', async ({page}, prueba) => {
  await page.goto('/');
  const menu = page.getByRole('navigation', {name: 'Elegí una solución'});
  await expect(menu.getByRole('link')).toHaveCount(3);
  await expect(menu.getByRole('link', {name: /Soporte técnico/})).toHaveAttribute('href', '#contacto');
  await expect(menu.getByRole('link', {name: /Soluciones empresariales/})).toHaveAttribute('href', '#servicios');
  if (prueba.project.name === 'escritorio') {
    await expect(page.locator('.escenario')).toHaveAttribute('data-escena', '3d', {timeout: 15000});
    await menu.getByRole('link', {name: /Soluciones empresariales/}).focus();
    await expect(menu.getByRole('link', {name: /Soluciones empresariales/})).toBeFocused();
    await page.getByRole('button', {name: 'Pausar movimiento'}).click();
    await expect(page.locator('.escenario canvas')).toHaveCount(0);
    await expect(page.locator('.escenario')).toHaveAttribute('data-escena', 'ilustracion');
    await page.getByRole('button', {name: 'Activar movimiento'}).click();
    await expect(page.locator('.escenario')).toHaveAttribute('data-escena', '3d');
  } else {
    await expect(page.locator('.escenario canvas')).toHaveCount(0);
    await expect(menu.getByRole('link', {name: /Soluciones empresariales/})).toBeInViewport({ratio: 1});
  }
  await menu.getByRole('link', {name: /Explorar productos/}).click();
  await expect(page).toHaveURL(/\/tienda$/);
});

test('movimiento reducido mantiene menú y versión estática', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/');
  await expect(page.getByRole('navigation', {name: 'Elegí una solución'})).toBeVisible();
  await expect(page.locator('.escenario')).toHaveAttribute('data-escena', 'ilustracion');
  await expect(page.getByRole('button', {name: 'Pausar movimiento'})).toHaveCount(0);
  await expect(page.locator('.escenario canvas')).toHaveCount(0);
});

test('sin WebGL el respaldo conserva la navegación', async ({page}, prueba) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, tipo: string, opciones?: unknown) {
      if (tipo === 'webgl' || tipo === 'webgl2' || tipo === 'experimental-webgl') return null;
      return original.call(this, tipo as '2d', opciones);
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.getByRole('navigation', {name: 'Elegí una solución'})).toBeVisible();
  if (prueba.project.name === 'escritorio') await expect(page.locator('.escenario')).toHaveAttribute('data-respaldo', 'fallo', {timeout: 15000});
  await expect(page.locator('.escenario canvas')).toHaveCount(0);
  await expect(page.locator('.escena-respaldo')).toBeVisible();
  await page.getByRole('link', {name: /Conocer soluciones/}).click();
  await expect(page).toHaveURL(/#servicios$/);
});

test.describe('navegación sin JavaScript', () => {
  test.use({javaScriptEnabled: false});
  test('el menú inicial sigue permitiendo entrar a la tienda', async ({page}) => {
    await page.goto('/');
    await expect(page.getByRole('navigation', {name: 'Elegí una solución'})).toBeVisible();
    await page.getByRole('link', {name: /Explorar productos/}).click();
    await expect(page).toHaveURL(/\/tienda$/);
    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  });
});
