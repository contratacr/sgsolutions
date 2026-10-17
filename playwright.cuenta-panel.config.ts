import {defineConfig} from '@playwright/test';
import base from './playwright.eurocomp-manual.config';
const servidores=Array.isArray(base.webServer)?base.webServer:[];
export default defineConfig({...base,testMatch:'cuenta-panel.spec.ts',webServer:[servidores[0],{...servidores[1],env:{...servidores[1].env,SG_ENTORNO:'produccion',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3998',SUPABASE_SERVICE_ROLE_KEY:'',BREVO_API_KEY:'',TILOPAY_API_KEY:'',TILOPAY_API_USER:'',TILOPAY_API_PASSWORD:''}}]});
