import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {baseURL: 'http://127.0.0.1:3107', trace: 'retain-on-failure'},
  projects: [
    {name: 'escritorio', use: {...devices['Desktop Chrome'], viewport: {width: 1440, height: 1000}}},
    {name: 'movil', use: {...devices['iPhone 13'], defaultBrowserType: 'chromium'}}
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://127.0.0.1:3107',
    reuseExistingServer: !process.env.CI,
    env: {SG_ENTORNO: 'local', NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: ''}
  }
});
