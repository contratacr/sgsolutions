import {defineConfig} from '@playwright/test';
import base from './playwright.contenido.config';
import {entornoAislado} from './scripts/testing/entorno-aislado.mjs';
const servidor=base.webServer as {command:string;url:string;env?:Record<string,string>};
export default defineConfig({...base,use:{...base.use,storageState:{cookies:[],origins:[{origin:'http://127.0.0.1:3124',localStorage:[{name:'sg-medicion',value:JSON.stringify({version:'2026-11-03-v1',analitica:false,publicidad:false,fecha:new Date().toISOString()})}]}]}},testMatch:['catalogo-prioridad.spec.ts','catalogo-estabilidad.spec.ts','catalogo-acciones-estables.spec.ts','favoritos-carga.spec.ts','productos-manuales-panel.spec.ts','orden-catalogo.spec.ts'],webServer:{...servidor,env:{...entornoAislado,...servidor.env}}});
