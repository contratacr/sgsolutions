import {test} from 'node:test';import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {publicarCopiaEurocomp,publicacionReintentable} from '../../src/lib/eurocomp-publicacion';
import {precioVentaEurocomp} from '../../src/lib/eurocomp-politica';
import {esquemaCatalogo} from '../../src/lib/catalogo-modelo';
import base from '../../src/lib/catalogo-base.json';
const copia={fecha:'2026-11-05T12:00:00Z',bodega:0,articulos:[] as never[]};
function fixture(){const c=esquemaCatalogo.parse(base),ejemplo=c.productos.find(p=>p.codigoEurocomp)!;const codigo=ejemplo.codigoEurocomp!;const catalogo={...c,productos:[{...ejemplo,id:'manual-publicacion-qa',origen:'manual' as const,slug:'manual-publicacion-qa',eurocomp:undefined,codigoEurocomp:undefined,stockManual:3,precioManual:25000,precioDescuento:20000,destacado:true},{...ejemplo,precioFijado:false}]};return {catalogo,copia:{...copia,articulos:[{codigo,parte:'QA',nombre:'Producto QA',marca:'TP-Link',familia:'Routers',familiaPadre:'REDES Y CONECTIVDAD',imagen:'',precio:20,moneda:'USD',stock:40}]}};}
function cliente(fetcher:typeof fetch){return createClient('http://127.0.0.1:1','fixture',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:fetcher}});}
const json=(d:unknown,status=200)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json'}});
for(const fallo of ['57014','55P03','CONFLICTO'])test('relee catálogo y conserva venta/edición manual tras '+fallo,async()=>{
 const {catalogo,copia}=fixture();let lecturas=0,publicaciones=0,copias=0;
 const db=cliente(async(url,init)=>{
  if(String(url).endsWith('/rpc/preparar_publicacion_eurocomp')){copias++;return json(true);}
  if(String(url).includes('/catalogo_privado?')){lecturas++;return json({contenido:{...catalogo,productos:catalogo.productos.map(p=>p.origen==='manual'?{...p,stockManual:lecturas===1?3:2,nombre:{es:lecturas===1?'Antes':'Editado',en:'Edited'}}:p)},revision:lecturas});}
  const entrada=JSON.parse(String(init?.body));publicaciones++;assert.equal(entrada.nuevo_catalogo,null);assert.equal(entrada.revision_esperada,lecturas);
  const proveedor=entrada.privado.productos.find((p:{codigoEurocomp?:string})=>Boolean(p.codigoEurocomp));assert.equal(proveedor.eurocomp.stock,40);assert.equal(proveedor.eurocomp.costo,20);assert.equal(proveedor.precioManual,precioVentaEurocomp(20,'USD',catalogo.ajustes.cambio,catalogo.ajustes.utilidad,catalogo.ajustes.iva,catalogo.ajustes.adicional));
  const manual=entrada.privado.productos.find((p:{origen?:string})=>p.origen==='manual');assert.equal(manual.stockManual,publicaciones===1?3:2);assert.equal(manual.precioDescuento,20000);assert.equal(manual.destacado,true);
  if(publicaciones===1)return json({code:fallo==='CONFLICTO'?'P0001':fallo,message:fallo},500);
  assert.equal(manual.nombre.es,'Editado');return json(3);
 });const r=await publicarCopiaEurocomp(db,'qa',copia);assert.equal(r.intentos,2);assert.equal(copias,1);assert.equal(lecturas,2);
});
test('respuesta perdida al preparar copia se reintenta y publicación no reenvía el proveedor',async()=>{
 const {catalogo,copia}=fixture();let copias=0;const db=cliente(async(url,init)=>{
  if(String(url).endsWith('/rpc/preparar_publicacion_eurocomp')){copias++;return copias===1?json({code:'57014',message:'timeout'},500):json(true);}
  if(String(url).includes('/catalogo_privado?'))return json({contenido:catalogo,revision:1});
  assert.equal(JSON.parse(String(init?.body)).nuevo_catalogo,null);return json(2);
 });await publicarCopiaEurocomp(db,'qa',copia);assert.equal(copias,2);
});
test('agota tres intentos sin informar éxito ni volver a consultar al proveedor',async()=>{
 const {catalogo,copia}=fixture();let llamadas=0;const db=cliente(async(url)=>{if(String(url).endsWith('/rpc/preparar_publicacion_eurocomp'))return json(true);if(String(url).includes('/catalogo_privado?'))return json({contenido:catalogo,revision:1});llamadas++;return json({code:'57014',message:'timeout'},500);});await assert.rejects(()=>publicarCopiaEurocomp(db,'qa',copia),/almacenamiento/);assert.equal(llamadas,3);
});
test('no reintenta permisos, token obsoleto, datos inválidos ni copia vacía',async()=>{
 for(const message of ['SIN_PERMISO','TOKEN_OBSOLETO','VALIDACION']){let llamadas=0;const {copia}=fixture();const db=cliente(async()=>{llamadas++;return json({code:'P0001',message},400);});await assert.rejects(()=>publicarCopiaEurocomp(db,'qa',copia));assert.equal(llamadas,1);}
 assert.equal(publicacionReintentable({code:'42501'},403),false);
 await assert.rejects(()=>publicarCopiaEurocomp(cliente(async()=>{throw Error('NO_DEBE_LLAMARSE');}),'qa',copia),/respuesta/);
});
