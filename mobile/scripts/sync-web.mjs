import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {previewConfig} from './preview-config.mjs';

const origin = process.env.SG_MOBILE_PREVIEW_URL || 'http://127.0.0.1:3140';
const config = previewConfig(origin);
const check = new URL('/api/mobile-preview', config.server.url);
const response = await fetch(check, {signal: AbortSignal.timeout(5000), redirect: 'error'});
if (!response.ok || (await response.json()).isolated !== true) throw new Error('Start npm run web --prefix mobile before synchronizing the preview.');
const result = spawnSync(process.execPath, ['node_modules/@capacitor/cli/bin/capacitor', 'sync'], {
  cwd: fileURLToPath(new URL('../', import.meta.url)),
  env: {...process.env, SG_MOBILE_PREVIEW_URL: origin}, stdio: 'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
