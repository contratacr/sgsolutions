import {test,expect} from '@playwright/test';
import {prepararSesion,productosVinculados} from '../src/lib/intcomex/sesion';
import {prepararArchivo,prepararInventario} from '../src/lib/intcomex/archivo';
import {esquemaCatalogo,publicarCatalogo} from '../src/lib/catalogo-modelo';
import base from '../src/lib/catalogo-base.json';
import {capturarExportacion} from '../extensions/intcomex-edge/exportar';
const fecha='2026-09-24T12:00:00.000Z',cab=['Nombre','Marca','Precio','Disponibilidad','No. de Parte','SKU'];
const filas=[cab,['Equipo','Marca',100,10,'MPN','NUEVO-1']];
test('actualiza nuevos vinculados fuera de la selección sin cambiar contenido ni crear duplicados',()=>{
 const c=esquemaCatalogo.parse(base);c.productos=[{...c.productos[0],id:'nuevo',proveedor:undefined,codigoIntcomex:'NUEVO-1',codigoFabricante:'MPN-MANUAL',marca:'Marca',precioManual:123000,costoUsd:90,costoCrc:null}];
 expect(productosVinculados(c).map(p=>p.sku)).toEqual(['NUEVO-1']);
 const r=prepararSesion([{sku:'NUEVO-1',filas}],c,fecha);
 expect(r.catalogo.productos).toHaveLength(1);
 expect(r.catalogo.productos[0]).toMatchObject({id:'nuevo',nombre:c.productos[0].nombre,imagen:c.productos[0].imagen,precioManual:123000,proveedor:{sku:'NUEVO-1',stock:10,costo:100}});
 expect(r.cambios[0]).toMatchObject({precio:123000,manual:true,nuevo:false});
 expect(JSON.stringify(publicarCatalogo(r.catalogo))).not.toContain('codigoIntcomex');
});
test('rechaza exportaciones ajenas o duplicadas y conserva productos ausentes',()=>{
 const c=prepararArchivo(filas,esquemaCatalogo.parse({...base,productos:[]}),'USD','computo',fecha).catalogo;
 c.productos.push({...c.productos[0],id:'otro',proveedor:{...c.productos[0].proveedor!,sku:'OTRO'}});
 expect(()=>prepararSesion([{sku:'AJENO',filas}],c,fecha)).toThrow('duplicado');
 expect(()=>prepararSesion([{sku:'NUEVO-1',filas:[cab]}],c,fecha)).toThrow('sinCoincidencias');
 expect(()=>prepararSesion([{sku:'NUEVO-1',filas},{sku:'NUEVO-1',filas}],c,fecha)).toThrow('duplicado');
 const r=prepararSesion([{sku:'NUEVO-1',filas:[cab,['Equipo','Marca',110,'Más de 20','MPN','NUEVO-1']]}],c,fecha);
 expect(r.catalogo.productos[1]).toEqual(c.productos[1]);expect(r.cambios[0]).toMatchObject({stock:21,exacto:false,precio:75000});
});
test('excluye resultados parecidos sin sobrescribir el código solicitado',()=>{
 const c=prepararArchivo(filas,esquemaCatalogo.parse({...base,productos:[]}),'USD','computo',fecha).catalogo;
 c.productos.push({...c.productos[0],id:'reacondicionado',proveedor:{...c.productos[0].proveedor!,sku:'NUEVO-1-RC'}});
 const r=prepararSesion([{sku:'NUEVO-1',filas},{sku:'NUEVO-1-RC',filas}],c,fecha);
 expect(r.faltantes).toEqual(['NUEVO-1-RC']);expect(r.cambios).toHaveLength(1);
 expect(r.catalogo.productos[1]).toEqual(c.productos[1]);
 expect(()=>prepararSesion([{sku:'NUEVO-1',filas:[cab,filas[1],filas[1]]}],c,fecha)).toThrow('duplicado');
});
test('solo oculta ausentes tras una consulta válida y los vuelve a mostrar cuando reaparecen',()=>{
 const c=prepararArchivo(filas,esquemaCatalogo.parse({...base,productos:[]}),'USD','computo',fecha).catalogo;
 c.productos[0].publicado=true;
 c.productos.push({...c.productos[0],id:'otro',proveedor:{...c.productos[0].proveedor!,sku:'OTRO'}});
 const parcial=prepararSesion([{sku:'NUEVO-1',filas}],c,fecha,['NUEVO-1','OTRO']);
 expect(parcial.faltantes).toEqual(['OTRO']);
 expect(publicarCatalogo(parcial.catalogo).productos.map(p=>p.id)).toEqual([c.productos[0].id]);
 expect(parcial.catalogo.productos[1].publicado).toBe(true);
 const propio=structuredClone(parcial.catalogo);propio.productos[1].inventarioPropio=true;
 expect(publicarCatalogo(propio).productos).toHaveLength(2);
 const recuperado=prepararSesion([{sku:'OTRO',filas:[cab,['Equipo','Marca',100,10,'MPN','OTRO']]}],parcial.catalogo,fecha,['OTRO']);
 expect(publicarCatalogo(recuperado.catalogo).productos).toHaveLength(2);
 expect(c.productos[1].estadoIntcomex).toBeUndefined();
});
test('solo el Excel con precio y SKU exacto recupera un producto oculto',()=>{
 const c=prepararArchivo(filas,esquemaCatalogo.parse({...base,productos:[]}),'USD','computo',fecha).catalogo;
 c.productos[0].publicado=true;c.productos[0].estadoIntcomex={estado:'noEncontrado',fecha};
 expect(publicarCatalogo(c).productos).toHaveLength(0);
 const inventario=prepararInventario([cab,['Equipo','Marca',100,4,'MPN','NUEVO-1']],c,fecha).catalogo;
 expect(publicarCatalogo(inventario).productos).toHaveLength(0);
 const completo=prepararArchivo(filas,inventario,'USD','computo',fecha).catalogo;
 expect(publicarCatalogo(completo).productos).toHaveLength(1);
 expect(completo.productos[0].estadoIntcomex?.estado).toBe('encontrado');
});
test('adaptador captura el archivo exportado, restaura el navegador',async({page})=>{
 await page.goto('/');
 await page.setContent('<h1>NUEVO-1</h1><button title="Exportar Excel">Exportar</button>');
 await page.evaluate(()=>{document.querySelector('button')!.onclick=()=>{URL.createObjectURL(new Blob([new Uint8Array([80,75,3,4])]));};});
 const r=await page.evaluate('('+capturarExportacion.toString()+')('+JSON.stringify('NUEVO-1')+',null)') as {base64:string};
 expect(r.base64).toBe('UEsDBA==');await expect(page.locator('aside')).toHaveCount(0);
 await page.setContent('<h1>NUEVO-1</h1><h4>No encontramos resultados para tu búsqueda.</h4>');
 expect(await page.evaluate('('+capturarExportacion.toString()+')("NUEVO-1",null)')).toEqual({error:'noEncontrado'});
});
test('la extensión evita la descarga del Excel que ya capturó',async({page})=>{
 await page.goto('/');
 await page.setContent('<h1>NUEVO-1</h1><button title="Exportar Excel">Exportar</button>');
 await page.evaluate(()=>{document.querySelector('button')!.onclick=()=>{
  const enlace=document.createElement('a');enlace.href=URL.createObjectURL(new Blob([new Uint8Array([80,75,3,4])]));enlace.download='products.xlsx';
  enlace.addEventListener('click',e=>{document.body.dataset.descargaEvitada=String(e.defaultPrevented);});enlace.click();
 };});
 const r=await page.evaluate('('+capturarExportacion.toString()+')("NUEVO-1",null)') as {base64:string};
 expect(r.base64).toBe('UEsDBA==');
 expect(await page.locator('body').getAttribute('data-descarga-evitada')).toBeNull();
});

