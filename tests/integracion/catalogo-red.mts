import {test} from 'node:test';
import assert from 'node:assert/strict';
import {consultarJsonCatalogo} from '../../src/lib/consulta-catalogo.ts';

test('consulta colgada termina a los 15 segundos y cancela el transporte',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 let abortada=false;
 t.mock.method(globalThis,'fetch',(_url:unknown,init:RequestInit)=>new Promise((_resolve,reject)=>{
  init.signal!.addEventListener('abort',()=>{abortada=true;reject(new DOMException('Aborted','AbortError'));},{once:true});
 }));
 const resultado=consultarJsonCatalogo('/api/catalogo',new AbortController().signal);
 const rechazo=assert.rejects(resultado,{name:'AbortError'});
 t.mock.timers.tick(15000);await rechazo;assert.equal(abortada,true);
});
test('cambiar filtros cancela la consulta anterior',async t=>{
 t.mock.method(globalThis,'fetch',(_url:unknown,init:RequestInit)=>new Promise((_resolve,reject)=>{
  init.signal!.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});
 }));
 const anterior=new AbortController();const resultado=consultarJsonCatalogo('/api/catalogo',anterior.signal);
 const rechazo=assert.rejects(resultado,{name:'AbortError'});anterior.abort();await rechazo;
});
test('errores HTTP no se interpretan como resultados vacíos',async t=>{
 t.mock.method(globalThis,'fetch',async()=>new Response('{}',{status:503}));
 await assert.rejects(consultarJsonCatalogo('/api/catalogo',new AbortController().signal),/CATALOGO_NO_DISPONIBLE/);
});
