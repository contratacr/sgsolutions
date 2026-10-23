import fs from 'node:fs';
import {defineConfig} from '@playwright/test';
import base from './playwright.checkout-ui.config';
import {entornoAislado} from './scripts/testing/entorno-aislado.mjs';

const conexion=JSON.parse(fs.readFileSync(process.env.TEST_SUPABASE_CONFIG||'.privado/qa-local/conexion.json','utf8'));
if(!['http://127.0.0.1:54321','http://127.0.0.1:55321'].includes(conexion.API_URL)||!conexion.ANON_KEY||!conexion.SERVICE_ROLE_KEY)throw new Error('AUTH_REAL_REQUIERE_SUPABASE_LOCAL');
process.env.SG_TEST_CUENTA_LOCAL='1';
export default defineConfig({...base,testMatch:'checkout-ingreso.spec.ts',grep:/correo vuelve al pedido/,webServer:{
 command:'npx next dev --hostname 127.0.0.1 --port 3130',url:'http://127.0.0.1:3130',reuseExistingServer:false,
 env:{...entornoAislado,SG_PRUEBAS_INTEGRACION:'1',CUENTAS_SUPABASE_URL:conexion.API_URL,CUENTAS_SUPABASE_ANON_KEY:conexion.ANON_KEY},
}});
