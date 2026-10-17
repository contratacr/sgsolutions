import {defineConfig, devices} from '@playwright/test';

// Exercises the exact web UI served to Capacitor's local WebView preview.
export default defineConfig({
  testDir: './tests',
  testMatch: ['soluciones-empresariales.spec.ts','capacitor-lifecycle.spec.ts', 'checkout-pasos.spec.ts', 'checkout-ingreso.spec.ts', 'carrito-persistencia.spec.ts', 'catalogo-estabilidad.spec.ts', 'galeria-casos.spec.ts'],
  workers: 1,
  use: {baseURL: 'http://127.0.0.1:3140', trace: 'retain-on-failure', screenshot: 'only-on-failure'},
  projects: [
    {name: 'preview-ios-webkit', use: {...devices['iPhone 13']}},
    {name: 'preview-desktop', use: {...devices['Desktop Chrome']}},
  ],
  webServer: {command: 'npm run web --prefix mobile', url: 'http://127.0.0.1:3140/api/mobile-preview', reuseExistingServer: true},
});
