import base from './playwright.checkout-ui.config';
import {defineConfig} from '@playwright/test';
export default defineConfig({...base,testMatch:['checkout-pasos.spec.ts','checkout-ingreso.spec.ts','express-envio.spec.ts','identificacion-tipos.spec.ts','disponibilidad-prueba.spec.ts']});
