import base from './playwright.tarjeta-directa.config';
import {defineConfig} from '@playwright/test';
const servidor=Array.isArray(base.webServer)?base.webServer[0]:base.webServer;
export default defineConfig({...base,testMatch:['tilopay-sdk.spec.ts'],webServer:{...servidor!,env:{...servidor!.env,TILOPAY_SDK_METODO_TARJETA:'qa-card'}}});
