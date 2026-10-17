import { defineConfig, devices } from '@playwright/test';
const baseURL=process.env.SG_TEST_URL??'http://127.0.0.1:3107';
if(!['127.0.0.1','localhost','[::1]'].includes(new URL(baseURL).hostname))throw new Error('Las pruebas completas requieren un servidor aislado local. Use el smoke de producción para la comprobación pública.');
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {baseURL, trace: 'retain-on-failure'},
  projects: [
    {name: 'escritorio', use: {...devices['Desktop Chrome'], viewport: {width: 1440, height: 1000}}},
    {name: 'movil', use: {...devices['iPhone 13'], defaultBrowserType: 'chromium'}}
  ],
  webServer: {
    command: 'npm run start',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    env: {SG_ENTORNO: 'local', NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '', CUENTAS_SUPABASE_URL: '', CUENTAS_SUPABASE_ANON_KEY: ''}
  }
});
