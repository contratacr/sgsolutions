import {defineConfig} from '@playwright/test';import base from './playwright.cuenta-panel.config';
const servidores=base.webServer as {command:string;url:string;env?:Record<string,string>}[];
export default defineConfig({...base,use:{...base.use,baseURL:'http://127.0.0.1:3184'},webServer:servidores.map((s,i)=>i===1?{...s,command:s.command.replaceAll('3120','3184'),url:s.url.replaceAll('3120','3184')}:s)});
