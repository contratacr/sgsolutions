import {readFile} from 'node:fs/promises';
import {test,expect} from '@playwright/test';
import {catalogoEmpresarial,solucionDeProducto} from '../src/lib/soluciones-empresariales';
import {consultarCatalogo} from '../src/lib/catalogo-consulta';
import type {CatalogoPublico} from '../src/lib/catalogo-modelo';

test('selección empresarial conserva catálogo y clasifica equipos, no marcas completas',async({request})=>{
 const {productos}=await(await request.get('/api/catalogo')).json();
 const base=productos[0];
 const casos=[['Dell','MOCHILA DELL ECOLOOP','accesorios',null],['Dell','LAPTOP DELL WINDOWS HOME','computadoras',null],['Dell','MONITOR DELL PRO P27','monitores','infraestructura'],['Provision-ISR','CAMARA IP 4MP','seguridad','seguridad'],['Ubiquiti','UNIFI PROTECT NVR','redes','seguridad'],['Ruijie','SWITCH POE','redes','redes'],['Nexxt','SMART PLUG','accesorios',null],['Nexxt','ROUTER WIFI','redes','redes'],['QNAP','NAS 4 BAHIAS','almacenamiento','respaldo'],['APC','UPS 900VA','energia','energia'],['Forza','REGULADOR DE VOLTAJE','energia','energia']];
 const fixtures=casos.map(([marca,nombre,categoria],i)=>({...base,coleccion:undefined,solucionEmpresarial:undefined,id:`empresa-${i}`,marca,categoria,nombre:{es:nombre,en:nombre},subcategoria:undefined,codigoFabricante:''}));
 fixtures.forEach((p,i)=>expect(solucionDeProducto(p)).toBe(casos[i][3]));
 const c={productos:fixtures,categorias:[],textos:{}} as unknown as CatalogoPublico;
 const antes=JSON.stringify(c);const seleccion=catalogoEmpresarial(c);
 expect(seleccion.productos).toHaveLength(8);expect(JSON.stringify(c)).toBe(antes);
 const filtrado=consultarCatalogo(c,new URLSearchParams({categoria:'soluciones-empresariales',subcategoria:'Videovigilancia y seguridad',marca:'Ubiquiti'}));
 expect(filtrado.total).toBe(1);expect(filtrado.productos[0].categoria).toBe('soluciones-empresariales');expect(filtrado.productos[0].nombre.es).toContain('NVR');
 expect(consultarCatalogo(c,new URLSearchParams()).total).toBe(11);
});
for(const idioma of ['es','en'])test(`una tienda con categoría empresarial, subcategorías y marcas ${idioma}`,async({page,context,baseURL},info)=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.goto('/tienda');
 await expect(page.locator('.shop-empresa-acceso,.empresa-soluciones,.empresa-marcas')).toHaveCount(0);
 const movil=info.project.name==='safari-mobile';
 if(movil)await page.locator('.shop-abrir-filtros').click();
 const panel=page.locator(movil?'.shop-panel-filtros':'.shop-sidebar');
 const categoria=panel.getByRole('button',{name:idioma==='es'?'Soluciones Empresariales':'Business Solutions',exact:true});
 await categoria.click();
 await expect(categoria).toHaveAttribute('aria-pressed','true');
 await expect(panel.locator('.shop-subcategorias button')).toHaveCount(5);
 await panel.locator('.shop-subcategorias button').filter({hasText:idioma==='es'?'Videovigilancia y seguridad':'Video surveillance and security'}).click();
 await expect(panel.locator('.shop-marcas-opciones')).toContainText('Hikvision');
 await expect(panel.locator('.shop-marcas-opciones')).not.toContainText('QNAP');
 await panel.locator('.shop-marcas-opciones label').filter({hasText:'Hikvision'}).locator('input').check();
 if(movil)await panel.getByRole('button',{name:idioma==='es'?'Ver resultados':'View results',exact:true}).click();
 await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','false');
 await expect(page.locator('.shop-producto')).toHaveCount(24);
 await expect(page.locator('.shop-producto').first()).toContainText('Hikvision');
 await page.locator('.shop-paginacion button').last().click();
 await expect(page.locator('.shop-resultados')).toHaveAttribute('aria-busy','false');
 await expect(page.locator('.shop-paginacion')).toContainText(idioma==='es'?'Página 2':'Page 2');
 await page.reload();
 await expect(page.locator('.shop-filtros-activos')).toContainText('Hikvision');
 await expect(page.locator('html')).toHaveAttribute('lang',idioma);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.goto('/tienda/soluciones-empresariales');
 await expect(page).toHaveURL(/\/tienda\?categoria=soluciones-empresariales$/);
 await expect(page.locator('.shop-filtros-activos')).toContainText(idioma==='es'?'Soluciones Empresariales':'Business Solutions');
});

