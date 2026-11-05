import {test} from 'node:test';
import assert from 'node:assert/strict';
import base from '../../src/lib/catalogo-base.json';
import {esquemaCatalogo,publicarCatalogo,preciosProducto,actualizarOfertasPublicas,descuentosInvalidos} from '../../src/lib/catalogo-modelo';
import {reconciliarEurocomp} from '../../src/lib/eurocomp-catalogo';
import {migrarCatalogoManual,catalogoPublicoManual} from '../../src/lib/catalogo-manual';
import {patronIdFavorito} from '../../src/lib/favoritos-identidad';
import {fechaOfertaLocal,fechaOfertaUtc} from '../../src/lib/ofertas-fechas';
const catalogo=()=>{const c=esquemaCatalogo.parse(base);const ejemplo=c.productos.find(p=>p.codigoEurocomp&&p.publicado)!;const p={...ejemplo,id:'manual-prueba',origen:'manual' as const,slug:undefined,codigoEurocomp:undefined,eurocomp:undefined,codigoIntcomex:undefined,proveedor:undefined,coleccion:undefined,costoUsd:null,costoCrc:null,precioReferencia:null,precioManual:25000,precioDescuento:20000,ofertaInicio:'2026-11-10T15:00:00Z',ofertaFin:'2026-11-11T15:00:00Z',destacado:true,revisionPrecio:false};return {...c,gestion:'manual' as const,productos:[p]};};
test('manual explícito persiste en panel, publicación, migración y sincronización; antiguo no reaparece',()=>{
 const c=esquemaCatalogo.parse(catalogo()),p=c.productos[0];
 const sync=reconciliarEurocomp(c,{fecha:new Date().toISOString(),bodega:0,articulos:[]});
 assert.deepEqual(sync.productos,[p]);
 assert.deepEqual(migrarCatalogoManual(c).productos,[p]);
 const visible=publicarCatalogo(c);assert.equal(visible.productos[0].origen,'manual');assert.equal(visible.productos[0].destacado,true);
 assert.equal(catalogoPublicoManual(visible).productos.length,1);assert.ok(patronIdFavorito.test(p.id));
 assert.equal(publicarCatalogo({...c,productos:[{...p,origen:undefined}]}).productos.length,0);
 assert.equal(publicarCatalogo({...c,productos:[{...p,publicado:false}]}).productos.length,0);
 assert.equal(publicarCatalogo({...c,productos:[{...p,imagen:'/imagenes/producto-sin-imagen.svg',imagenes:[]}]}).productos.length,0);
 for(const campo of ['costoUsd','costoCrc','precioManual','precioDescuento','precioFijado','proveedor'])assert.ok(!(campo in visible.productos[0]));
});
test('oferta inicia inclusiva, termina exclusiva y restaura precio incluso en snapshot persistido',()=>{
 const c=catalogo(),p=c.productos[0],inicio=Date.parse(p.ofertaInicio),fin=Date.parse(p.ofertaFin);
 for(const [ahora,precio,antes]of [[inicio-1,25000,null],[inicio,20000,25000],[fin-1,20000,25000],[fin,25000,null]] as const){
  assert.deepEqual(preciosProducto(p,c.ajustes,ahora),{precio,precioOriginal:antes});
  const snapshot=actualizarOfertasPublicas(publicarCatalogo(c),ahora);assert.equal(snapshot.productos[0].precio,precio);assert.equal(snapshot.productos[0].precioOriginal,antes);
 }
 assert.deepEqual(descuentosInvalidos(c),[]);
 assert.equal(preciosProducto({...p,ofertaInicio:null,ofertaFin:null},c.ajustes).precio,20000);
 assert.equal(preciosProducto({...p,precioDescuento:null},c.ajustes).precio,25000);
});
test('valida fechas, descuentos, origen y vínculos de proveedor en el servidor',()=>{
 const c=catalogo(),p=c.productos[0];
 for(const cambios of [{ofertaFin:p.ofertaInicio},{ofertaFin:'inválida'},{precioDescuento:null},{origen:'manual',codigoEurocomp:'123'},{id:'eurocomp-falso',origen:'manual'}])assert.equal(esquemaCatalogo.safeParse({...c,productos:[{...p,...cambios}]}).success,false);
 for(const precioDescuento of [25000,26000])assert.deepEqual(descuentosInvalidos({...c,productos:[{...p,precioDescuento}]}),[0]);
 assert.equal(esquemaCatalogo.safeParse({...c,productos:[{...p,precioDescuento:-1}]}).success,false);
});
test('sincronización conserva promociones y precio fijado; actualiza existencias y costo',()=>{
 const c=esquemaCatalogo.parse(base),p=c.productos.find(p=>p.codigoEurocomp&&p.publicado)!;
 p.precioManual=25000;p.precioFijado=true;p.precioDescuento=20000;p.ofertaInicio='2026-11-01T00:00:00Z';p.ofertaFin='2026-12-01T00:00:00Z';p.destacado=true;p.ofertaPrioritaria=true;
 c.productos=[p];
 const copia={fecha:'2026-11-04T12:00:00Z',bodega:0,articulos:[{codigo:p.codigoEurocomp!,nombre:'Proveedor cambió nombre',marca:p.marca,parte:p.codigoFabricante,familia:'TARJETAS DE RED',familiaPadre:'COMPONENTES DE PC',precio:123,moneda:'USD',stock:50,imagen:p.imagen}]};
 const actualizado=reconciliarEurocomp(c,copia).productos[0];
 for(const k of ['precioManual','precioDescuento','ofertaInicio','ofertaFin','ofertaPrioritaria','destacado','nombre','publicado'] as const)assert.deepEqual(actualizado[k],p[k]);
 assert.equal(actualizado.eurocomp?.stock,50);assert.equal(actualizado.eurocomp?.costo,123);
 p.precioFijado=false;assert.notEqual(reconciliarEurocomp(c,copia).productos[0].precioManual,25000);
});
test('horarios administrativos usan Costa Rica aunque PC esté en otra zona',()=>{
 assert.equal(fechaOfertaUtc('2026-11-10T09:00'),'2026-11-10T15:00:00.000Z');
 assert.equal(fechaOfertaLocal('2026-11-10T15:00:00Z'),'2026-11-10T09:00');
 assert.equal(fechaOfertaUtc(''),null);assert.equal(fechaOfertaLocal(null),'');
});

