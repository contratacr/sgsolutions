import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {chromium, webkit, expect} from '@playwright/test';

const origin = 'http://127.0.0.1:3140';
const health = await fetch(`${origin}/api/mobile-preview`);
assert.equal(health.ok && (await health.json()).isolated, true, 'Start npm run web --prefix mobile');
const inventory = JSON.parse(await readFile(new URL('../paridad.json', import.meta.url), 'utf8'));
const login = JSON.parse(await readFile(new URL('../../.privado/mobile-preview/qa-login.json', import.meta.url), 'utf8'));
const evidence = new URL('../../.privado/mobile-testing/web-preview/', import.meta.url);
await mkdir(evidence, {recursive: true});
const catalog = await (await fetch(`${origin}/api/catalogo`)).json();
const product = catalog.productos?.[0];
assert.ok(product, 'Catalog required for product-detail coverage');
const token = '00000000-0000-4000-8000-000000000000';
const replace = route => route.replace('[id]', product.slug || product.id).replace('[codigo]', '0000000000000000').replace('[acceso]', token).replace('[token]', token);
const results = [];
try {
  for (const [engine, width] of [[webkit, 390], [chromium, 1280]]) {
    const browser = await engine.launch();
    try {
      for (const language of ['es', 'en']) {
        const context = await browser.newContext({viewport: {width, height: 844}, reducedMotion: 'reduce'});
        await context.addCookies([{name: 'sg-idioma', value: language, url: origin}]);
        // No third-party scripts, analytics, payment or email requests during this smoke.
        await context.route('**/*', route => {
          const request = route.request();
          if (new URL(request.url()).origin === origin || request.resourceType() === 'image') return route.continue();
          return route.abort();
        });
        const page = await context.newPage();
        page.setDefaultTimeout(15000);
        const errors = [], devDiagnostics = [];
        page.on('pageerror', error => {
          // Next's development overlay may abort stack-frame lookups during navigation.
          if (error.message.includes('/__nextjs_original-stack-frames due to access control checks.')) devDiagnostics.push(error.message);
          else errors.push(error.message);
        });
        // All protected routes must reject an anonymous visitor before QA login.
        for (const section of inventory.sections.filter(s => s.audience === 'administrator')) {
          for (const route of section.routes.filter(r => r.startsWith('/panel'))) {
            await page.goto(origin + route);
            await expect(page).toHaveURL(/\/admin$/);
          }
        }
        for (const section of inventory.sections.filter(s => s.audience !== 'administrator')) {
          for (const route of section.routes) {
            const response = await page.goto(origin + replace(route), {waitUntil: 'load'});
            const status = response.status();
            assert.ok(status === 200 || (route.includes('[') && status === 404), `${route}: HTTP ${status}`);
            await expect(page.locator('html')).toHaveAttribute('lang', language);
            await expect(page.locator('main').first()).toBeAttached();
            await expect(page.locator('body')).not.toContainText('Application error:');
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), `${route}: horizontal overflow at ${width}`);
            results.push({section: section.id, route, language, engine: engine.name(), width, status, scope: route.includes('[') && route !== '/tienda/[id]' ? 'invalid-link state' : 'page render'});
            if (route === section.routes[0]) await page.screenshot({caret: 'initial', path: new URL(`${section.id}-${language}-${width}.png`, evidence).pathname.replaceAll('%20', ' ')});
          }
        }
        await page.goto(origin + '/admin');
        await page.locator('[name=correo]').fill(login.correo);
        await page.locator('[name=clave]').fill(login.clave);
        await page.locator('main form button').click();
        await expect(page).toHaveURL(/\/panel$/);
        for (const section of inventory.sections.filter(s => s.audience === 'administrator')) {
          for (const route of section.routes) {
            const response = await page.goto(origin + route);
            assert.equal(response.status(), 200, route);
            await expect(page.locator('html')).toHaveAttribute('lang', language);
            await expect(page.locator('main').first()).toBeAttached();
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), `${route}: horizontal overflow at ${width}`);
            results.push({section: section.id, route, language, engine: engine.name(), width, status: response.status(), scope: 'local-admin render (no production mutations)'});
            if (route === section.routes[0]) await page.screenshot({caret: 'initial', path: new URL(`${section.id}-${language}-${width}.png`, evidence).pathname.replaceAll('%20', ' ')});
          }
        }
        assert.deepEqual(errors, [], 'Uncaught browser errors');
        console.log(`${engine.name()} ${width} ${language}: all registered routes rendered and administrative access checked.`);
        await context.close();
      }
    } finally {await browser.close();}
  }
} finally {
  await writeFile(new URL('report.json', evidence), JSON.stringify({generatedAt: new Date().toISOString(), results}, null, 2));
}
