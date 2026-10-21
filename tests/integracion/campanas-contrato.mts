/** Manual, isolated: node --conditions=react-server --import tsx --test tests/integracion/campanas-contrato.mts */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {origenCampana,eventoPublicidadNavegador} from '../../src/lib/campanas-modelo';
import {construirEventoMeta} from '../../src/lib/meta-contrato';
import {campanaPermitida,leerContextoFirmado,configuracionMeta} from '../../src/lib/publicidad-servidor';
test('origen orgánico no se transforma automáticamente en anuncio',()=>{
 assert.equal(origenCampana('','https://www.facebook.com/post').medio,'referido');
 assert.equal(origenCampana('','https://l.instagram.com/').canal,'instagram');
 assert.equal(origenCampana('?utm_source=google&utm_medium=organic','').medio,'organico');
 assert.equal(origenCampana('','').canal,'directo');
 assert.equal(origenCampana('?utm_source=facebook&utm_campaign=nombre%40example.com','').campana,'');
 const anterior=process.env.SG_CAMPANAS_PERMITIDAS;process.env.SG_CAMPANAS_PERMITIDAS='redes-octubre';
 assert.equal(campanaPermitida({canal:'facebook',medio:'pago',campana:'desconocida'}).medio,'desconocido');
 assert.equal(campanaPermitida({canal:'facebook',medio:'pago',campana:'redes-octubre'}).campana,'redes-octubre');
 if(anterior===undefined)delete process.env.SG_CAMPANAS_PERMITIDAS;else process.env.SG_CAMPANAS_PERMITIDAS=anterior;
});
test('el navegador no puede declarar ventas, leads ni añadir datos libres',()=>{
 for(const evento of ['Purchase','Lead'])assert.equal(eventoPublicidadNavegador.safeParse({id:crypto.randomUUID(),evento,ruta:'/tienda'}).success,false);
 assert.equal(eventoPublicidadNavegador.safeParse({id:crypto.randomUUID(),evento:'Search',ruta:'/tienda',search_string:'texto privado'}).success,false);
 assert.equal(eventoPublicidadNavegador.safeParse({id:crypto.randomUUID(),evento:'PageView',ruta:'/cuenta'}).success,false);
});
test('payload de Meta usa solo campos permitidos; no exporta datos presentes en la fila',()=>{
 const fila={id:'a'.repeat(43),evento:'Purchase',creado_en:'2026-10-20T10:00:00Z',ruta:'/finalizar-compra',producto:null,valor:42000,fbp:'fb.1.1792531717000.1234',fbc:null,correo:'privado@example.test',telefono:'88888888',cliente:{nombre:'Privado'},client_ip_address:'192.0.2.1',search_string:'búsqueda privada'};
 const e=construirEventoMeta(fila);assert.deepEqual(Object.keys(e.user_data),['fbp']);assert.deepEqual(e.custom_data,{currency:'CRC',value:42000});
 const s=JSON.stringify(e);for(const prohibido of ['privado','192.0.2.1','correo','telefono','cliente','search_string','client_ip_address','external_id'])assert.ok(!s.includes(prohibido));
 assert.throws(()=>construirEventoMeta({...fila,ruta:'/pagar?acceso=secreto'}));assert.throws(()=>construirEventoMeta({...fila,valor:null}));
});
test('contexto firmado rechaza alteraciones, vencimiento y ventanas extendidas',()=>{
 const anterior=process.env.SUPABASE_SERVICE_ROLE_KEY,llavePrueba=crypto.randomUUID();process.env.SUPABASE_SERVICE_ROLE_KEY=llavePrueba;
 const c={id:crypto.randomUUID(),creado:Date.now()-1000,vence:Date.now()+86400000,primero:{canal:'google',medio:'pago',campana:'demo'},reciente:{canal:'google',medio:'pago',campana:'demo'},fbp:'fb.1.1792531717000.1234'};
 const firmar=(datos:unknown)=>{const b=Buffer.from(JSON.stringify(datos)).toString('base64url');return b+'.'+createHmac('sha256',process.env.SUPABASE_SERVICE_ROLE_KEY!).update('sg:publicidad:v1:cookie:'+b).digest('base64url');};
 assert.equal(leerContextoFirmado(firmar(c))?.id,c.id);assert.equal(leerContextoFirmado(firmar({...c,vence:Date.now()-1})),null);assert.equal(leerContextoFirmado(firmar({...c,vence:Date.now()+40*86400000})),null);assert.equal(leerContextoFirmado(firmar(c)+'alterado'),null);
 const env={...process.env};process.env.SG_ENTORNO='local';process.env.SG_META_ACTIVO='1';process.env.META_DATASET_ID='123456789';process.env.META_ACCESS_TOKEN='fixture';process.env.META_GRAPH_VERSION='v99.0';assert.equal(configuracionMeta(),null);
 for(const k of ['SG_ENTORNO','SG_META_ACTIVO','META_DATASET_ID','META_ACCESS_TOKEN','META_GRAPH_VERSION'])if(env[k]===undefined)delete process.env[k];else process.env[k]=env[k];
 if(anterior===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=anterior;
});
