import base from './playwright.checkout-ui.config';
import {defineConfig} from '@playwright/test';
export default defineConfig({...base,testMatch:['disponibilidad-prueba.spec.ts','pedidos-propuesta.spec.ts','plantillas-correo.spec.ts','correos-diseno.spec.ts']});
