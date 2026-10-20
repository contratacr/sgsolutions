/** Ejecución explícita: node --conditions=react-server --import tsx tests/integracion/plazo-correos.mts */
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
const catalogo=JSON.parse(readFileSync('src/lib/catalogo-base.json','utf8'));
type Fila=Record<string,unknown>;
let tablas:Record<string,Fila[]>={};let correos:Record<string,unknown>[]=[];
const servidor=http.createServer(async(req,res)=>{
 res.setHeader('Content-Type','application/json');const u=new URL(req.url!,'http://127.0.0.1');let raw='';for await(const c of req)raw+=c;
 const body=raw?JSON.parse(raw):{};
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
try{
 const {POST}=await import('../../src/app/api/pedidos/manual/route');
 const {notificarPagoTarjeta}=await import('../../src/lib/email/pago-tarjeta');
 const {aceptacionPedido}=await import('../../src/lib/politicas');
 const promesas={es:'Entrega en un máximo de 7 días hábiles desde la confirmación del pago.',en:'Delivery within 7 business days after payment confirmation.'};
 const fisico={id:'qa-fisico',nombre:{es:'Producto QA',en:'QA product'},precio:500,codigoFabricante:'QA',disponibilidad:'disponible'};
 const {incorporarSoftware}=await import('../../src/lib/incorporar-software');
 const {preciosProducto}=await import('../../src/lib/catalogo-modelo');
 const actualizado=incorporarSoftware(catalogo),base=actualizado.productos.find(p=>p.id==='software-intcomex-se027mse92')!;
 const software={...base,precio:preciosProducto(base,actualizado.ajustes).precio,disponibilidad:'disponible'};
 let casos=0;
 for(const idioma of ['es','en'] as const)for(const modalidad of ['retiro','envio','express','digital'])for(const metodo of ['sinpe','transferencia']){
  const producto=modalidad==='digital'?software:fisico,id='00000000-0000-4000-8000-000000000001',token='a'.repeat(32);
  tablas={solicitudes_asesoria:[{id,token,estado:'aprobada',vence_en:new Date(Date.now()+3600000).toISOString(),articulos:[{producto,cantidad:1}]}],pedidos_manuales:[]};correos=[];
  const r=await POST(new Request(origen+'/api/pedidos/manual',{method:'POST',headers:{origin:origen,host:new URL(origen).host,'content-type':'application/json'},body:JSON.stringify({asesoria:id,acceso:token,idioma,metodo,articulos:[{id:producto.id,cantidad:1}],datos:{nombre:'Ana',apellidos:'QA',correo:'qa@example.test',telefono:'88888888',modalidad,factura:'tiquete',consentimiento:'on',provincia:'Alajuela',canton:'Atenas',distrito:'Atenas',direccion:'Dirección QA'}})}));
  assert.equal(r.status,201,`${idioma} ${modalidad} ${metodo}: ${await r.text()}`);assert.equal(correos.length,2);
  const c=correos.find(c=>(c.to as {email:string}[])[0].email==='qa@example.test')!;
  for(const campo of ['textContent','htmlContent'])assert.ok(String(c[campo]).includes(promesas[idioma]),`${campo}: ${idioma} ${modalidad}`);
  const equipo=correos.find(c=>(c.to as {email:string}[])[0].email!=='qa@example.test')!;assert.ok(String(equipo.textContent).includes(promesas.es));
  const cliente=tablas.pedidos_manuales[0].cliente as Fila;assert.equal(cliente.plazo_entrega_dias_habiles,7);assert.equal(cliente.plazo_entrega_desde,'pago_confirmado');assert.equal(cliente.aceptacion_terminos_version,'2026-10-19');casos++;
 }
 const db=createClient(origen,'fixture-only',{auth:{persistSession:false}});
 for(const idioma of ['es','en'] as const)for(const modalidad of ['retiro','envio','express','digital'])for(const vigente of [true,false]){
  const id=crypto.randomUUID();tablas={pedidos_tilopay:[{id,estado:'pagado',entorno:'produccion',referencia_numero:42,total:500,articulos:[{nombre:'QA',cantidad:1}],cliente:{nombre:'Ana',correo:'qa@example.test',idioma,modalidad,...(vigente?aceptacionPedido():{})}}],correos_pago_tarjeta:[]};correos=[];
  await notificarPagoTarjeta(db,id);assert.equal(correos.length,2);
  for(const c of correos){const equipo=(c.to as {email:string}[])[0].email!=='qa@example.test';for(const campo of ['textContent','htmlContent'])assert.equal(String(c[campo]).includes(promesas[equipo?'es':idioma]),vigente,`${campo} tarjeta ${modalidad} vigente=${vigente}`);}
  await notificarPagoTarjeta(db,id);assert.equal(correos.length,2,'El reintento no duplica correos');casos++;
 }
 console.log(`${casos} casos de pedido/correos aprobados. Red limitada a loopback; cero correos reales.`);
}finally{globalThis.fetch=original;servidor.close();}
