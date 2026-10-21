/** Ejecución explícita: node --conditions=react-server --import tsx tests/integracion/plazo-correos.mts */
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
const catalogo=JSON.parse(readFileSync('src/lib/catalogo-base.json','utf8'));
type Fila=Record<string,unknown>;
let pagoConfirmado=false;let tablas:Record<string,Fila[]>={};const correos:Record<string,unknown>[]=[];
const servidor=http.createServer(async(req,res)=>{
 res.setHeader('Content-Type','application/json');const u=new URL(req.url!,'http://127.0.0.1');let raw='';for await(const c of req)raw+=c;
 const body=raw?JSON.parse(raw):{};
 if(u.pathname==='/tilopay/login')return res.end(JSON.stringify({access_token:'fixture'}));
 if(u.pathname==='/tilopay/processPayment')return res.end(JSON.stringify({type:'100',url:'https://secure.tilopay.com/fixture'}));
 if(u.pathname==='/tilopay/consult'){const p=tablas.pedidos_tilopay.find(p=>p.id===body.orderNumber)!;return res.end(JSON.stringify({type:'200',response:pagoConfirmado?[{orderNumber:p.id,amount:String(p.total),currency:'CRC',environment:'Test',code:'1'}]:[]}));}
 if(u.pathname==='/brevo'){correos.push(body);return res.end(JSON.stringify({messageId:'fixture-only'}));}
 if(u.pathname==='/rest/v1/catalogo_privado')return res.end(JSON.stringify({contenido:catalogo}));
 const rows=tablas[u.pathname.split('/').at(-1)!];if(!rows){res.statusCode=500;return res.end(JSON.stringify({error:'ruta_no_prevista'}));}
 if(req.method==='POST'){
  if(u.pathname.endsWith('correos_pago_tarjeta')){if(!rows.some(r=>r.pedido_id===body.pedido_id&&r.destinatario===body.destinatario))rows.push({...body,estado:'pendiente',intentos:0,actualizado_en:'2026-10-19T00:00:00Z'});return res.end('[]');}
  const fila={...body,referencia_numero:100+rows.length};rows.push(fila);return res.end(JSON.stringify(fila));
 }
 const matches=rows.filter(r=>[...u.searchParams].every(([k,v])=>k==='select'||k==='order'||v.startsWith('gt.')?true:v.startsWith('eq.')?String(r[k])===v.slice(3):true));
 if(req.method==='PATCH')for(const r of matches)Object.assign(r,body);
 res.end(JSON.stringify(req.headers.accept?.includes('vnd.pgrst.object')?matches[0]??null:matches));
});
await new Promise<void>(r=>servidor.listen(0,'127.0.0.1',r));
const puerto=(servidor.address() as {port:number}).port,origen=`http://127.0.0.1:${puerto}`;
Object.assign(process.env,{SG_ENTORNO:'local',SG_PRUEBAS_INTEGRACION:'1',SG_ADMIN_LOCAL:'0',SUPABASE_URL:origen,SUPABASE_SERVICE_ROLE_KEY:'fixture-only',PEDIDOS_MANUALES_ACTIVOS:'1',PEDIDOS_ENLACE_SECRET:'fixture-only-'.repeat(4),PEDIDOS_ORIGEN_PUBLICO:origen,SG_SERVICIOS_PRUEBA_ORIGEN:origen,BREVO_API_KEY:'fixture-only',BREVO_REMITENTE:'qa@example.test',EUROCOMP_API_KEY:'',EUROCOMP_PASSWORD:''});
// Bloquea cualquier destino de red ajeno al laboratorio, incluso ante una regresión.
const original=globalThis.fetch;
globalThis.fetch=(input,init)=>{assert.equal(new URL(typeof input==='string'?input:input instanceof URL?input:input.url).origin,origen,'Intento de red fuera del laboratorio');return original(input,init);};
Object.assign(process.env,{SG_QA_LOCAL:'1',TILOPAY_MODO:'pruebas',TILOPAY_API_USER:'fixture',TILOPAY_API_PASSWORD:'fixture',TILOPAY_API_KEY:'fixture',TILOPAY_PRUEBA_VERIFICADA_EN:new Date().toISOString(),TILOPAY_RETORNO_URL:'http://127.0.0.1:3107/api/pagos/tilopay/resultado'});
try{
 const {POST}=await import('../../src/app/api/pagos/tilopay/iniciar/route');
 const {GET}=await import('../../src/app/api/pagos/tilopay/resultado/route');
 const {notificarPagoTarjeta}=await import('../../src/lib/email/pago-tarjeta');
 const id=crypto.randomUUID(),token='a'.repeat(32),producto={id:'qa-fisico',nombre:{es:'Producto QA',en:'QA product'},precio:500,codigoFabricante:'QA',disponibilidad:'disponible'};
 tablas={solicitudes_asesoria:[{id,token,estado:'aprobada',vence_en:new Date(Date.now()+3600000).toISOString(),articulos:[{producto,cantidad:1}]}],pedidos_tilopay:[],correos_pago_tarjeta:[]};
 const datos={nombre:'Ana',apellidos:'QA',correo:'qa@example.test',telefono:'88888888',modalidad:'retiro',factura:'tiquete',consentimiento:'on'};
 const r=await POST(new Request(origen+'/api/pagos/tilopay/iniciar',{method:'POST',headers:{origin:origen,host:new URL(origen).host,'content-type':'application/json'},body:JSON.stringify({asesoria:id,acceso:token,idioma:'es',...datos,datos,consentimiento:true,articulos:[{id:producto.id,cantidad:1}]})}));
 assert.equal(r.status,200,await r.text());const p=tablas.pedidos_tilopay[0];assert.equal(p.estado,'pendiente');assert.equal(correos.length,0);
 const db=createClient(origen,'fixture-only',{auth:{persistSession:false}});await notificarPagoTarjeta(db,p.id as string);assert.equal(correos.length,0);
 const callback=()=>GET(new Request(origen+'/api/pagos/tilopay/resultado?returnData='+encodeURIComponent(btoa(p.id as string))));
 await callback();assert.equal(p.estado,'pendiente');assert.equal(correos.length,0);
 console.log('PASS: retiro sin pagar y retorno sin transacción permanecen pendientes, sin avisos de pago.');
 pagoConfirmado=true;await callback();assert.equal(p.estado,'pagado');assert.equal(correos.length,2);assert.ok(correos.some(c=>String(c.subject).includes('Pago con tarjeta confirmado')));
 await callback();assert.equal(correos.length,2);console.log('PASS: pago verificado genera avisos al cliente y SG; retorno repetido no duplica avisos. Cero cobros y correos reales.');
}finally{globalThis.fetch=original;servidor.close();}
