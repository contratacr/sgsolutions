import {defineConfig} from '@playwright/test';
import base from './playwright.entrega.config';
import {entornoAislado} from './scripts/testing/entorno-aislado.mjs';
const servidores=base.webServer as {command:string;url:string;env?:Record<string,string>}[];
export default defineConfig({...base,testMatch:'zoom-campos.spec.ts',webServer:servidores.map(s=>s.env?{...s,env:{...entornoAislado,...s.env,SG_META_ACTIVO:'0',BREVO_API_KEY:'',TILOPAY_API_KEY:'',TILOPAY_API_USER:'',TILOPAY_API_PASSWORD:'',EUROCOMP_API_KEY:'',EUROCOMP_PASSWORD:''}}:s)});
