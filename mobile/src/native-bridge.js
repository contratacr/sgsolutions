import {Capacitor} from '@capacitor/core';
import {App} from '@capacitor/app';
import {conectarAppNativa} from './native-runtime.js';

if(Capacitor.isNativePlatform()){
 void conectarAppNativa({app:App,browser:window}).catch(()=>console.warn('SG_NATIVE_BRIDGE_UNAVAILABLE'));
}
