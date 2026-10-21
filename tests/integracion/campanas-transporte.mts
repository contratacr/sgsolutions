/** Isolated transport simulation: every fetch is intercepted, including Meta. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {procesarPublicidad} from '../../src/lib/publicidad-servidor';
test('entrega simulada: recepción comprobada, fallos, revocación y contrato mínimo',async()=>{
 const anterior={...process.env},original=globalThis.fetch;
 process.env.SUPABASE_URL='http://127.0.0.1:39999';const llavePrueba=crypto.randomUUID();process.env.SUPABASE_SERVICE_ROLE_KEY=llavePrueba;
 process.env.SG_ENTORNO='produccion';process.env.SG_META_ACTIVO='1';process.env.META_DATASET_ID='123456789';process.env.META_ACCESS_TOKEN='fixture-only';process.env.META_GRAPH_VERSION='v99.0';
 const fila={id:'a'.repeat(43),reserva:crypto.randomUUID(),contexto:crypto.randomUUID(),evento:'Purchase',ruta:'/finalizar-compra',creado_en:new Date().toISOString(),producto:null,valor:42000,fbp:'fb.1.1792531717000.1234',fbc:null,cliente:{correo:'privado@example.test'}};
 let estado=200,recibidos=1,revocada=false,envios=0;const terminaciones:Record<string,unknown>[]=[];
 globalThis.fetch=async(input,init)=>{
  const u=new URL(String(input));
  if(u.hostname==='graph.facebook.com'){
   envios++;assert.equal(u.search,'');const h=new Headers(init?.headers);assert.equal(h.get('authorization'),'Bearer fixture-only');
   const data=JSON.parse(String(init?.body));assert.equal(data.data.length,1);assert.deepEqual(Object.keys(data.data[0].user_data),['fbp']);
   for(const texto of ['privado@example.test','client_ip_address','client_user_agent','external_id','cliente'])assert.ok(!JSON.stringify(data).includes(texto));
   return Response.json({events_received:recibidos},{status:estado});
  }
  assert.equal(u.origin,'http://127.0.0.1:39999');
  if(u.pathname.endsWith('/reservar_publicidad'))return Response.json([fila]);
  if(u.pathname.endsWith('/publicidad_revocaciones'))return Response.json(revocada?{id:fila.contexto}:null);
  if(u.pathname.endsWith('/terminar_publicidad'))terminaciones.push(JSON.parse(String(init?.body)));
  return Response.json(null);
 };
 try{
  for(const caso of [{estado:200,recibidos:1,resultado:'aceptado'},{estado:200,recibidos:0,resultado:'pendiente'},{estado:503,recibidos:0,resultado:'pendiente'},{estado:429,recibidos:0,resultado:'pendiente'},{estado:400,recibidos:0,resultado:'expirado'}]){
   estado=caso.estado;recibidos=caso.recibidos;await procesarPublicidad();assert.equal(terminaciones.at(-1)?.resultado,caso.resultado);
  }
  revocada=true;const antes=envios;await procesarPublicidad();assert.equal(envios,antes);assert.equal(terminaciones.at(-1)?.resultado,'suprimido');
  process.env.SG_META_ACTIVO='0';await procesarPublicidad();assert.equal(envios,antes);
 }finally{globalThis.fetch=original;for(const k of ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SG_ENTORNO','SG_META_ACTIVO','META_DATASET_ID','META_ACCESS_TOKEN','META_GRAPH_VERSION'])if(anterior[k]===undefined)delete process.env[k];else process.env[k]=anterior[k];}
});
