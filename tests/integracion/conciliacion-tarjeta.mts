import assert from 'node:assert/strict';
import http from 'node:http';
import {createClient} from '@supabase/supabase-js';
type Fila=Record<string,unknown>;
let pedidos:Fila[]=[],cola:Fila[]=[],correos:Fila[]=[],respuesta:unknown=[],falloConsulta=false,falloCorreo=false,falloGuardar=false;
const server=http.createServer(async(req,res)=>{
 res.setHeader('Content-Type','application/json');const u=new URL(req.url!,'http://127.0.0.1');let raw='';for await(const c of req)raw+=c;const body=raw?JSON.parse(raw):{};
 const send=(v:unknown,status=200)=>{res.statusCode=status;res.end(JSON.stringify(v));};
 if(u.pathname==='/tilopay/login')return send({access_token:'fixture'});
 if(u.pathname==='/tilopay/consult')return send({type:'200',response:respuesta},falloConsulta?503:200);
 if(u.pathname==='/brevo'){if(falloCorreo)return send({},503);correos.push(body);return send({messageId:'fixture'});}
 if(u.pathname==='/rest/v1/rpc/reservar_conciliacion_tarjeta'){
  const r=pedidos.filter(p=>!p.reservado).map(p=>{p.reservado=true;p.conciliacion_reserva=crypto.randomUUID();return {...p};});return send(r);
 }
 const rows=u.pathname.endsWith('/pedidos_tilopay')?pedidos:u.pathname.endsWith('/correos_pago_tarjeta')?cola:null;if(!rows)return send({},404);
 if(req.method==='POST'){if(!rows.some(r=>r.pedido_id===body.pedido_id&&r.destinatario===body.destinatario))rows.push({...body,estado:'pendiente',intentos:0,actualizado_en:new Date().toISOString()});return send([]);}
 const matches=rows.filter(r=>[...u.searchParams].every(([k,v])=>{
  if(['select','limit','order'].includes(k))return true;
  if(v.startsWith('eq.'))return String(r[k])===v.slice(3);
  if(v.startsWith('neq.'))return String(r[k])!==v.slice(4);
  if(v.startsWith('in.'))return v.slice(4,-1).split(',').includes(String(r[k]));
  throw new Error('Unexpected filter '+v);
 }));
 if(req.method==='PATCH'){
  if(falloGuardar&&body.aviso_intento_estado==='enviado')return send({},503);
  for(const p of matches)Object.assign(p,body);
 }
 send(req.headers.accept?.includes('vnd.pgrst.object')?matches[0]??null:matches.slice(0,Number(u.searchParams.get('limit')??100)));
});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const origen=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
Object.assign(process.env,{SG_ENTORNO:'local',SG_QA_LOCAL:'1',SG_PRUEBAS_INTEGRACION:'1',SG_SERVICIOS_PRUEBA_ORIGEN:origen,BREVO_API_KEY:'fixture',BREVO_REMITENTE:'fixture@example.test',TILOPAY_MODO:'pruebas',TILOPAY_API_USER:'fixture',TILOPAY_API_PASSWORD:'fixture',TILOPAY_API_KEY:'fixture',SUPABASE_URL:origen,SUPABASE_SERVICE_ROLE_KEY:'fixture'});
const fetchOriginal=globalThis.fetch;
globalThis.fetch=(input,init)=>{assert.equal(new URL(typeof input==='string'?input:input instanceof URL?input:input.url).origin,origen,'Network outside isolated test forbidden');return fetchOriginal(input,init);};
const db=createClient(origen,'fixture',{auth:{persistSession:false}});
const config={url:origen,serviceRole:'fixture',modo:'pruebas',entornoRespuesta:'Test',usuario:'fixture',contrasena:'fixture',llave:'fixture'};
function reset(overrides:Fila={}){
 cola=[];correos=[];respuesta=[];falloConsulta=false;falloCorreo=false;falloGuardar=false;
 pedidos=[{id:crypto.randomUUID(),estado:'pendiente',moneda:'CRC',total:500,entorno:'pruebas',creado_en:new Date(Date.now()-45*60_000).toISOString(),referencia_numero:27,cliente:{nombre:'QA',correo:'qa@example.test',modalidad:'retiro'},articulos:[],aviso_intento_estado:'pendiente',aviso_intento_elegible:true,...overrides}];return pedidos[0];
}
try{
 const {procesarConciliacionTarjetas,conciliarTarjetas}=await import('../../src/lib/conciliacion-tarjeta');
 const procesar=()=>procesarConciliacionTarjetas(db,config).catch(e=>{assert.equal(e.message,'CONCILIACION_TARJETA_PENDIENTE');});let casos=0;
 reset();await conciliarTarjetas();assert.equal(correos.length,0);assert.equal(pedidos[0].reservado,undefined);casos++;
 for(const overrides of [{},{aviso_intento_elegible:false},{archivado_en:new Date().toISOString()},{creado_en:new Date().toISOString()}]){
  const p=reset(overrides);await procesar();assert.equal(p.estado,'pendiente');const debe=Object.keys(overrides).length===0;assert.equal(correos.length,debe?1:0);if(debe){assert.ok(String(correos[0].subject).includes('Compra no completada'));assert.equal(p.aviso_intento_estado,'enviado');}casos++;
 }
 reset();falloConsulta=true;await procesar();assert.equal(correos.length,0);casos++;
 for(const error of [{amount:'999'},{currency:'USD'},{environment:'Live'},{orderNumber:crypto.randomUUID()},{type:'Refund'},{capture:'Authorization'}]){
  const p=reset();respuesta=[{orderNumber:p.id,amount:'500',currency:'CRC',environment:'Test',code:'1',type:'Payment',capture:'Capture',...error}];await procesar();assert.equal(p.estado,'pendiente');assert.equal(correos.length,0);casos++;
 }
 let p=reset();respuesta=[{orderNumber:p.id,amount:'500',currency:'CRC',environment:'Test',code:'1',type:'Payment',capture:'Capture',id_tilopay:'fixture'}];
 await Promise.all([procesar(),procesar()]);assert.equal(p.estado,'pagado');assert.equal(correos.length,2);p.reservado=false;await procesar();assert.equal(correos.length,2);casos++;
 p=reset();await Promise.all([procesar(),procesar()]);assert.equal(correos.length,1);p.reservado=false;await procesar();assert.equal(correos.length,1);casos++;
 p=reset();falloCorreo=true;await procesar();assert.equal(p.aviso_intento_estado,'pendiente');falloCorreo=false;p.reservado=false;await procesar();assert.equal(correos.length,1);casos++;
 p=reset();falloGuardar=true;await procesar();assert.equal(correos.length,1);assert.equal(p.aviso_intento_estado,'incierto');p.reservado=false;falloGuardar=false;await procesar();assert.equal(correos.length,1);casos++;
 p=reset();await procesar();p.reservado=false;respuesta=[{orderNumber:p.id,amount:'500',currency:'CRC',environment:'Test',code:'1'}];await procesar();assert.equal(p.estado,'pagado');assert.equal(correos.length,3);casos++;
 p=reset();respuesta=[{orderNumber:p.id,amount:'500',currency:'CRC',environment:'Test',code:'1'}];falloCorreo=true;await procesar();assert.equal(p.estado,'pagado');assert.equal(cola.length,2);falloCorreo=false;p.reservado=true;await procesar();assert.equal(correos.length,2);casos++;
 console.log(`PASS ${casos} isolated reconciliation cases: no return, abandonment, errors, mismatches, concurrent/duplicate jobs, retry, uncertain send, late payment. Network restricted to loopback; no real charges or emails.`);
}finally{globalThis.fetch=fetchOriginal;server.close();}
