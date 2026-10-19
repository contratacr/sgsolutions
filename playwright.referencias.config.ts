import {defineConfig} from '@playwright/test';
import base from './playwright.entrega.config';
export default defineConfig({...base,testMatch:['referencias-pedidos.spec.ts','pedidos-reales.spec.ts']});
