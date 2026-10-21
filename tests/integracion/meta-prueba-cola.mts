import {test} from 'node:test';
import assert from 'node:assert/strict';
import {construirSolicitudMeta} from '../../src/lib/meta-contrato';
test('diagnóstico de cola limitado a un PageView concreto y una hora',()=>{
 const ahora=Date.now(),id='s'.repeat(43),fila={id,evento:'PageView',creado_en:new Date(ahora).toISOString(),ruta:'/',producto:null,valor:null,fbp:`fb.1.${ahora}.1234`,fbc:null};
 const config={id,codigo:'TEST12345',vence:ahora+60000};
 const cuerpo=(f=fila,c=config)=>construirSolicitudMeta(f,JSON.stringify(c),ahora);
 assert.equal(cuerpo().test_event_code,'TEST12345');
 assert.equal(cuerpo({...fila,id:'r'.repeat(43)}).test_event_code,undefined);
 assert.equal(cuerpo({...fila,evento:'Purchase',valor:500 as never}).test_event_code,undefined);
 assert.equal(cuerpo({...fila,ruta:'/tienda'}).test_event_code,undefined);
 assert.equal(cuerpo(fila,{...config,vence:ahora-1}).test_event_code,undefined);
 assert.equal(cuerpo(fila,{...config,vence:ahora+3600001}).test_event_code,undefined);
 assert.equal(cuerpo(fila,{...config,codigo:'arbitrary'}).test_event_code,undefined);
 assert.equal(construirSolicitudMeta(fila,'{',ahora).test_event_code,undefined);
 assert.deepEqual(Object.keys(cuerpo().data[0].user_data),['fbp']);
 assert.deepEqual(construirSolicitudMeta(fila),{data:cuerpo().data});
});
