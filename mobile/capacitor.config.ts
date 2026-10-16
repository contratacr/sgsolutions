import type {CapacitorConfig} from '@capacitor/cli';
import {previewConfig} from './scripts/preview-config.mjs';

const config: CapacitorConfig = {
  appId: 'com.sgsolutionscr.app.dev',
  appName: 'SG Solutions Dev',
  webDir: 'www',
  backgroundColor: '#ffffff',
  loggingBehavior: 'debug',
  ios: {contentInset: 'always', backgroundColor: '#091c29'},
  ...previewConfig(process.env.SG_MOBILE_PREVIEW_URL),
};
export default config;
