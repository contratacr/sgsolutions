import {defineConfig} from '@playwright/test';
import base from './playwright.tilopay-hosted.config';
const servidores=base.webServer as {command:string;url:string;env?:Record<string,string>}[];
export default defineConfig({...base,testMatch:['compras-matriz.spec.ts','producto-acciones.spec.ts'],timeout:60000,webServer:servidores.map((s,i)=>i===1?{...s,env:{...s.env,PEDIDOS_MANUALES_ACTIVOS:'1',PEDIDOS_ENLACE_SECRET:'fixture-matriz-'.repeat(4),PEDIDOS_ORIGEN_PUBLICO:'http://127.0.0.1:3130',SG_SERVICIOS_PRUEBA_ORIGEN:'http://127.0.0.1:3126',BREVO_API_KEY:'',EUROCOMP_API_KEY:'',EUROCOMP_PASSWORD:''}}:s)});
