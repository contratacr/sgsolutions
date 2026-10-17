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
for(const idioma of ['es','en'])test(`una tienda con categoría empresarial, subcategorías y marcas ${idioma}`,async({page,context,baseURL,isMobile})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.goto('/tienda');
 await expect(page.locator('.shop-empresa-acceso,.empresa-soluciones,.empresa-marcas')).toHaveCount(0);
 const movil=isMobile;
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


test('equipos empresariales aparecen en categorías generales sin duplicarse ni cambiar su venta asistida',async()=>{
 const {incorporarEmpresariales}=await import('../src/lib/incorporar-empresariales');
 const {clasificacionesDeProducto,catalogoTienda}=await import('../src/lib/soluciones-empresariales');
 const {resumenCatalogo}=await import('../src/lib/catalogo-consulta');
 const {publicarCatalogo,esquemaCatalogo}=await import('../src/lib/catalogo-modelo');
 const inicial=JSON.parse(await readFile('src/lib/catalogo-inicial.json','utf8'));
 const c=publicarCatalogo(incorporarEmpresariales(esquemaCatalogo.parse(inicial)));
 const esperado=c.productos.filter(p=>p.coleccion==='empresas'&&/^Computadora/.test(p.nombre.es));
 expect(esperado.length).toBeGreaterThan(5);
 const consultar=(params:Record<string,string>)=>consultarCatalogo(c,new URLSearchParams(params));
 const computadoras=consultar({categoria:'computadoras',marca:'Dell'});
 for(const p of esperado)expect(consultar({categoria:'computadoras',q:p.codigoFabricante}).productos.map(p=>p.id)).toContain(p.id);
 expect(computadoras.productos.some(p=>p.coleccion==='empresas')).toBe(true);
 for(const q of ['computadoras','computers']){const r=consultar({q});expect(r.productos.some(p=>p.coleccion==='empresas')).toBe(true);expect(r.productos.some(p=>/^Kit |^Mouse |acoplamiento/.test(p.nombre.es))).toBe(false);}
 expect(computadoras.productos.some(p=>/^Kit |^Mouse |acoplamiento/.test(p.nombre.es))).toBe(false);
 const categorias=catalogoTienda(c),resumen=resumenCatalogo(c);
 expect(catalogoTienda(categorias)).toEqual(categorias);
 expect(new Set(categorias.productos.map(p=>p.id)).size).toBe(c.productos.length);
 for(const categoria of ['computadoras','redes','seguridad','almacenamiento','energia']){
  const todos=categorias.productos.filter(p=>clasificacionesDeProducto(p).some(x=>x.categoria===categoria));
  const r=consultar({categoria});expect(r.total).toBe(todos.length);expect(resumen.conteos[categoria]).toBe(todos.length);
  expect(resumen.conteosMarcas.Dell?.categorias[categoria]??0).toBe(todos.filter(p=>p.marca==='Dell').length);
  const precios=todos.flatMap(p=>p.precio===null?[]:[p.precio]);expect(r.rangoPrecios).toEqual({minimo:Math.min(...precios),maximo:Math.max(...precios)});
 }
 const portatiles=consultar({categoria:'computadoras',subcategoria:'Portátiles'});
 expect(portatiles.total).toBeGreaterThan(0);expect(portatiles.productos.every(p=>p.coleccion==='empresas'&&/portátil/.test(p.nombre.es))).toBe(true);
 for(const p of esperado.slice(0,3))expect(consultar({categoria:'soluciones-empresariales',q:p.codigoFabricante}).productos.map(p=>p.id)).toContain(p.id);
});

for(const idioma of ['es','en'])test(`Computadoras incluye equipos empresariales y mantiene consultar existencia ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);await page.goto('/tienda');
 const movil=(page.viewportSize()?.width??1440)<=850;
 if(movil)await page.locator('.shop-abrir-filtros').click();
 const panel=page.locator(movil?'.shop-panel-filtros':'.shop-sidebar');
 await panel.getByRole('button',{name:idioma==='es'?'Computadoras':'Computers',exact:true}).click();
 if(movil)await panel.locator('.shop-panel-filtros-acciones>.boton').first().click();
 await page.locator('#buscar-equipo').fill('PC14250_U7ARL321TBWPS_3WX');
 const producto=page.locator('.shop-producto').filter({hasText:'PC14250_U7ARL321TBWPS_3WX'});
 await expect(producto).toHaveCount(1);await expect(producto.locator('a.producto-agregar')).toContainText(idioma==='es'?'Consultar existencia':'Check stock');
 await expect(producto.locator('button.producto-agregar')).toHaveCount(0);
 await expect(page.locator('html')).toHaveAttribute('lang',idioma);
});

test('fichas empresariales verificadas conservan identidad, precios e imágenes al importar',async()=>{
 const {completarFichaEmpresarial}=await import('../src/lib/fichas-empresariales.ts');
 const {esquemaCatalogo}=await import('../src/lib/catalogo-modelo');
 const base=JSON.parse(await readFile('src/lib/catalogo-base.json','utf8'));
 const productos=esquemaCatalogo.parse({...base,productos:JSON.parse(await readFile('src/lib/catalogo-empresarial.json','utf8'))}).productos;
 expect(productos).toHaveLength(211);
 expect(new Set(productos.map(p=>p.codigoIntcomex)).size).toBe(productos.length);
 for(const producto of productos){
  expect(producto.especificaciones.length,producto.codigoIntcomex).toBeGreaterThan(1);
  expect(producto.descripcion.es).not.toContain('Le ayudamos a confirmar disponibilidad');
  expect(producto.nombre.es).not.toMatch(/ · \d+$/);
  const minimo={...producto,nombre:{es:'Genérico',en:'Generic'},descripcion:{es:'Genérica',en:'Generic'},especificaciones:[]};
  const completo=completarFichaEmpresarial(minimo);
  expect(completo.especificaciones).toEqual(producto.especificaciones);
  expect({...completo,nombre:minimo.nombre,descripcion:minimo.descripcion,especificaciones:[]}).toEqual(minimo);
  const ajeno={...minimo,codigoFabricante:'OTRO-MODELO'};
  expect(completarFichaEmpresarial(ajeno)).toBe(ajeno);
  const otraMarca={...minimo,marca:'Otra marca'};
  expect(completarFichaEmpresarial(otraMarca)).toBe(otraMarca);
 }
 const laptop=productos.find(p=>p.codigoIntcomex==='NT086DEL26')!;
 expect(laptop.nombre.es).toContain('32 GB');expect(laptop.nombre.en).toContain('1 TB');
 const {incorporarEmpresariales}=await import('../src/lib/incorporar-empresariales');
 const persistido={...laptop,nombre:{es:'Ficha antigua',en:'Old profile'},descripcion:{es:'Antigua',en:'Old'},especificaciones:[],precioManual:123000};
 const actualizado=incorporarEmpresariales({...base,productos:[persistido]}).productos;
 expect(actualizado.filter(p=>p.id===laptop.id)).toHaveLength(1);
 expect(actualizado.find(p=>p.id===laptop.id)).toMatchObject({nombre:laptop.nombre,especificaciones:laptop.especificaciones,precioManual:123000});
 expect(laptop.especificaciones.some(x=>x.valor.en==='255U')).toBe(true);
 const gateway=productos.find(p=>p.codigoIntcomex==='NW608UBQ18')!;
 expect(gateway.nombre.es).not.toContain(' · 3');
});

for(const idioma of ['es','en'])test(`ficha empresarial completa muestra características reales sin desbordarse ${idioma}`,async({page,request,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 const respuesta=await(await request.get('/api/catalogo?q=PC14250_U7ARL321TBWPS_3WX')).json();
 const producto=respuesta.productos.find((p:{id:string})=>p.id==='empresa-intcomex-nt086del26');
 expect(producto).toBeTruthy();
 await page.goto(`/tienda/${producto.slug}`);
 await expect(page.locator('h1')).toContainText('32 GB');
 await expect(page.locator('body')).toContainText('255U');
 await expect(page.locator('body')).toContainText('1 TB');
 await expect(page.getByRole('link',{name:idioma==='es'?/Consultar existencia/:/Check stock/}).first()).toBeVisible();
 await expect(page.locator('html')).toHaveAttribute('lang',idioma);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.reload();await expect(page.locator('html')).toHaveAttribute('lang',idioma);
});
