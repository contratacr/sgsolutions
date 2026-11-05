import {defineConfig} from '@playwright/test';
import base from './playwright.contenido.config';
export default defineConfig({...base,testMatch:'imagenes-admin-carga.spec.ts'});
