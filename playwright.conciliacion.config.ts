import {defineConfig} from '@playwright/test';
import base from './playwright.entrega.config';
export default defineConfig({...base,testMatch:'conciliacion-panel.spec.ts',workers:1});
