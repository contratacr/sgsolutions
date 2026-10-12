import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
export default defineConfig([...nextVitals, ...nextTs, globalIgnores(['.privado/**', '.next/**', '.next-pruebas/**', '.open-next/**', '.wrangler/**', 'next-env.d.ts', 'evidencias/**', 'test-results/**', 'playwright-report/**'])]);
