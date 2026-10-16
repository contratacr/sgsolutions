import assert from 'node:assert/strict';
import {rutaAppNativa} from '../../src/lib/ruta-app-nativa.ts';
import {conectarAppNativa} from '../src/native-runtime.js';

for(const path of ['/','/tienda','/soporte','/empresas','/casos-de-exito','/nosotros','/contacto','/favoritos','/cuenta','/terminos','/privacidad','/tienda/portatil-ejemplo','/c/0123456789abcdef','/pedido/'+'a'.repeat(64)]){
 assert.equal(rutaAppNativa('sgsolutions-dev://app'+path),path);
}
const checkout='/pagar?asesoria=00000000-0000-4000-8000-000000000001&acceso='+'a'.repeat(32);
assert.equal(rutaAppNativa('sgsolutions-dev://app'+checkout),checkout);
for(const value of [null,7,'https://sgsolutionscr.com/tienda','sgsolutions-dev://evil/tienda','sgsolutions-dev://app:3140/tienda','sgsolutions-dev://user:pass@app/tienda','sgsolutions-dev://app/tienda#fragment','sgsolutions-dev://app/tienda?url=https://evil.test','sgsolutions-dev://app/api/pagos/tilopay/iniciar','sgsolutions-dev://app/admin','sgsolutions-dev://app/panel/pedidos','sgsolutions-dev://app/cuenta/confirmar?code=attacker','sgsolutions-dev://app/pagar?retorno=https://evil.test','sgsolutions-dev://app/pagar?asesoria=x&acceso=y','sgsolutions-dev://app/%2f%2fevil.test','javascript:alert(1)','sgsolutions-dev://app/tienda\\evil'])assert.equal(rutaAppNativa(value),null,String(value));

function fixture(origin='http://127.0.0.1:3140'){
 const callbacks=new Map(),storage=new Map(),events=[],navigations=[];let launches=0,removed=0;
 const browser={location:{origin,pathname:'/',search:'',assign(url){navigations.push(url);const target=new URL(url);this.pathname=target.pathname;this.search=target.search;}},sessionStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},dispatchEvent:event=>events.push(event.type)};
 const app={async addListener(name,callback){callbacks.set(name,callback);return {async remove(){callbacks.delete(name);removed++;}};},async getLaunchUrl(){launches++;return {url:'sgsolutions-dev://app/tienda'};}};
 return {app,browser,callbacks,events,navigations,launches:()=>launches,removed:()=>removed};
}
const f=fixture(),stop=await conectarAppNativa(f);
assert.deepEqual(f.navigations,['http://127.0.0.1:3140/tienda']);
f.callbacks.get('appStateChange')({isActive:false});f.callbacks.get('appStateChange')({isActive:true});
assert.deepEqual(f.events,['sg-app-background','sg-app-background','sg-app-resume']);
f.callbacks.get('appUrlOpen')({url:'sgsolutions-dev://app/soporte'});
assert.equal(f.navigations.at(-1),'http://127.0.0.1:3140/soporte');
f.callbacks.get('appUrlOpen')({url:'https://evil.test'});assert.equal(f.navigations.length,2);
await stop();assert.equal(f.removed(),2);
f.browser.location.pathname='/';const stopAgain=await conectarAppNativa(f);
assert.equal(f.launches(),1,'Cold launch must not replay after a web navigation');await stopAgain();
const unavailable=fixture();unavailable.browser.sessionStorage.setItem=()=>{throw Error('Storage unavailable');};
const stopUnavailable=await conectarAppNativa(unavailable);assert.equal(unavailable.launches(),0);unavailable.callbacks.get('appUrlOpen')({url:'sgsolutions-dev://app/empresas'});assert.equal(unavailable.navigations.length,1);await stopUnavailable();
const foreign=fixture('https://sgsolutionscr.com');await conectarAppNativa(foreign);assert.equal(foreign.callbacks.size,0);assert.equal(foreign.launches(),0);
console.log('Native adapter: allowed destinations, hostile URLs, cold/hot launch, cleanup and lifecycle events passed.');
