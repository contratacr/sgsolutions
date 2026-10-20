import {defineConfig} from '@playwright/test';
import base from './playwright.entrega.config';
export default defineConfig({...base,testMatch:'plazo-panel.spec.ts',webServer:(base.webServer as {command:string;url:string;env?:Record<string,string>}[]).map(s=>s.env?{...s,env:{...s.env,BREVO_API_KEY:'fixture-only',BREVO_REMITENTE:'qa@example.test',SG_SERVICIOS_PRUEBA_ORIGEN:'http://127.0.0.1:3135'}}:s)});
