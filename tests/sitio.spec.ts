import {test, expect, type Page, type Locator} from '@playwright/test';
import fs from 'node:fs/promises';

async function abrirPestana(page: Page, enlace: Locator) {
  const abierta = page.waitForEvent('popup');
  await enlace.click();
  const nueva = await abierta;
  await nueva.waitForLoadState('domcontentloaded');
  return nueva;
}

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
  const tienda = await abrirPestana(page, page.getByRole('link', {name: 'Shop', exact: true}));
  await expect(tienda.getByRole('heading', {level: 1})).toHaveText('Equipment is just the start.');
  await tienda.getByRole('button', {name: 'Leer esta página en español'}).click();
  await expect(tienda.locator('html')).toHaveAttribute('lang', 'es');
  expect(await tienda.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await tienda.close();
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
  await expect(menu.getByRole('link', {name: /Soporte técnico/})).toHaveAttribute('href', '/soporte');
  await expect(menu.getByRole('link', {name: /Soluciones empresariales/})).toHaveAttribute('href', '/empresas');
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
  const tienda = await abrirPestana(page, menu.getByRole('link', {name: /Explorar productos/}));
  await expect(tienda).toHaveURL(/\/tienda$/);
  await expect(page).toHaveURL(/\/$/);
  await tienda.close();
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
  const empresas = await abrirPestana(page, page.getByRole('link', {name: /Conocer soluciones/}));
  await expect(empresas).toHaveURL(/\/empresas$/);
  await empresas.close();
});

test.describe('navegación sin JavaScript', () => {
  test.use({javaScriptEnabled: false});
  test('el menú inicial sigue permitiendo entrar a la tienda', async ({page}) => {
    await page.goto('/');
    await expect(page.getByRole('navigation', {name: 'Elegí una solución'})).toBeVisible();
    const tienda = await abrirPestana(page, page.getByRole('link', {name: /Explorar productos/}));
    await expect(tienda).toHaveURL(/\/tienda$/);
    await expect(tienda.getByRole('heading', {level: 1})).toBeVisible();
    await tienda.close();
  });
});

test('las tres áreas abren páginas independientes con el idioma elegido', async ({page}) => {
  await page.goto('/');
  await page.getByRole('button', {name: 'Read this page in English'}).click();
  const menu = page.getByRole('navigation', {name: 'Choose a solution'});
  for (const ruta of ['/tienda', '/soporte', '/empresas']) {
    const enlace = menu.locator(`a[href="${ruta}"]`);
    await expect(enlace).toHaveAttribute('target', '_blank');
    await expect(enlace).toHaveAttribute('rel', 'noopener noreferrer');
    const nueva = await abrirPestana(page, enlace);
    await expect(nueva).toHaveURL(`http://127.0.0.1:3107${ruta}`);
    await expect(nueva.locator('html')).toHaveAttribute('lang','en');
    expect(await nueva.evaluate(() => window.opener === null)).toBe(true);
    await expect(nueva.getByRole('button', {name:'Leer esta página en español'})).toBeVisible();
    await nueva.close();
  }
  await expect(page).toHaveURL('http://127.0.0.1:3107/');
});

for (const [ruta,tituloEs,tituloEn] of [
  ['/soporte','Volvé a lo que importa.','Back to what matters.'],
  ['/empresas','Tecnología que acompaña tu negocio.','Technology that works for your business.'],
  ['/nosotros','Cerca de vos. Comprometidos con tu negocio.','Close to you. Committed to your business.'],
  ['/contacto','¿Qué podemos resolver juntos?','What can we solve together?']
]) {
  test(`${ruta} es independiente, bilingüe y adaptable`, async ({page}, prueba) => {
    const errores: string[] = [];
    page.on('pageerror', error => errores.push(error.message));
    await page.goto(ruta);
    await expect(page.getByRole('heading', {level:1})).toHaveText(tituloEs);
    await page.getByRole('button', {name:'Read this page in English'}).click();
    await expect(page.getByRole('heading', {level:1})).toHaveText(tituloEn);
    await expect(page).toHaveURL(`http://127.0.0.1:3107${ruta}`);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang','en');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    if (ruta === '/soporte') {
      await page.getByText('Can I request support without a plan?', {exact:true}).click();
      await expect(page.getByText('Yes. Tell us about your situation so we can review the scope and prepare a service proposal.')).toBeVisible();
      const href = await page.locator('a[href^="https://wa.me/"]').first().getAttribute('href');
      expect(decodeURIComponent(href!)).toContain('I need technical support');
    }
    await page.getByRole('button', {name:'Leer esta página en español'}).click();
    await expect(page.getByRole('heading', {level:1})).toHaveText(tituloEs);
    for (const imagen of await page.locator('img').all()) {
      await imagen.scrollIntoViewIfNeeded();
      await imagen.evaluate(async elemento => { await (elemento as HTMLImageElement).decode(); });
    }
    await page.evaluate(() => window.scrollTo({top:0, behavior:'instant'}));
    await page.screenshot({path:`evidencias/${ruta.slice(1)}-${prueba.project.name}.png`, fullPage:true, animations:'disabled', scale:'css'});
    expect(errores).toEqual([]);
  });
}
