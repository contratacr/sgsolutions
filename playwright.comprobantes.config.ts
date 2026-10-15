import base from './playwright.checkout-ui.config';
import {defineConfig,devices} from '@playwright/test';
export default defineConfig({...base,testMatch:['comprobante-selector.spec.ts','comprobante-obligatorio.spec.ts','comprobante-recuperacion.spec.ts'],projects:[...base.projects!,{name:'safari-desktop',use:{...devices['Desktop Safari']}}]});