import {readFile,writeFile} from 'node:fs/promises';
import {createHash,randomBytes} from 'node:crypto';
for(const idioma of ['es','en'])test(`puente y confirmación local ${idioma}`,async({page,context},info)=>{
 test.skip(process.env.SG_TEST_ALTAS!=='1','Requiere servidor aislado local');
 const rutas=['.privado/admin-local/cuenta.json','.privado/admin-local/catalogo.json'];const originales=await Promise.all(rutas.map(p=>readFile(p,'utf8')));
 const cuenta=JSON.parse(originales[0]),token=randomBytes(32).toString('hex');cuenta.sesiones.push({hash:createHash('sha256').update(token).digest('hex'),vence:Date.now()+120000});
 const c=prepararArchivo([cab,['Equipo QA','QA',90,1,'QA-IMPORT','QA-IMPORT']],esquemaCatalogo.parse({...base,productos:[]}),'USD','computo',fecha).catalogo;c.productos[0].publicado=true;
 await writeFile(rutas[0],JSON.stringify(cuenta));await writeFile(rutas[1],JSON.stringify({contenido:c,revision:800}));
 await context.addCookies([{name:'sg-admin-local',value:token,domain:'127.0.0.1',path:'/'},{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 try{
  const archivo=(await readFile('tests/fixtures/intcomex-qa.xlsx')).toString('base64');
  await page.addInitScript(archivo=>{window.addEventListener('message',e=>{if(e.data?.canal==='sg-intcomex-solicitud')window.postMessage({canal:'sg-intcomex-respuesta',id:e.data.id,resultado:e.data.tipo==='estado'?{version:'0.1.0'}:{base64:archivo}},location.origin);});},archivo);
  await page.goto('/panel/catalogo/sincronizar');
  await expect(page.getByRole('button',{name:idioma==='es'?'Consultar todos los vinculados':'Look up all linked products'})).toBeDisabled();
  await page.getByRole('checkbox').check();await page.getByRole('button',{name:idioma==='es'?'Probar con 3 productos':'Test with 3 products'}).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  expect(JSON.parse(await readFile(rutas[1],'utf8')).revision).toBe(800);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:`/tmp/intcomex-puente-${idioma}-${info.project.name}.png`,fullPage:true});
  await page.getByRole('button',{name:idioma==='es'?'Confirmar y actualizar la tienda':'Confirm and update store'}).click();
  await expect(page.locator('.admin-sincronizacion > [role=status]')).toContainText(idioma==='es'?'Actualización guardada':'Update saved');
  const guardado=JSON.parse(await readFile(rutas[1],'utf8'));expect(guardado.revision).toBe(801);expect(guardado.contenido.productos).toHaveLength(1);expect(guardado.contenido.productos[0].proveedor.costo).toBe(100);
  await page.reload();await expect(page.locator('html')).toHaveAttribute('lang',idioma);
 }finally{await Promise.all(rutas.map((p,i)=>writeFile(p,originales[i])));}
});

test('exportaciones reales: 100 códigos conservan contenido, fotos y precios manuales',async()=>{
 test.skip(process.env.SG_TEST_REAL_EXPORTS!=='1','Datos privados locales, nunca versionados');
 const catalogo=esquemaCatalogo.parse(JSON.parse(await readFile('.privado/admin-local/catalogo.json','utf8')).contenido);
 const filas=JSON.parse(await readFile('.privado/intcomex/seleccion-2026-09-24/seleccion-verificada.json','utf8')) as Record<string,unknown>[];
 const archivos=filas.map(f=>({sku:String(f.SKU),filas:[cab,cab.map(k=>f[k])]}));
 const r=prepararSesion(archivos,catalogo,fecha);
 expect(r.cambios).toHaveLength(100);expect(r.catalogo.productos).toHaveLength(catalogo.productos.length);
 for(const p of r.catalogo.productos){const previo=catalogo.productos.find(x=>x.id===p.id)!;for(const k of ['nombre','descripcion','imagen','imagenes','especificaciones','categoria','precioManual','publicado','codigoFabricante'] as const)expect(p[k]).toEqual(previo[k]);}
});

test('lote descargado en Edge conserva campos manuales y calcula precios con IVA y utilidad',async()=>{
 test.skip(process.env.SG_TEST_REAL_EXPORTS!=='1','Exportaciones privadas de la prueba real');
 const c=esquemaCatalogo.parse(JSON.parse(await readFile('.privado/admin-local/catalogo.json','utf8')).contenido);
 const exports=JSON.parse(await readFile('.privado/intcomex/seleccion-2026-09-24/exportaciones-prueba.json','utf8')) as {skus:string[];rows:unknown[][]}[];
 const archivos=productosVinculados(c).flatMap(p=>{const e=exports.findLast(e=>e.skus.includes(p.sku));return e?[{sku:p.sku,filas:e.rows}]:[];});
 const r=prepararSesion(archivos,c,fecha);expect(r.cambios.length).toBeGreaterThanOrEqual(200);
 for(const p of r.catalogo.productos){const previo=c.productos.find(x=>x.id===p.id)!;for(const k of ['nombre','descripcion','imagen','imagenes','especificaciones','categoria','precioManual','publicado','codigoFabricante'] as const)expect(p[k]).toEqual(previo[k]);}
 for(const cambio of r.cambios){if(!cambio.manual&&!cambio.revision&&cambio.precio!==null){const p=r.catalogo.productos.find(p=>p.proveedor?.sku===cambio.sku)!;expect(cambio.precio).toBe(Math.ceil(p.proveedor!.costo*500*1.13*1.20/1000)*1000);}}
});

for(const idioma of ['es','en'])test(`tienda refleja guardado real de Intcomex ${idioma}`,async({page,context})=>{
 test.skip(process.env.SG_TEST_REAL_EXPORTS!=='1','Catálogo local tras sincronización real');
 const {colones,traducir}=await import('../src/lib/catalogo-modelo');
 const c=esquemaCatalogo.parse(JSON.parse(await readFile('.privado/admin-local/catalogo.json','utf8')).contenido);
 const publico=publicarCatalogo(c);
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 for(const sku of ['NT083LEN02','MT027LEN13','ES600UBQ40']){
  const interno=c.productos.find(p=>p.proveedor?.sku===sku)!;const p=publico.productos.find(p=>p.id===interno.id)!;
  await page.goto('/tienda/'+p.id);await expect(page.locator('h1')).toHaveText(traducir(p.nombre,idioma));
  await expect(page.locator('.ficha-precio')).toContainText(colones(p.precio!));
  await expect(page.locator('html')).toHaveAttribute('lang',idioma);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
});

for(const idioma of ['es','en'])test(`productos sin coincidencia quedan en revisión ${idioma}`,async({page,context},info)=>{
 test.skip(process.env.SG_TEST_REAL_EXPORTS!=='1','Catálogo privado local tras consulta completa');
 const rutaCuenta='.privado/admin-local/cuenta.json';const original=await readFile(rutaCuenta,'utf8');
 const cuenta=JSON.parse(original),token=randomBytes(32).toString('hex');cuenta.sesiones.push({hash:createHash('sha256').update(token).digest('hex'),vence:Date.now()+120000});
 await writeFile(rutaCuenta,JSON.stringify(cuenta));
 await context.addCookies([{name:'sg-admin-local',value:token,domain:'127.0.0.1',path:'/'},{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 try{
  const c=esquemaCatalogo.parse(JSON.parse(await readFile('.privado/admin-local/catalogo.json','utf8')).contenido);
  const ausentes=c.productos.filter(p=>p.estadoIntcomex?.estado==='noEncontrado'&&!p.inventarioPropio);
  expect(ausentes).toHaveLength(25);
  const res=await page.request.get('/api/catalogo');expect(res.ok()).toBe(true);
  const publico=await res.json();expect(JSON.stringify(publico)).not.toContain(ausentes[0].id);
  await page.goto('/panel/catalogo');
  await page.getByRole('button',{name:idioma==='es'?'Requieren revisión':'Needs review',exact:true}).click();
  await expect(page.getByRole('heading',{name:new RegExp(idioma==='es'?'Requieren revisión':'Needs review')})).toContainText('25');
  await expect(page.locator('.admin-revision-lista li')).toHaveCount(25);
  await page.screenshot({path:`/tmp/intcomex-revision-${idioma}-${info.project.name}.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }finally{await writeFile(rutaCuenta,original);}
});
