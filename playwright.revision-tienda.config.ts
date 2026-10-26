import {defineConfig} from '@playwright/test';
import base from './playwright.compras-matriz.config';
import {entornoAislado} from './scripts/testing/entorno-aislado.mjs';
const servidores=base.webServer as {command:string;url:string;env?:Record<string,string>}[];
export default defineConfig({...base,testMatch:['revision-tienda.spec.ts','tarjeta-directa.spec.ts','carrito-persistencia.spec.ts','checkout-pasos.spec.ts','filtros-confirmacion.spec.ts','seguridad-tienda.spec.ts','express-envio.spec.ts','comprobante-selector.spec.ts','sugerencias-teclado.spec.ts'],webServer:servidores.map(s=>({...s,env:{...entornoAislado,...s.env,SG_META_ACTIVO:'0',META_ACCESS_TOKEN:'',BREVO_API_KEY:''}}))});