test('ofertas prioritarias lideran Recomendados; no alteran precio, relevancia ni filtros',async()=>{
 const {consultarCatalogo}=await import('../../src/lib/catalogo-consulta');
 const {recomendaciones}=await import('../../src/lib/recomendaciones');
 const c=catalogo(),p=c.productos[0];p.ofertaInicio='2020-01-01T00:00:00Z';p.ofertaFin='2099-01-01T00:00:00Z';
 const prioritario={...p,ofertaPrioritaria:true,destacado:false};
 const normal={...p,id:'manual-normal',slug:undefined,precioDescuento:null,ofertaInicio:null,ofertaFin:null,precioManual:1000,marca:'Otra',destacado:true};
 c.productos=[normal,prioritario];const visible=publicarCatalogo(c);
 const consulta=(params:Record<string,string>)=>consultarCatalogo(visible,new URLSearchParams(params),{[normal.id]:10000000});
 assert.equal(consulta({orden:'recomendados',explorados:normal.id}).productos[0].id,p.id);
 assert.equal(consulta({orden:'menor'}).productos[0].id,normal.id);
 assert.equal(consulta({orden:'mayor'}).productos[0].id,p.id);
 assert.equal(consulta({orden:'recomendados',marca:'Otra'}).productos.length,1);
 assert.equal(consulta({orden:'recomendados',max:'1000'}).productos[0].id,normal.id);
 assert.equal(recomendaciones(visible.productos).destacados[0].id,p.id);
 assert.equal(new Set(consulta({orden:'recomendados'}).productos.map(x=>x.id)).size,2);
 for(const cambio of [{ofertaFin:'2021-01-01T00:00:00Z'},{ofertaInicio:'2090-01-01T00:00:00Z'},{disponibilidadReferencia:'agotado' as const},{precioDescuento:null,ofertaInicio:null,ofertaFin:null}]){
  const actualizado=publicarCatalogo({...c,productos:[normal,{...prioritario,...cambio}]});
  assert.equal(consultarCatalogo(actualizado,new URLSearchParams({orden:'recomendados'})).productos[0].id,normal.id);
 }
});

test('la mezcla empresarial no desplaza ni duplica una oferta prioritaria',async()=>{
 const {consultarCatalogo}=await import('../../src/lib/catalogo-consulta');
 const {default:empresas}=await import('../../src/lib/catalogo-empresarial.json');
 const c=catalogo();c.productos[0].ofertaInicio='2020-01-01T00:00:00Z';c.productos[0].ofertaFin='2099-01-01T00:00:00Z';
 c.productos[0].ofertaPrioritaria=true;
 const empresarial={...esquemaCatalogo.parse({...c,productos:[empresas[0]]}).productos[0],precioManual:30000,precioDescuento:22000,ofertaPrioritaria:true};
 c.productos.push(empresarial);
 const pagina=consultarCatalogo(publicarCatalogo(c),new URLSearchParams({orden:'recomendados'}));
 assert.equal(pagina.productos.length,2);assert.equal(new Set(pagina.productos.map(p=>p.id)).size,2);
 assert.ok(pagina.productos.every(p=>p.ofertaPrioritaria));
});
