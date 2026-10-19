import {defineConfig} from '@playwright/test';import base from './playwright.entrega.config';
export default defineConfig({...base,testMatch:['pedidos-bugs-octubre.spec.ts','estado-entrega.spec.ts','archivo-panel.spec.ts']});
