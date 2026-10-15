import {defineConfig} from '@playwright/test';
import base from './playwright.google.config';
const servidores=Array.isArray(base.webServer)?base.webServer:[base.webServer!];
export default defineConfig({...base,testMatch:['cuenta-codigo.spec.ts','plantillas-correo.spec.ts'],webServer:servidores.map(s=>({...s,env:{...s.env,PEDIDOS_ORIGEN_PUBLICO:'https://sgsolutionscr.com'}}))});