test('selección cerrada, precio habitual y separación del catálogo empresarial',async()=>{
 const {esquemaCatalogo,publicarCatalogo,calcularPrecio}=await import('../src/lib/catalogo-modelo');
 const {migrarCatalogoManual}=await import('../src/lib/catalogo-manual');
 const {recomendaciones}=await import('../src/lib/recomendaciones');
 const base=JSON.parse(await readFile('src/lib/catalogo-base.json','utf8'));
 const muestra={...base.productos[0],id:'empresa-intcomex-es000ubq07',slug:undefined,codigoEurocomp:undefined,eurocomp:undefined,codigoIntcomex:'ES000UBQ07',coleccion:'empresas',solucionEmpresarial:'redes',categoria:'redes',nombre:{es:'Equipo empresarial QA',en:'QA business equipment'},costoUsd:100,costoCrc:null,precioManual:null,precioReferencia:null,revisionPrecio:false,publicado:true,disponibilidadReferencia:'consultar'};
 const catalogo=esquemaCatalogo.parse({...base,productos:[...base.productos,muestra]});
 const {reconciliarEurocomp}=await import('../src/lib/eurocomp-catalogo');
 const sincronizado=reconciliarEurocomp(catalogo,{fecha:new Date().toISOString(),bodega:1,articulos:[]});
 expect(sincronizado.productos.find(p=>p.id===muestra.id)).toMatchObject({codigoIntcomex:'ES000UBQ07',coleccion:'empresas',costoUsd:100});
 const publico=publicarCatalogo(migrarCatalogoManual(catalogo));
 const producto=publico.productos.find(p=>p.id===muestra.id)!;
 expect(producto.precio).toBe(calcularPrecio(100,catalogo.ajustes));expect(producto.precio).toBe(68000);
 expect(producto.disponibilidad).toBe('consultar');expect(producto).not.toHaveProperty('costoUsd');expect(producto).not.toHaveProperty('proveedor');
 expect(consultarCatalogo(publico,new URLSearchParams({q:'Equipo empresarial QA'})).total).toBe(1);
 expect(consultarCatalogo(publico,new URLSearchParams({coleccion:'empresas',q:'Equipo empresarial QA'})).productos.map(p=>p.id)).toContain(muestra.id);
 expect(recomendaciones(publico.productos,[muestra.id]).recientes.map(p=>p.id)).toContain(muestra.id);
 expect(esquemaCatalogo.safeParse({...base,productos:[{...muestra,codigoIntcomex:'AJENO',id:'empresa-intcomex-ajeno'}]}).success).toBe(false);
});
for(const idioma of ['es','en'])test(`equipo empresarial solicita existencia y no admite carrito ${idioma}`,async({page,request,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 const base=(await(await request.get('/api/catalogo')).json()).productos[0];
 const producto={...base,id:'empresa-intcomex-es000ubq07',slug:'equipo-empresarial-qa',coleccion:'empresas',solucionEmpresarial:'redes',codigoEurocomp:undefined,categoria:'redes',nombre:{es:'Equipo empresarial QA',en:'QA business equipment'},disponibilidad:'consultar'};
 await page.route('**/api/catalogo?*',r=>r.fulfill({json:{productos:[producto],total:1,pagina:1,paginas:1}}));
 await page.goto('/tienda/soluciones-empresariales');await page.locator('#buscar-equipo').fill('QA');
 const tarjeta=page.locator('.shop-producto').filter({hasText:idioma==='es'?'Equipo empresarial QA':'QA business equipment'});
 await expect(tarjeta).toBeVisible();await tarjeta.hover();
 const consulta=tarjeta.getByRole('link',{name:idioma==='es'?/Consultar existencia/:/Check stock/});
 await expect(consulta).toHaveAttribute('target','_blank');await expect(consulta).toHaveAttribute('rel','noopener noreferrer');
 expect(decodeURIComponent(await consulta.getAttribute('href')??'')).toContain('QA');
 await expect(tarjeta.locator('button.producto-agregar')).toHaveCount(0);
 await tarjeta.locator('.producto-accion').last().click();await expect(page.locator('.producto-preview').getByRole('link',{name:idioma==='es'?/Consultar existencia/:/Check stock/})).toBeVisible();
 await page.evaluate(()=>{localStorage.setItem('sg-carrito-v1',JSON.stringify([{id:'empresa-intcomex-es000ubq07',cantidad:1}]));window.dispatchEvent(new Event('sg-app-resume'));});
 await expect(page.locator('.carrito-cantidad')).toHaveCount(0);
 const compra=await request.post('/api/compra/verificar',{headers:{Origin:baseURL!},data:{idioma,articulos:[{id:producto.id,precio:producto.precio,cantidad:1}]}});expect(compra.status()).toBe(409);
});

for(const idioma of ['es','en'])test(`importación real: ficha, precio y aislamiento ${idioma}`,async({request,page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 const id='empresa-intcomex-es000ubq07';
 const general=await(await request.get('/api/catalogo?q=POE-24-24W-G')).json();
 expect(general.productos.some((p:{id:string})=>p.id===id)).toBe(true);
 const empresas=await(await request.get('/api/catalogo?coleccion=empresas&q=POE-24-24W-G')).json();
 const producto=empresas.productos.find((p:{id:string})=>p.id===id);
 expect(producto).toMatchObject({precio:5000,disponibilidad:'consultar',coleccion:'empresas'});
 expect(producto).not.toHaveProperty('costoUsd');expect(producto).not.toHaveProperty('codigoIntcomex');
 await page.goto(`/tienda/${producto.slug}`);
 await expect(page.locator('h1')).toContainText('POE-24-24W-G');
 await expect(page.getByRole('link',{name:idioma==='es'?/Consultar existencia/:/Check stock/}).first()).toBeVisible();
 await expect(page.locator('.ficha-compra button.boton')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const fotos=page.locator('main img').first();await expect(fotos).toBeVisible();
 expect(await fotos.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
});
test('selección importada completa salvo referencias no encontradas',async()=>{
 const productos=JSON.parse(await readFile('src/lib/catalogo-empresarial.json','utf8'));
 const seleccion=JSON.parse(await readFile('src/lib/seleccion-empresarial.json','utf8'));
 expect(productos).toHaveLength(211);expect(new Set(productos.map((p:{id:string})=>p.id)).size).toBe(211);
 expect(Object.keys(seleccion).filter(sku=>!productos.some((p:{codigoIntcomex:string})=>p.codigoIntcomex===sku))).toEqual(['ES601UBQ08','ES214HIK81']);
 for(const p of productos){expect(p.coleccion).toBe('empresas');expect(p.precioReferencia).toBeGreaterThan(0);expect(p.costoUsd).toBeNull();expect(p.disponibilidadReferencia).toBe('consultar');}
});

test('administrador puede preparar un enlace con un equipo empresarial',async({page,context,baseURL})=>{
 const {randomBytes,createHash}=await import('node:crypto');
 const {writeFile}=await import('node:fs/promises');
 const cuentaPath='.privado/admin-local/cuenta.json',pedidosPath='.privado/admin-local/asesorias.json';
 const original=await readFile(cuentaPath,'utf8');
 const anteriores=await readFile(pedidosPath,'utf8').catch(()=>null);
 const cuenta=JSON.parse(original),token=randomBytes(32).toString('hex');
 cuenta.sesiones.push({hash:createHash('sha256').update(token).digest('hex'),vence:Date.now()+120000});
 try{
  await writeFile(cuentaPath,JSON.stringify(cuenta));
  await context.addCookies([{name:'sg-admin-local',value:token,url:baseURL!}]);
  await page.goto('/panel/pedidos');
  await page.getByRole('button',{name:'Crear pedido',exact:true}).click();
  const nueva=page.locator('.panel-nueva-asesoria:visible');
  await nueva.locator('input[type=search]').fill('POE-24-24W-G');
  await nueva.locator('.asesoria-busqueda-resultados button').filter({hasText:'POE-24-24W-G'}).first().click();
  await nueva.locator('[name=confirmado]').check();
  await nueva.getByRole('button',{name:/Generar enlace de compra|Generate checkout link/}).click();
  await page.waitForURL(u=>u.searchParams.get('resultado')==='enlace_generado');
  const registros=JSON.parse(await readFile(pedidosPath,'utf8'));
  const pedido=registros.find((p:{id:string})=>p.id===new URL(page.url()).searchParams.get('asesoria'));
  expect(pedido.articulos[0].producto.id).toBe('empresa-intcomex-es000ubq07');
  expect(pedido.articulos[0].producto.precio).toBe(5000);
  const enlace=await page.locator(`[id="enlace-${pedido.id}"] textarea`).inputValue();
  await context.clearCookies();
  await page.goto(new URL(enlace).pathname);
  await expect(page.locator('main form')).toBeVisible();
  await expect(page.locator('main')).toContainText('POE-24-24W-G');
 }finally{
  await writeFile(cuentaPath,original);
  if(anteriores!==null)await writeFile(pedidosPath,anteriores);
  else{const {unlink}=await import('node:fs/promises');await unlink(pedidosPath).catch(()=>{});}
 }
});

test('un modelo empresarial no se filtra por un SKU de otro proveedor',async({request})=>{
 const general=await(await request.get('/api/catalogo?q=BVX900L-LM')).json();
 expect(general.productos).toHaveLength(1);expect(general.productos[0].id).toBe('empresa-intcomex-ui715apc94');
 const empresas=await(await request.get('/api/catalogo?coleccion=empresas&q=BVX900L-LM')).json();
 expect(empresas.productos).toHaveLength(1);
 expect(empresas.productos[0].id).toBe('empresa-intcomex-ui715apc94');
});

for(const idioma of ['es','en'])test(`confirmar existencia comparte presentación del carrito ${idioma}`,async({page,context,request,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 const base=(await(await request.get('/api/catalogo')).json()).productos[0];
 const productos=[{...base,id:'empresa-intcomex-es000ubq07',coleccion:'empresas',nombre:{es:'Equipo QA empresa',en:'QA business equipment'}},{...base,id:'eurocomp-qa',coleccion:undefined,nombre:{es:'Equipo QA tienda',en:'QA store equipment'}}];
 await page.route('**/api/catalogo?*',r=>r.fulfill({json:{productos,total:2,pagina:1,paginas:1}}));
 await page.goto('/tienda');await page.locator('#buscar-equipo').fill('QA');
 await expect(page.locator('.shop-producto')).toHaveCount(2);
 const enlaces=page.locator('.shop-producto a.producto-agregar'),carrito=page.locator('.shop-producto button.producto-agregar');
 await expect(enlaces).toHaveCount(1);await expect(carrito).toHaveCount(1);
 await enlaces.locator('..').hover();
 const estilos=await page.locator('.shop-producto .producto-agregar').evaluateAll(elementos=>elementos.map(e=>{const c=getComputedStyle(e),r=e.getBoundingClientRect();return {height:r.height,width:r.width,padding:c.padding,font:c.fontSize,gap:c.gap,position:c.position,textDecoration:c.textDecorationLine,bottom:c.bottom};}));
 expect(estilos[0]).toEqual(estilos[1]);expect(estilos[0].height).toBeLessThanOrEqual(48);
 await expect(enlaces).toHaveAttribute('target','_blank');await expect(enlaces).toHaveAttribute('rel','noopener noreferrer');
});
