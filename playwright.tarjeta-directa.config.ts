import base from './playwright.checkout-ui.config';
import {defineConfig} from '@playwright/test';
const servidor=Array.isArray(base.webServer)?base.webServer[0]:base.webServer;
if(!servidor)throw new Error('SERVIDOR_PRUEBAS_NO_CONFIGURADO');
export default defineConfig({...base,testMatch:['tarjeta-directa.spec.ts'],webServer:{...servidor,env:{...servidor.env,SUPABASE_URL:'http://127.0.0.1:9',SUPABASE_SERVICE_ROLE_KEY:'qa',TILOPAY_MODO:'pruebas',TILOPAY_API_USER:'qa',TILOPAY_API_PASSWORD:'qa',TILOPAY_API_KEY:'qa',TILOPAY_RETORNO_URL:'http://127.0.0.1:3130/pago/resultado',TILOPAY_PRUEBA_VERIFICADA_EN:new Date().toISOString()}}});
