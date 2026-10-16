import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
export default defineConfig([...nextVitals, ...nextTs, globalIgnores(['mobile/www/**', 'public/sg-native-bridge.js', 'mobile/android/**', 'mobile/ios/**', '.privado/**', '.next/**', '.next-pruebas/**', '.next-mobile/**', '.open-next/**', '.wrangler/**', 'next-env.d.ts', 'evidencias/**', 'test-results/**', 'playwright-report/**'])]);
