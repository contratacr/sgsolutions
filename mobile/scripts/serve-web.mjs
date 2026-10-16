import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {preparePreviewAccount} from './preview-account.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
await preparePreviewAccount();
// Values override .env.local as well as inherited credentials. No live side effects.
const env = {...process.env, NODE_ENV: 'development', SG_ENTORNO: 'local', SG_MOBILE_PREVIEW: '1',
  SG_PRUEBAS_INTEGRACION: '1', SG_QA_LOCAL: '1', SG_ADMIN_LOCAL: '1',
  SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', CUENTAS_SUPABASE_URL: '', CUENTAS_SUPABASE_ANON_KEY: '',
  NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
  TILOPAY_API_USER: '', TILOPAY_API_PASSWORD: '', TILOPAY_API_KEY: '', TILOPAY_MODO: 'pruebas',
  TILOPAY_RETORNO_URL: '', BREVO_API_KEY: '', PEDIDOS_MANUALES_ACTIVOS: '', PEDIDOS_ENLACE_SECRET: '',
  SG_SERVICIOS_PRUEBA_ACTIVOS: '', SG_SERVICIOS_PRUEBA_ORIGEN: '',
  EUROCOMP_ACTUALIZACION_ACTIVA: '', EUROCOMP_API_KEY: '', EUROCOMP_PASSWORD: '', NEXT_PUBLIC_META_PIXEL_ID: '',
};
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3140'], {cwd: root, env, stdio: 'inherit'});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => {process.exitCode = code ?? 1;});
