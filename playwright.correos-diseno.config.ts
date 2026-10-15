import base from './playwright.checkout-ui.config';
import {defineConfig} from '@playwright/test';
export default defineConfig({...base,testMatch:['plantillas-correo.spec.ts','correos-diseno.spec.ts']});
