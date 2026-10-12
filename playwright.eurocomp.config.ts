import {defineConfig} from '@playwright/test';
// Pruebas de política y reconciliación, sin navegador ni conexiones externas.
export default defineConfig({testDir:'./tests',testMatch:'eurocomp-tienda.spec.ts',grep:/mínimo de 15|actualización retira/,workers:1,reporter:'list'});
