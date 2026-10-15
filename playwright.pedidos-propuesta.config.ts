import base from './playwright.checkout-ui.config';
import {defineConfig} from '@playwright/test';
export default defineConfig({...base,testMatch:['pedidos-propuesta.spec.ts']});
