import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hitosDeNavegacion} from '../../src/lib/campanas-modelo';
import {identificadorMetaVigente,conservarClicMeta} from '../../src/lib/identificadores-meta';
test('el recorrido distingue tienda, clic, carrito y contacto sin fabricar ventas',()=>{
 assert.deepEqual(hitosDeNavegacion('PageView','/tienda',true),['campana_visita','tienda_vista','tienda_vista_clic_meta']);
 assert.deepEqual(hitosDeNavegacion('PageView','/tienda',false),['campana_visita','tienda_vista']);
 assert.deepEqual(hitosDeNavegacion('PageView','/empresas',true),['campana_visita']);
 assert.deepEqual(hitosDeNavegacion('AddToCart','/tienda',true),['campana_carrito']);
 assert.deepEqual(hitosDeNavegacion('WhatsAppClick','/empresas',true),['campana_whatsapp']);
 assert.deepEqual(hitosDeNavegacion('InitiateCheckout','/pagar',true),['campana_checkout']);
 for(const e of ['Purchase','Lead','Search'] as const)assert.deepEqual(hitosDeNavegacion(e,'/tienda',true),[]);
});
test('cookies heredadas conservan formato, antigüedad y prioridad sin reconstruir clics',()=>{
 const ahora=1793455200000,anterior=`fb.1.${ahora-1000}.clic_anterior`,reciente=`fb.1.${ahora-100}.clic_reciente`;
 assert.equal(identificadorMetaVigente(reciente,'fbc',ahora),reciente);
 for(const valor of [undefined,'inventado',`fb.1.${ahora+1}.clic`,`fb.1.${ahora-30*86400000}.clic`,`fb.1.${ahora}.correo@example.test`])assert.equal(identificadorMetaVigente(valor,'fbc',ahora),undefined);
 assert.equal(identificadorMetaVigente(`fb.1.${ahora}.1234`,'fbp',ahora),`fb.1.${ahora}.1234`);
 assert.equal(identificadorMetaVigente(reciente,'fbp',ahora),undefined);
 assert.equal(conservarClicMeta(reciente,anterior,ahora),reciente);
 assert.equal(conservarClicMeta(anterior,reciente,ahora),reciente);
 assert.equal(conservarClicMeta(undefined,undefined,ahora),undefined);
});

test('la llegada directa al producto cuenta una vista, sin duplicarla con ViewContent',()=>{
 for(const ruta of ['/tienda/producto','/tienda/laptop-lenovo-ryzen-5-82xm']){
  assert.deepEqual(hitosDeNavegacion('PageView',ruta,true),['campana_visita','tienda_vista','tienda_vista_clic_meta']);
  assert.deepEqual(hitosDeNavegacion('PageView',ruta,false),['campana_visita','tienda_vista']);
  assert.deepEqual(hitosDeNavegacion('ViewContent',ruta,true),[]);
 }
 assert.deepEqual(hitosDeNavegacion('PageView','/tienda-falsa',true),['campana_visita']);
});
