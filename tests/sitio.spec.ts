import {test, expect} from '@playwright/test';
import fs from 'node:fs/promises';

test('portada real, imágenes, cabeceras y tamaño de descarga', async ({page}, prueba) => {
  const errores: string[] = [];
  page.on('pageerror', error => errores.push(error.message));
  const respuesta = await page.goto('/');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Somos su aliado tecnológico.');
  await expect(page.locator('.entrada-eyebrow')).toContainText('SOLUCIONES INFORMÁTICAS');
  await expect(page.locator('header img[alt="SG Solutions"]')).toHaveCount(1);
  await expect(page.locator('footer img[alt="SG Solutions"]')).toHaveCount(1);
  await expect(page.locator('main img[alt="SG Solutions"]')).toHaveCount(0);
  if (prueba.project.name === 'escritorio') await expect(page.locator('.escenario')).toHaveAttribute('data-escena', '3d', {timeout: 15000});
  await page.waitForLoadState('networkidle');
  expect(respuesta?.headers()['x-content-type-options']).toBe('nosniff');
  expect(respuesta?.headers()['content-security-policy']).toContain("frame-ancestors 'self'");
  await expect(page.locator('a[href^="https://wa.me/50689395256"]').first()).toBeVisible();
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
  await expect.poll(() => page.getByRole('article').count()).toBeGreaterThan(1);
  const camara = page.getByRole('article').filter({hasText:'UniFi Protect AI Pro'});
  await expect(camara).toHaveCount(1);
  await camara.getByRole('button', {name: 'Agregar al carrito'}).click();
  await page.getByRole('button', {name: 'Abrir carrito'}).click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toBeVisible();
  await dialogo.getByRole('spinbutton').fill('3');
  await expect(dialogo.getByRole('button', {name: 'Pago en línea próximamente'})).toBeDisabled();
  const enlace = await dialogo.getByRole('link', {name: 'Consultar selección por WhatsApp'}).getAttribute('href');
  expect(decodeURIComponent(enlace!)).toContain('3 × UniFi Protect AI Pro');
  await page.screenshot({path: `evidencias/carrito-${prueba.project.name}.png`, animations: 'disabled', scale: 'css'});
  await page.reload();
  await page.getByRole('button', {name: 'Abrir carrito'}).click();
  await expect(page.getByRole('spinbutton')).toHaveValue('3');
  await page.keyboard.press('Escape');
  await expect(dialogo).not.toBeVisible();
  await page.getByRole('button', {name: 'Abrir carrito'}).click();
  await page.getByRole('button', {name: 'Quitar UniFi Protect AI Pro'}).click();
  await expect(page.getByText('Todavía no ha agregado equipo.')).toBeVisible();
  expect(errores).toEqual([]);
});

test('cambio de idioma persistente y navegación', async ({page}, prueba) => {
  await page.goto('/');
  await page.getByRole('button', {name: 'Read this page in English'}).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('We are your technology partner.');
  await expect(page.locator('.entrada-eyebrow')).toContainText('IT SOLUTIONS');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  if (prueba.project.name === 'movil') await page.getByRole('button', {name: 'Open menu'}).click();
  await page.locator('header').getByRole('link', {name: 'Shop', exact: true}).click();
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Technology that works with you.');
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
  await expect(page.getByText('Todavía no ha agregado equipo.')).toBeVisible();
});

test('entrada navega, carga 3D progresivo y permite pausarlo', async ({page}, prueba) => {
  await page.goto('/');
  const menu = page.getByRole('navigation', {name: 'Elija una solución'});
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
    await menu.getByRole('link', {name: /Soluciones empresariales/}).scrollIntoViewIfNeeded();
    await expect(menu.getByRole('link', {name: /Soluciones empresariales/})).toBeInViewport({ratio: 1});
  }
  await menu.getByRole('link', {name: /Explorar productos/}).click();
  await expect(page).toHaveURL(/\/tienda$/);
});

test('movimiento reducido mantiene menú y versión estática', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/');
  await expect(page.getByRole('navigation', {name: 'Elija una solución'})).toBeVisible();
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
  await expect(page.getByRole('navigation', {name: 'Elija una solución'})).toBeVisible();
  if (prueba.project.name === 'escritorio') await expect(page.locator('.escenario')).toHaveAttribute('data-respaldo', 'fallo', {timeout: 15000});
  await expect(page.locator('.escenario canvas')).toHaveCount(0);
  await expect(page.locator('.escena-respaldo')).toBeVisible();
  await page.getByRole('link', {name: /Conocer soluciones/}).click();
  await expect(page).toHaveURL(/\/empresas$/);
});

test.describe('navegación sin JavaScript', () => {
  test.use({javaScriptEnabled: false});
  test('el menú inicial sigue permitiendo entrar a la tienda', async ({page}) => {
    await page.goto('/');
    await expect(page.getByRole('navigation', {name: 'Elija una solución'})).toBeVisible();
    await page.getByRole('link', {name: /Explorar productos/}).click();
    await expect(page).toHaveURL(/\/tienda$/);
    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  });
});

test('las tres áreas navegan en la misma pestaña y conservan el idioma', async ({page}) => {
  await page.goto('/');
  await page.getByRole('button', {name: 'Read this page in English'}).click();
  const menu = page.getByRole('navigation', {name: 'Choose a solution'});
  for (const ruta of ['/tienda', '/soporte', '/empresas']) {
    const enlace = menu.locator(`a[href="${ruta}"]`);
    await expect(enlace).not.toHaveAttribute('target', '_blank');
    await enlace.click();
    await expect(page).toHaveURL(`http://127.0.0.1:3107${ruta}`);
    await expect(page.locator('html')).toHaveAttribute('lang','en');
    await expect(page.getByRole('button', {name:'Leer esta página en español'})).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL('http://127.0.0.1:3107/');
  }
});

