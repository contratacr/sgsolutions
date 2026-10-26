import {defineConfig,devices} from '@playwright/test';
import base from './playwright.busqueda.config';
export default defineConfig({...base,testMatch:'sugerencias-teclado.spec.ts',projects:[{name:'pc',use:{...devices['Desktop Chrome']}},{name:'iphone-webkit',use:{...devices['iPhone 13']}}]});
