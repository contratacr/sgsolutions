/** Local-only purchase verification. No payment processor, emails or real orders. */
import assert from 'node:assert/strict';
import http from 'node:http';
import base from '../../src/lib/catalogo-base.json';
import {esquemaCatalogo,publicarCatalogo} from '../../src/lib/catalogo-modelo';
const c=esquemaCatalogo.parse(base),plantilla=c.productos.find(p=>p.codigoEurocomp&&p.publicado)!;
const p={...plantilla,id:'manual-prueba-compra',origen:'manual' as const,slug:undefined,codigoEurocomp:undefined,eurocomp:undefined,proveedor:undefined,codigoIntcomex:undefined,precioManual:25000,precioDescuento:20000,ofertaInicio:new Date(Date.now()-60000).toISOString(),ofertaFin:new Date(Date.now()+60000).toISOString(),publicado:true,disponibilidadReferencia:'proveedor' as const};
c.productos=[p];
let lecturas=0,stockProveedor=50;
const servidor=http.createServer((req,res)=>{if(req.url==='/eurocomp'){res.setHeader('Content-Type','text/xml');return res.end(`<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:t="urn:server"><soap:Body><t:wsc_request_bodega_all_itemResponse><result>0</result><data><item xsi:type="t:items_Row"><codigo>${plantilla.codigoEurocomp}</codigo><parte>PRUEBA</parte><descripcion>Producto de prueba</descripcion><marca>Prueba</marca><familia>TARJETAS DE RED</familia><familia_padre>COMPONENTES DE PC</familia_padre><precio>123</precio><currency_code>USD</currency_code><stock>${stockProveedor}</stock></item></data></t:wsc_request_bodega_all_itemResponse></soap:Body></soap:Envelope>`);}
assert.equal(req.url?.split('?')[0],'/rest/v1/catalogo_privado');lecturas++;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({contenido:c}));});
await new Promise<void>(r=>servidor.listen(0,'127.0.0.1',r));
const origen=`http://127.0.0.1:${(servidor.address() as {port:number}).port}`;
Object.assign(process.env,{SG_ENTORNO:'local',SG_ADMIN_LOCAL:'0',SUPABASE_URL:origen,SUPABASE_SERVICE_ROLE_KEY:'fixture-only',BREVO_API_KEY:'',META_ACCESS_TOKEN:'',SG_META_ACTIVO:'0',TILOPAY_API_KEY:'',EUROCOMP_API_KEY:'fixture-only',SG_PRUEBAS_INTEGRACION:'1',SG_SERVICIOS_PRUEBA_ORIGEN:origen});
const original=globalThis.fetch;
globalThis.fetch=(input,init)=>{const u=new URL(typeof input==='string'?input:input instanceof URL?input:input.url);assert.equal(u.origin,origen,'Red externa bloqueada');return original(input,init);};
try{
 const {verificarCompraEurocomp}=await import('../../src/lib/eurocomp-compra');
 const producto=publicarCatalogo(c).productos[0];assert.equal(producto.precio,20000);
 await verificarCompraEurocomp([{producto,cantidad:2}]);
 await assert.rejects(verificarCompraEurocomp([{producto:{...producto,precio:1},cantidad:1}]),/catalogo_actualizado/);
 for(const cantidad of [0,1.5,100])await assert.rejects(verificarCompraEurocomp([{producto,cantidad}]),/catalogo_actualizado/);
 p.ofertaFin=new Date(Date.now()-1000).toISOString();
 await assert.rejects(verificarCompraEurocomp([{producto,cantidad:1}]),/catalogo_actualizado/);
 p.ofertaInicio=new Date(Date.now()+60000).toISOString();p.ofertaFin=new Date(Date.now()+120000).toISOString();
 await assert.rejects(verificarCompraEurocomp([{producto,cantidad:1}]),/catalogo_actualizado/);
 const normal=publicarCatalogo(c).productos[0];assert.equal(normal.precio,25000);await verificarCompraEurocomp([{producto:normal,cantidad:1}]);
 p.publicado=false;await assert.rejects(verificarCompraEurocomp([{producto:normal,cantidad:1}]),/catalogo_actualizado/);
 p.publicado=true;p.disponibilidadReferencia='agotado' as typeof p.disponibilidadReferencia;await assert.rejects(verificarCompraEurocomp([{producto:normal,cantidad:1}]),/catalogo_actualizado/);
 const proveedor={...plantilla,precioFijado:true,precioManual:25000,precioDescuento:20000,ofertaInicio:new Date(Date.now()-60000).toISOString(),ofertaFin:new Date(Date.now()+60000).toISOString(),eurocomp:{codigo:plantilla.codigoEurocomp!,stock:50,costo:1,moneda:'USD' as const,actualizado:new Date().toISOString()}};
 c.productos=[proveedor];const visible=publicarCatalogo(c).productos[0];
 await verificarCompraEurocomp([{producto:visible,cantidad:1}]);
 stockProveedor=0;await assert.rejects(verificarCompraEurocomp([{producto:visible,cantidad:1}]),/catalogo_actualizado/);
 stockProveedor=50;proveedor.precioFijado=false;await assert.rejects(verificarCompraEurocomp([{producto:visible,cantidad:1}]),/catalogo_actualizado/);
 assert.ok(lecturas>=10);console.log('PASS precio vigente, cantidad, manipulación, inicio/fin de oferta, despublicación y agotado; precio fijado respeta existencias; solo lecturas locales.');
}finally{globalThis.fetch=original;await new Promise<void>(r=>servidor.close(()=>r()));}
