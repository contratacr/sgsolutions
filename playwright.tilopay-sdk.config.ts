import base from './playwright.tarjeta-directa.config';
import {defineConfig} from '@playwright/test';
const servidor=Array.isArray(base.webServer)?base.webServer[0]:base.webServer;
export default defineConfig({...base,testMatch:['tilopay-sdk.spec.ts','pago-integrado-cuenta.spec.ts','tilopay-sdk-modos.spec.ts'],webServer:[
 {command:'node tests/fixtures/checkout-perfil.mjs',url:'http://127.0.0.1:3126/auth/v1/settings'},
 {...servidor!,env:{...servidor!.env,TILOPAY_SDK_METODO_TARJETA:'qa-card',CUENTAS_SUPABASE_URL:'http://127.0.0.1:3126',CUENTAS_SUPABASE_ANON_KEY:'fixture-anon',NEXT_PUBLIC_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_ANON_KEY:'',BREVO_API_KEY:''}},
]});
