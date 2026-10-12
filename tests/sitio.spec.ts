import {test, expect} from '@playwright/test';
import fs from 'node:fs/promises';

test('portada real, imágenes, cabeceras y tamaño de descarga', async ({page}, prueba) => {
  const errores: string[] = [];
  page.on('pageerror', error => errores.push(error.message));
  const respuesta = await page.goto('/');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('¿Qué necesita hoy?');
  await expect(page.locator('.inicio-sobrelinea').first()).toContainText('SOLUCIONES INFORMÁTICAS');
  await expect(page.locator('header img[alt="SG Solutions"]')).toHaveCount(1);
  await expect(page.locator('footer img[alt="SG Solutions"]')).toHaveCount(1);
  await expect(page.locator('main img[alt="SG Solutions"]')).toHaveCount(0);
  await page.waitForLoadState('networkidle');
  expect(respuesta?.headers()['x-content-type-options']).toBe('nosniff');
  expect(respuesta?.headers()['content-security-policy']).toContain("frame-ancestors 'self'");
  await expect(page.locator('a[href^="https://wa.me/50664399417"]').first()).toBeVisible();
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
  if(process.env.SG_PRUEBA_PRODUCCION==='1')expect(bytesIniciales).toBeLessThan(1_500_000);
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

test('cambio de idioma persistente y navegación', async ({page}, prueba) => {
  await page.goto('/');
  await expect(page.locator('.selector-idioma')).toHaveAttribute('role', 'group');
  await expect(page.locator('.selector-idioma button[value="es"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.selector-idioma button[value="en"]')).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', {name: 'Read this page in English'}).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.selector-idioma button[value="en"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('What do you need today?');
  await expect(page.locator('.inicio-sobrelinea').first()).toContainText('IT SOLUTIONS');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  if (prueba.project.name === 'movil') await page.getByRole('button', {name: 'Open menu'}).click();
  await page.locator('header').getByRole('link', {name: 'Store', exact: true}).click();
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Store');
  await page.getByRole('button', {name: 'Leer esta página en español'}).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.locator('.selector-idioma button[value="es"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('panel sin sesión no revela datos y carrito ignora almacenamiento manipulado', async ({page}) => {
  await page.goto('/panel');
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator('.admin-editor')).toHaveCount(0);
  await expect(page.getByRole('heading',{level:1})).toBeVisible();
  await page.evaluate(() => localStorage.setItem('sg-carrito-v1', '[{"id":"desconocido","cantidad":3},{"id":"gamer","cantidad":-9}]'));
  await page.goto('/tienda');
  await page.getByRole('button', {name: 'Abrir carrito'}).click();
  await expect(page.getByText('Todavía no ha agregado equipo.')).toBeVisible();
});

test('las rutas del inicio son claras y funcionan sin animación', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/');
  await expect(page.locator('.inicio-camino')).toHaveCount(3);
  await expect(page.locator('.inicio-triptico-panel img').first()).toBeVisible();
  await page.locator('.inicio-camino[href="/empresas"]').click();
  await expect(page).toHaveURL(/\/empresas$/);
});

test.describe('navegación sin JavaScript', () => {
  test.use({javaScriptEnabled: false});
  test('el inicio sigue permitiendo entrar a la tienda', async ({page}) => {
    await page.goto('/');
    await page.locator('.inicio-camino[href="/tienda"]').click();
    await expect(page).toHaveURL(/\/tienda$/);
  });
});

test('las tres áreas navegan en la misma pestaña y conservan el idioma', async ({page}) => {
  await page.goto('/');
  await page.getByRole('button', {name: 'Read this page in English'}).click();
  const menu = page.locator('.inicio-caminos-grid');
  for (const ruta of ['/tienda', '/soporte', '/empresas']) {
    const enlace = menu.locator(`a[href="${ruta}"]`);
    await expect(enlace).not.toHaveAttribute('target', '_blank');
    await enlace.click();
    await expect(page).toHaveURL(new RegExp(`${ruta}$`));
    await expect(page.locator('html')).toHaveAttribute('lang','en');
    await expect(page.getByRole('button', {name:'Leer esta página en español'})).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
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
    if(ruta==='/casos-de-exito'){
      await expect(page.getByRole('heading',{name:'Conectividad y sistema de cámaras IP'})).toBeVisible();
      await expect(page.getByRole('heading',{name:'Servicentro San Juan',exact:true})).toBeVisible();
      await expect(page.locator('.historia-categoria').nth(1)).toContainText('PUNTOS DE VENTA E INFRAESTRUCTURA');
      await expect(page.getByRole('heading',{name:'Puntos de venta e infraestructura tecnológica para farmacias'})).toBeVisible();
      await expect(page.getByRole('heading',{name:'Puntos de venta y sistema de cámaras de vigilancia IP'})).toBeVisible();
      await expect(page.getByRole('heading',{name:'Eco Mini Market',exact:true})).toBeVisible();
      await expect(page.getByRole('heading',{name:'Hospital Veterinario de Occidente',exact:true})).toBeVisible();
      await expect(page.locator('.caso-galeria').nth(0).locator('img')).toHaveCount(2);
      await expect(page.locator('.caso-galeria').nth(2).locator('img')).toHaveCount(3);
      await expect(page.locator('.caso-galeria').nth(3).locator('img')).toHaveCount(3);
    }
    if(ruta==='/contacto'){
      await expect(page.getByRole('heading',{name:'Conozca nuestro trabajo más de cerca.'})).toBeVisible();
      for(const href of ['https://www.instagram.com/sgsolutionscr/?hl=es-la','https://www.facebook.com/sgsolutionscr?locale=es_LA']){
        const enlace=page.locator(`main a[href="${href}"]`);
        await expect(enlace).toBeVisible();
        await expect(enlace).toHaveAttribute('target','_blank');
        await expect(enlace).toHaveAttribute('rel','noopener noreferrer');
      }
      await expect(page.locator('footer a[href="https://www.instagram.com/sgsolutionscr/?hl=es-la"]')).toHaveCount(1);
      await expect(page.locator('footer a[href="https://www.facebook.com/sgsolutionscr?locale=es_LA"]')).toHaveCount(1);
    }
    await page.getByRole('button', {name:'Read this page in English'}).click();
    await expect(page.getByRole('heading', {level:1})).toHaveText(tituloEn);
    if(ruta==='/casos-de-exito'){
      await expect(page.getByRole('heading',{name:'Point-of-sale stations and technology infrastructure for pharmacies'})).toBeVisible();
    }
    if(ruta==='/contacto') await expect(page.getByRole('heading',{name:'See our work up close.'})).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${ruta}$`));
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
      await expect(page.locator('.servicio-grupo a')).toHaveCount(0);
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
      await imagen.evaluate(el => el.scrollIntoView({block: 'center', behavior: 'instant'}));
      await imagen.evaluate(async elemento => { await (elemento as HTMLImageElement).decode(); });
    }
    await page.evaluate(() => window.scrollTo({top:0, behavior:'instant'}));
    await page.screenshot({path:`evidencias/${ruta.slice(1)}-${prueba.project.name}.png`, fullPage:true, animations:'disabled', scale:'css'});
    expect(errores).toEqual([]);
  });
}

test('la búsqueda de tienda combina categoría, acentos e idioma', async ({page}, prueba) => {
  await page.goto('/tienda');
  const buscar = page.getByRole('searchbox', {name:'Busque productos, marcas o modelos'});
  const catalogo=await (await page.request.get('/api/catalogo')).json();
  const codigo=catalogo.productos[0].codigoFabricante;
  await buscar.fill(codigo);
  await expect(page.getByRole('article')).toHaveCount((await (await page.request.get('/api/catalogo?q='+encodeURIComponent(codigo))).json()).productos.length);
  await expect(page.getByRole('article').first()).toContainText(codigo);
  await page.getByRole('button', {name:'Read this page in English'}).click();
  await expect(page.getByRole('searchbox', {name:'Search products, brands or models'})).toHaveValue('');
  await expect(page.getByRole('article')).toHaveCount(24);
  await page.getByRole('searchbox', {name:'Search products, brands or models'}).fill(codigo);
  await expect.poll(()=>page.getByRole('article').count()).toBeGreaterThan(0);
  await page.getByRole('button', {name:'Clear search'}).click();
  await expect(page.getByRole('article')).toHaveCount(24);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.getByRole('button', {name:'Leer esta página en español'}).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByRole('article')).toHaveCount(24);
  for (const imagen of await page.locator('img:not(.marcas-pista img)').all()) {
    await imagen.evaluate(el => el.scrollIntoView({block: 'center', behavior: 'instant'}));
    await imagen.evaluate(async elemento => { await (elemento as HTMLImageElement).decode(); });
  }
  await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:`evidencias/tienda-editorial-${prueba.project.name}.png`, fullPage:true, animations:'disabled', scale:'css'});
});

test('caminos del inicio conservan foco e idioma', async ({page}, prueba) => {
  await page.goto('/');
  const tienda = page.locator('.inicio-camino-tienda');
  await tienda.focus();
  await expect(tienda).toBeFocused();
  await expect(tienda).toHaveCSS('outline-style','solid');
  await page.getByRole('button', {name: 'Read this page in English'}).click();
  await expect(page.locator('.inicio-camino-tienda')).toContainText('Explore store');
  await expect(page.locator('.inicio-camino-soporte')).toContainText('Get support');
  await expect(page.locator('.inicio-camino-empresas')).toContainText('View plans');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({path:`evidencias/portal-en-${prueba.project.name}.png`,fullPage:true,animations:'disabled',scale:'css'});
});