for (const [ruta,tituloEs,tituloEn] of [
  ['/casos-de-exito','Clientes que confían en SG Solutions.','Clients who trust SG Solutions.'],
  ['/soporte','Su equipo, en buenas manos.','Your equipment, in good hands.'],
  ['/empresas','Tecnología que acompaña su negocio.','Technology that works for your business.'],
  ['/nosotros','Su aliado tecnológico.','Your technology partner.'],
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
    if(ruta==='/empresas'){
      await expect(page.locator('#planes')).toHaveCount(1);
      await expect(page.locator('.empresa-portada a[href="#planes"]')).toHaveText('Explore monthly plans');
    }
    if (ruta === '/soporte') {
      await expect(page.locator('#planes')).toHaveCount(0);
      await expect(page.locator('.servicio-grupo')).toHaveCount(5);
      await expect(page.locator('.servicio-grupo[open]')).toHaveCount(0);
      await page.getByRole('heading',{name:'Networks and connectivity',exact:true}).click();
      await expect(page.locator('.servicio-grupo[open]')).toHaveCount(1);
      await expect(page.getByRole('heading',{name:'Router and Wi-Fi setup',exact:true})).toBeVisible();
      await expect(page.locator('.servicios-soporte')).not.toContainText('₡');
      await expect(page.locator('.soporte-empresa a')).toHaveAttribute('href','/empresas#planes');
      await page.getByText('Can I request support without a plan?', {exact:true}).click();
      await expect(page.getByText('Yes. Tell us about your situation so we can review the scope and prepare a service proposal.')).toBeVisible();
      const href = await page.locator('a[href^="https://wa.me/"]').first().getAttribute('href');
      expect(decodeURIComponent(href!)).toContain('I need technical support');
    }
    await page.screenshot({path:`evidencias/area-en-${ruta.slice(1)}-${prueba.project.name}.png`,fullPage:true,animations:'disabled',scale:'css'});
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

test('la búsqueda de tienda combina categoría, acentos e idioma', async ({page}, prueba) => {
  await page.goto('/tienda');
  const buscar = page.getByRole('searchbox', {name:'Buscar equipo'});
  await buscar.fill('PORTATIL');
  await expect(page.getByRole('article')).toHaveCount(24);
  await expect(page.getByRole('article').first()).toContainText('Lenovo ThinkPad L14');
  await page.getByRole('button', {name:'Seguridad', exact:true}).click();
  await expect(page.getByText('No encontramos esa opción.')).toBeVisible();
  await page.getByRole('button', {name:'Ver todo el equipo', exact:true}).click();
  await expect(page.getByRole('article')).toHaveCount(24);
  await buscar.fill('CAMARA');
  await expect.poll(() => page.getByRole('article').count()).toBeGreaterThan(1);
  await expect(page.getByRole('article').first()).toContainText(/Cámara|Camara/);
  await page.getByRole('button', {name:'Read this page in English'}).click();
  await expect(page.getByRole('searchbox', {name:'Search equipment'})).toHaveValue('');
  await expect(page.getByRole('article')).toHaveCount(24);
  await page.getByRole('searchbox', {name:'Search equipment'}).fill('Flex Mini');
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('button', {name:'Clear search'}).click();
  await expect(page.getByRole('article')).toHaveCount(24);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.getByRole('button', {name:'Leer esta página en español'}).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByRole('article')).toHaveCount(24);
  await page.getByRole('button', {name:'Pausar movimiento de marcas'}).click();
  for (const imagen of await page.locator('img').all()) {
    await imagen.scrollIntoViewIfNeeded();
    await imagen.evaluate(async elemento => { await (elemento as HTMLImageElement).decode(); });
  }
  await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:`evidencias/tienda-editorial-${prueba.project.name}.png`, fullPage:true, animations:'disabled', scale:'css'});
});

test('tarjetas inmersivas conservan foco, idioma y movimiento reducido', async ({page}, prueba) => {
  await page.goto('/');
  const tienda = page.locator('.portal-tienda');
  if (prueba.project.name === 'escritorio') {
    await tienda.hover({position: {x: 35,y: 35}});
    await expect.poll(() => tienda.evaluate(e => getComputedStyle(e).transform)).not.toBe('none');
    await page.emulateMedia({reducedMotion: 'reduce'});
    await expect.poll(() => tienda.evaluate(e => getComputedStyle(e).transform)).toBe('none');
    await expect(page.locator('.escenario canvas')).toHaveCount(0);
  }
  await tienda.focus();
  await expect(tienda).toBeFocused();
  await expect(tienda).toHaveCSS('outline-style','solid');
  await page.getByRole('button', {name: 'Read this page in English'}).click();
  await expect(page.locator('.portal-tienda')).toContainText('Explore products');
  await expect(page.locator('.portal-soporte')).toContainText('Get support');
  await expect(page.locator('.portal-empresas')).toContainText('Explore solutions');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.locator('footer img').scrollIntoViewIfNeeded();
  await expect(page.locator('footer img')).toBeVisible();
  await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:`evidencias/portal-en-${prueba.project.name}.png`,fullPage:true,animations:'disabled',scale:'css'});
});
