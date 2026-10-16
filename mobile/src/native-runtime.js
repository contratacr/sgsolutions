import {rutaAppNativa} from '../../src/lib/ruta-app-nativa.ts';

/** Platform adapter kept separate so native events can be tested without a device. */
export async function conectarAppNativa({app,browser}){
 const origin=new URL(browser.location.origin);
 if(origin.protocol!=='http:'||!['127.0.0.1','localhost'].includes(origin.hostname))return async()=>{};
 const dispatch=name=>browser.dispatchEvent(new Event(name));
 const navigate=url=>{
  const path=rutaAppNativa(url);
  if(!path||browser.location.pathname+browser.location.search===path)return;
  dispatch('sg-app-background');
  browser.location.assign(new URL(path,origin).href);
 };
 const listeners=[];
 try{
  listeners.push(await app.addListener('appUrlOpen',event=>navigate(event.url)));
  listeners.push(await app.addListener('appStateChange',event=>dispatch(event.isActive?'sg-app-resume':'sg-app-background')));
  // A full Next navigation reloads this adapter. Consume cold launch only once
  // per WebView session so returning to Home does not replay the original link.
  let readLaunch=false;
  try{
   readLaunch=browser.sessionStorage.getItem('sg-native-launch-read')!=='1';
   browser.sessionStorage.setItem('sg-native-launch-read','1');
  }catch{readLaunch=false; /* URL events still work when session storage is unavailable. */ }
  if(readLaunch){const launch=await app.getLaunchUrl();if(launch?.url)navigate(launch.url);}
 }catch(error){await Promise.all(listeners.map(listener=>listener.remove()));throw error;}
 return async()=>{await Promise.all(listeners.map(listener=>listener.remove()));};
}
