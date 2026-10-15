import base from './playwright.checkout-ui.config';
import {defineConfig} from '@playwright/test';
export default defineConfig({...base,testMatch:['inicio-redisenado.spec.ts','inicio-navbar.spec.ts'],projects:base.projects?.map((p,i)=>({...p,name:i===0?'escritorio':'movil'}))});
