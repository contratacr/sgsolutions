import {defineConfig} from '@playwright/test';
import base from './playwright.estadisticas.config';
import {entornoAislado} from './scripts/testing/entorno-aislado.mjs';
export default defineConfig({...base,testMatch:/(campanas-recorrido|estadisticas-panel)\.spec\.ts/,
 grep:/llegada consentida|sin consentimiento|servidor conserva|estadísticas, períodos/,
 webServer:(Array.isArray(base.webServer)?base.webServer:[]).map(s=>({...s,env:{...entornoAislado,...s.env}}))});
