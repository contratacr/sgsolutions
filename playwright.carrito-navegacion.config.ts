import {defineConfig} from '@playwright/test';
import base from './playwright.contenido.config';
const servidor=Array.isArray(base.webServer)?base.webServer[0]:base.webServer!;
export default defineConfig({...base,testMatch:/carrito-navegacion\.spec\.ts/,webServer:{...servidor,env:{...servidor.env,SUPABASE_URL:'http://127.0.0.1:1',SUPABASE_SERVICE_ROLE_KEY:['fixture','local','no','real'].join('-'),PEDIDOS_MANUALES_ACTIVOS:'1',PEDIDOS_ENLACE_SECRET:['fixture','local','no','real'].join('-').repeat(3),PEDIDOS_ORIGEN_PUBLICO:'http://127.0.0.1:3124'}}});
