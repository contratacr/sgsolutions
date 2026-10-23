import {defineConfig} from '@playwright/test';
import base from './playwright.checkout-ui.config';
const servidor=Array.isArray(base.webServer)?base.webServer[0]:base.webServer;
export default defineConfig({...base,
 testMatch:['activacion-admin.spec.ts','enlaces-pedido.spec.ts','mensaje-whatsapp.spec.ts','legal-movimiento.spec.ts','cuenta-clientes.spec.ts','eurocomp.spec.ts'],
 webServer:{...servidor!,env:{...servidor!.env,BREVO_API_KEY:'',TILOPAY_API_KEY:'',TILOPAY_API_USER:'',TILOPAY_API_PASSWORD:'',EUROCOMP_API_KEY:'',EUROCOMP_PASSWORD:''}},
});
