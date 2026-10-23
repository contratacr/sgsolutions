import {defineConfig} from '@playwright/test';
import base from './playwright.publicas.config';
export default defineConfig({...base,testMatch:['cargas-esqueleto.spec.ts','seguridad-tienda.spec.ts','frontend-recuperacion.spec.ts']});
