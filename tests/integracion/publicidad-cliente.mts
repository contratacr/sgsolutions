/** Manual and entirely intercepted; requires user authorization before execution. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sincronizarPublicidad,enviarPublicidad,leerAdquisicionPublicidad} from '../../src/lib/publicidad-cliente';
import {VERSION_PREFERENCIAS_MEDICION} from '../../src/lib/preferencias-medicion';

test('atribución y revocación bajo sincronizaciones concurrentes',async t=>{
 const originales=new Map<string,PropertyDescriptor|undefined>();
 const instalar=(clave:string,valor:unknown)=>{originales.set(clave,Object.getOwnPropertyDescriptor(globalThis,clave));Object.defineProperty(globalThis,clave,{configurable:true,writable:true,value:valor});};
 const valores=new Map<string,string>();
 const ubicacion={search:'',origin:'https://example.test'};
 const documento={referrer:'',body:{dataset:{} as Record<string,string>},documentElement:{lang:'es'}};
 instalar('location',ubicacion);instalar('document',documento);instalar('localStorage',{getItem:(k:string)=>valores.get(k)??null});
 const solicitudes:{url:string;cuerpo:Record<string,unknown>}[]=[];
 let retener=false,liberar:(()=>void)|undefined;
 instalar('fetch',async (url:string,opciones:RequestInit)=>{
  assert.ok(['/api/publicidad/contexto','/api/publicidad/evento'].includes(url),'Toda la red debe estar interceptada');
  const cuerpo=JSON.parse(String(opciones.body));solicitudes.push({url,cuerpo});
  if(retener&&url==='/api/publicidad/contexto'){retener=false;await new Promise<void>(r=>{liberar=r;});}
  return Response.json({activo:cuerpo.permitir===true});
 });
 t.after(()=>{for(const [clave,descriptor] of originales){if(descriptor)Object.defineProperty(globalThis,clave,descriptor);else Reflect.deleteProperty(globalThis,clave);}});
 const consentir=(publicidad:boolean)=>valores.set('sg-medicion',JSON.stringify({version:VERSION_PREFERENCIAS_MEDICION,analitica:true,publicidad}));
 const drenar=()=>new Promise<void>(r=>setImmediate(r));

 await t.test('una sincronización nueva no pierde el PageView que esperaba la anterior',async()=>{
  consentir(true);ubicacion.search='?utm_source=instagram&utm_medium=paid_social&utm_campaign=sg_ventas_tienda_20261028&fbclid=clic_sintetico';
  retener=true;const inicial=sincronizarPublicidad(true);await drenar();
  enviarPublicidad('PageView','/tienda');
  ubicacion.search='';const siguiente=sincronizarPublicidad(true);
  liberar!();await Promise.all([inicial,siguiente]);await drenar();
  assert.equal(solicitudes.filter(s=>s.url==='/api/publicidad/evento').length,1);
  const contexto=solicitudes.filter(s=>s.url==='/api/publicidad/contexto').at(-1)!.cuerpo;
  assert.equal(contexto.fbclid,'clic_sintetico');
  assert.equal((contexto.adquisicion as {campana:string}).campana,'sg_ventas_tienda_20261028');
 });
 await t.test('revocar y aceptar de nuevo no revive eventos anteriores ni omite la revocación',async()=>{
  solicitudes.length=0;retener=true;const inicial=sincronizarPublicidad(true);await drenar();
  enviarPublicidad('PageView','/tienda');
  consentir(false);const retirada=sincronizarPublicidad(false);
  consentir(true);const nueva=sincronizarPublicidad(true);
  liberar!();await Promise.all([inicial,retirada,nueva]);await drenar();
  assert.equal(solicitudes.filter(s=>s.url==='/api/publicidad/evento').length,0);
  assert.deepEqual(solicitudes.filter(s=>s.url==='/api/publicidad/contexto').map(s=>s.cuerpo.permitir),[true,false,true]);
  assert.equal(solicitudes.at(-1)!.cuerpo.fbclid,undefined);
 });
 await t.test('una captura consentida conserva el clic antes de una espera de permisos',async()=>{
  ubicacion.search='?utm_source=facebook&fbclid=otro_clic_sintetico';
  const captura=leerAdquisicionPublicidad();ubicacion.search='';
  await sincronizarPublicidad(true,captura);
  assert.equal(solicitudes.at(-1)!.cuerpo.fbclid,'otro_clic_sintetico');
 });
 await t.test('sin consentimiento no se captura el clic y un administrador no envía eventos',async()=>{
  consentir(false);ubicacion.search='?fbclid=no_capturar';assert.equal(leerAdquisicionPublicidad(),undefined);
  await sincronizarPublicidad(false);solicitudes.length=0;
  consentir(true);await sincronizarPublicidad(true);
  documento.body.dataset.excluirMedicion='1';enviarPublicidad('PageView','/tienda');await drenar();
  assert.equal(solicitudes.filter(s=>s.url==='/api/publicidad/evento').length,0);
  consentir(false);await sincronizarPublicidad(false);
 });
});
