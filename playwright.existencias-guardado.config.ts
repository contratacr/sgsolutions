import {defineConfig} from '@playwright/test';
import base from './playwright.contenido.config';
import {entornoAislado} from './scripts/testing/entorno-aislado.mjs';
const servidor=base.webServer as {command:string;url:string;env:Record<string,string>};
export default defineConfig({...base,testMatch:'existencias-guardado.spec.ts',webServer:{...servidor,env:{...servidor.env,...entornoAislado}}});
