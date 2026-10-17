import {test,expect} from '@playwright/test';
import {pedidosPropuesta,vistaPedidoPropuesta} from '../src/lib/pedidos-propuesta';
const activos=pedidosPropuesta.filter(p=>!p.archivado);
import es from '../messages/es.json';
import en from '../messages/en.json';
for(const idioma of ['es','en'] as const)test(`Propuesta de pedidos: filtros y etapas ${idioma}`,async({page,context,baseURL})=>{
 const t=(idioma==='es'?es:en).PropuestaPedidos;
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.goto('/vista-previa/pedidos');
 await expect(page.locator('.propuesta-escenarios')).toHaveCount(0);
 await page.getByRole('button',{name:t.ordenFecha,exact:true}).click();await page.locator('[data-valor=recientes]').click();
 await page.locator('[data-pedido=SG-1042] summary').first().click();
 await expect(page.locator('[data-pedido=SG-1042] .propuesta-detalle')).toContainText(t.fondosEjemplo);
 await expect(page.locator('.propuesta-pedido')).toHaveCount(Math.min(20,activos.filter(p=>vistaPedidoPropuesta(p.estado)==='por_atender').length));
 await expect(page.locator('.propuesta-vistas button')).toHaveCount(4);
 for(const metodo of ['sinpe','transferencia','tarjeta'] as const){
  await page.getByRole('button',{name:t.formaPago,exact:true}).click();await page.locator(`[data-valor=${metodo}]`).click();
  for(const entrega of ['retiro','envio','express'] as const){
   await page.getByRole('button',{name:t.entrega,exact:true}).click();await page.locator(`[data-valor=${entrega}]`).click();
   await expect(page.locator('.propuesta-pedido')).toHaveCount(activos.filter(p=>p.metodo===metodo&&p.entrega===entrega&&vistaPedidoPropuesta(p.estado)==='por_atender').length);
   for(const row of await page.locator('.propuesta-pedido').all()){
    await expect(row.locator('.propuesta-pago')).toContainText(t[`metodo_${metodo}`]);
    await expect(row.locator('.propuesta-entrega')).toContainText(t[`entrega_${entrega}`]);
   }
  }
 }
 await page.getByRole('button',{name:t.limpiar,exact:true}).click();
 await page.getByRole('searchbox',{name:t.buscar,exact:true}).fill('Maria');
 await expect(page.locator('.propuesta-pedido')).toHaveCount(1);
 const maria=page.locator('[data-pedido=SG-1048]');await maria.locator('summary').first().click();
 await maria.getByRole('button',{name:t.verificarPago,exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText(t.verificarBanco);
 await page.getByRole('button',{name:t.confirmarPago,exact:true}).click();
 await expect(maria.locator('.propuesta-estado').first()).toHaveText(t.pago_confirmado);
 await maria.getByRole('button',{name:t.preparar,exact:true}).click();
 await page.locator('.propuesta-vistas button').filter({hasText:t.preparacion}).click();
 await maria.locator('summary').first().click();
 await expect(maria.locator('.propuesta-entrega')).toContainText(t.estado_preparando);
 await maria.getByRole('button',{name:t.listoRetiro,exact:true}).click();
 await expect(maria.locator('.propuesta-entrega')).toContainText(t.estado_listo_retiro);
 await maria.getByRole('button',{name:t.confirmarEntrega,exact:true}).click();
 await page.locator('.propuesta-vistas button').filter({hasText:t.finalizados}).click();
 await expect(maria.locator('.propuesta-entrega')).toContainText(t.estado_entregado);
 await page.getByRole('button',{name:t.limpiar,exact:true}).click();
 await page.locator('.propuesta-vistas button').filter({hasText:t.finalizados}).click();
 await expect(page.locator('.propuesta-pedido')).toHaveCount(Math.min(20,activos.filter(p=>vistaPedidoPropuesta(p.estado)==='finalizados').length+1));
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('Idioma persistente, archivo separado y vista móvil estrecha',async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:'en',url:baseURL!}]);
 await page.goto('/vista-previa/pedidos');
 await expect(page.locator('.propuesta-idiomas')).toHaveCount(0);await expect(page.locator('html')).toHaveAttribute('lang','en');
 await page.reload();await expect(page.getByRole('heading',{name:en.PropuestaPedidos.titulo,exact:true})).toBeVisible();
 await page.locator('[data-vista=archivados]').click();await expect(page.locator('.propuesta-pedido')).toHaveCount(pedidosPropuesta.filter(p=>p.archivado).length);
 await context.addCookies([{name:'sg-idioma',value:'es',url:baseURL!}]);await page.reload();await expect(page.locator('html')).toHaveAttribute('lang','es');
 await page.setViewportSize({width:320,height:740});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

for(const idioma of ['es','en'] as const)test(`Panel completo y simulaciones ${idioma}`,async({page,context,baseURL})=>{
 const t=(idioma==='es'?es:en).PropuestaPanel,o=(idioma==='es'?es:en).PropuestaPedidos;
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 const errores:string[]=[];page.on('pageerror',e=>errores.push(e.message));
 await page.goto('/vista-previa/pedidos');
 const nav=page.getByRole('navigation',{name:t.navegacion});
 for(const modulo of ['inicio','catalogo','proveedores','contenido','usuarios','estadisticas'] as const){
  await nav.getByRole('button',{name:t[modulo],exact:true}).click();
  await expect(page.getByRole('heading',{name:t[modulo],exact:true,level:1})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
 await nav.getByRole('button',{name:t.catalogo,exact:true}).click();
 await page.getByRole('button',{name:t.editar,exact:true}).first().click();
 await page.getByRole('textbox',{name:t.nombre,exact:true}).fill('Logitech QA');
 await page.getByRole('button',{name:t.guardar,exact:true}).click();
 await expect(page.getByRole('heading',{name:'Logitech QA'})).toBeVisible();
 await nav.getByRole('button',{name:t.usuarios,exact:true}).click();
 await page.getByRole('button',{name:t.administrar,exact:true}).first().click();
 await page.getByRole('combobox',{name:t.rol,exact:true}).selectOption('administrador');
 await page.getByRole('button',{name:t.guardar,exact:true}).click();
 await expect(page.locator('.propuesta-registro').filter({hasText:'maria@example.com'})).toContainText(t.administrador);
 await nav.getByRole('button',{name:t.pedidos,exact:true}).click();
 await page.getByRole('button',{name:o.restablecer,exact:true}).click();

 while(await page.getByRole('button',{name:new RegExp(o.cargarMas.split('(')[0])}).count())await page.getByRole('button',{name:new RegExp(o.cargarMas.split('(')[0])}).click();
 await expect(page.locator('.propuesta-pedido')).toHaveCount(activos.filter(p=>vistaPedidoPropuesta(p.estado)==='por_atender').length);
 expect(errores).toEqual([]);
});
for(const idioma of ['es','en'] as const)test(`Asesoría abre WhatsApp directamente ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 const solicitudes:string[]=[];page.on('request',r=>{if(r.url().includes('/api/asesoria'))solicitudes.push(r.url());});
 await page.goto('/tienda');
 const asesor=page.locator('.shop-resultados-cabecera a.shop-asesoria-inline');
 await expect(asesor).toHaveAttribute('href',/^https:\/\/wa\.me\//);
 await expect(asesor).toHaveAttribute('target','_blank');
 await expect(asesor).toHaveAttribute('rel','noopener noreferrer');
 const producto=await page.locator('a[href^="/tienda/"]').first().getAttribute('href');
 expect(producto).toBeTruthy();await page.goto(producto!);
 const enlace=page.locator('a.shop-asesoria-inline');await expect(enlace).toHaveAttribute('href',/^https:\/\/wa\.me\//);
 const mensaje=new URL((await enlace.getAttribute('href'))!).searchParams.get('text');expect(mensaje).toContain('1 ×');
 expect(solicitudes).toEqual([]);
 await page.goto('/vista-previa/pedidos');
 await expect(page.locator('.propuesta-consulta')).toHaveCount(0);
 await expect(page.locator('.propuesta-secciones')).toHaveCount(0);
});

test('Orden cronológico y preferencia por sección',async({page})=>{
 await page.goto('/vista-previa/pedidos');
 const leer=()=>page.locator('.propuesta-pedido time').evaluateAll(nodos=>nodos.map(n=>Date.parse(n.getAttribute('datetime')!)));
 let fechas=await leer();expect(fechas.length).toBeGreaterThan(1);expect(fechas).toEqual([...fechas].sort((a,b)=>a-b));
 await page.locator('.propuesta-orden-fecha button').click();await page.locator('[data-valor=recientes]').click();
 fechas=await leer();expect(fechas).toEqual([...fechas].sort((a,b)=>b-a));
 await page.locator('.propuesta-vistas button').nth(1).click();fechas=await leer();expect(fechas).toEqual([...fechas].sort((a,b)=>a-b));
 await page.locator('.propuesta-vistas button').nth(2).click();fechas=await leer();expect(fechas).toEqual([...fechas].sort((a,b)=>b-a));
 await page.locator('.propuesta-vistas button').first().click();fechas=await leer();expect(fechas).toEqual([...fechas].sort((a,b)=>b-a));
});

test('Navegación horizontal del panel, selección visible y teclado',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.setViewportSize({width:390,height:844});await page.goto('/vista-previa/pedidos');
 const nav=page.locator('.propuesta-nav');
 await expect(nav.locator('button').first()).toBeEnabled();
 await expect.poll(()=>nav.evaluate(n=>n.scrollWidth>n.clientWidth)).toBe(true);
 const alturas=await nav.locator('button').evaluateAll(botones=>botones.map(b=>Math.round(b.getBoundingClientRect().top)));expect(new Set(alturas).size).toBe(1);
 await nav.locator('button').first().focus();await page.keyboard.press('End');await page.keyboard.press('Enter');await expect(nav.locator('button').last()).toHaveAttribute('aria-current','page');await expect.poll(()=>nav.evaluate(n=>n.scrollLeft)).toBeGreaterThan(0);
 await page.keyboard.press('Home');await page.keyboard.press('Enter');await expect(nav.locator('button').first()).toHaveAttribute('aria-current','page');await expect.poll(()=>nav.evaluate(n=>n.scrollLeft)).toBeLessThan(5);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('Encabezado en una fila en PC y sin selector de idioma',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/vista-previa/pedidos');
 const logo=await page.locator('.propuesta-logo-sitio').boundingBox(),nav=await page.locator('.propuesta-nav').boundingBox(),volver=await page.locator('.propuesta-volver-sitio').boundingBox();
 expect(Math.abs(logo!.y+logo!.height/2-nav!.y-nav!.height/2)).toBeLessThan(2);expect(Math.abs(logo!.y+logo!.height/2-volver!.y-volver!.height/2)).toBeLessThan(2);
 await expect(page.locator('.propuesta-cabecera-panel form')).toHaveCount(0);await expect(page.locator('.propuesta-volver-sitio')).toHaveAttribute('href','/');await expect(page.locator('.propuesta-volver-sitio')).not.toHaveAttribute('target','_blank');
 await page.setViewportSize({width:390,height:844});const menu=await page.locator('.propuesta-nav').boundingBox(),marca=await page.locator('.propuesta-logo-sitio').boundingBox();expect(menu!.y).toBeGreaterThan(marca!.y+marca!.height);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});


for(const idioma of ['es','en'] as const)test(`Archivar y restaurar un pedido rechazado ${idioma}`,async({page,context,baseURL})=>{
 const t=(idioma==='es'?es:en).PropuestaPedidos;
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.goto('/vista-previa/pedidos');
 await page.getByRole('searchbox',{name:t.buscar,exact:true}).fill('SG-1042');
 const pedido=page.locator('[data-pedido=SG-1042]');
 await pedido.locator('summary').first().click();
 await pedido.getByRole('button',{name:t.archivar,exact:true}).click();
 await expect(page.locator('[data-vista=archivados]')).toHaveAttribute('aria-pressed','true');
 await expect(pedido).toBeVisible();
 await expect(pedido.locator('summary').first()).toBeFocused();
 await expect(pedido.locator('.propuesta-detalle')).toContainText(t.fondosEjemplo);
 await expect(pedido.getByRole('button',{name:t.simularPago,exact:true})).toHaveCount(0);
 await pedido.getByRole('button',{name:t.restaurar,exact:true}).click();
 await expect(page.locator('.propuesta-vistas button').first()).toHaveAttribute('aria-pressed','true');
 await expect(pedido).toBeVisible();
 await expect(pedido.locator('summary').first()).toBeFocused();
 await expect(pedido.locator('.propuesta-detalle')).toContainText(t.fondosEjemplo);
});

for(const idioma of ['es','en'] as const)test(`Seguir el pedido al cambiar de sección ${idioma}`,async({page,context,baseURL})=>{
 const t=(idioma==='es'?es:en).PropuestaPedidos;
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.goto('/vista-previa/pedidos');
 await page.getByRole('searchbox',{name:t.buscar,exact:true}).fill('SG-1048');
 const pedido=page.locator('[data-pedido=SG-1048]');
 await pedido.locator('summary').first().click();
 await pedido.getByRole('button',{name:t.verificarPago,exact:true}).click();
 await page.getByRole('button',{name:t.confirmarPago,exact:true}).click();
 await pedido.getByRole('button',{name:t.preparar,exact:true}).click();
 await expect(page.locator('.propuesta-vistas button').nth(1)).toHaveAttribute('aria-pressed','true');
 await expect(pedido.locator('summary').first()).toBeFocused();
 await expect(pedido.getByRole('button',{name:t.listoRetiro,exact:true})).toBeVisible();
 await pedido.getByRole('button',{name:t.listoRetiro,exact:true}).click();
 await pedido.getByRole('button',{name:t.confirmarEntrega,exact:true}).click();
 await expect(page.locator('.propuesta-vistas button').nth(2)).toHaveAttribute('aria-pressed','true');
 await expect(pedido.locator('summary').first()).toBeFocused();
 await expect(pedido.locator('.propuesta-entrega')).toContainText(t.estado_entregado);
});

for(const idioma of ['es','en'] as const)test(`Guías de Express y Correos ${idioma}`,async({page,context,baseURL})=>{
 const t=(idioma==='es'?es:en).PropuestaPedidos;
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.goto('/vista-previa/pedidos');
 const buscar=page.getByRole('searchbox',{name:t.buscar,exact:true});
 for(const id of ['SG-1044','SG-1047']){
  await buscar.fill(id);
  await page.locator('.propuesta-vistas button').nth(id==='SG-1044'?1:0).click();
  const pedido=page.locator('[data-pedido='+id+']');
  await pedido.locator('summary').first().click();
  if(id==='SG-1047')await pedido.getByRole('button',{name:t.preparar,exact:true}).click();
  const guia=pedido.getByRole('textbox',{name:t.numeroGuia,exact:true});
  await guia.fill(' CR-12345-'+id+' ');
  await pedido.getByRole('button',{name:t.guardarGuia,exact:true}).click();
  await expect(page.locator('.propuesta-aviso')).toContainText(t.guiaGuardada.replace('{referencia}',id));
  await guia.fill('CR-67890-'+id);
  await pedido.getByRole('button',{name:t.marcarEnviado,exact:true}).click();
  await expect(page.locator('.propuesta-vistas button').nth(2)).toHaveAttribute('aria-pressed','true');
  await expect(guia).toHaveValue('CR-67890-'+id);
  await pedido.locator('summary').first().click();
  await pedido.locator('summary').first().click();
  await expect(guia).toHaveValue('CR-67890-'+id);
 }
 await buscar.fill('SG-1048');await page.locator('.propuesta-vistas button').first().click();
 await page.locator('[data-pedido=SG-1048] summary').first().click();
 await expect(page.getByRole('textbox',{name:t.numeroGuia,exact:true})).toHaveCount(0);
});

for(const idioma of ['es','en'] as const)test(`Contadores totales estables y sincronizados ${idioma}`,async({page,context,baseURL})=>{
 const t=(idioma==='es'?es:en).PropuestaPedidos;
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.goto('/vista-previa/pedidos');
 const tabs=page.locator('.propuesta-vistas button');
 const contar=()=>tabs.locator('span').allTextContents().then(xs=>xs.map(Number));
 await expect(page.getByRole('searchbox',{name:t.buscar,exact:true})).toBeEnabled();
 const inicial=await contar();
 expect(inicial).toEqual(['por_atender','preparacion','finalizados','archivados'].map(v=>pedidosPropuesta.filter(p=>v==='archivados'?p.archivado:!p.archivado&&vistaPedidoPropuesta(p.estado)===v).length));
 await page.getByRole('searchbox',{name:t.buscar,exact:true}).fill('SG-1042');
 expect(await contar()).toEqual(inicial);
 await page.getByRole('button',{name:t.formaPago,exact:true}).click();await page.locator('[data-valor=tarjeta]').click();
 expect(await contar()).toEqual(inicial);
 const pedido=page.locator('[data-pedido=SG-1042]');
 await pedido.locator('summary').first().click();
 await pedido.getByRole('button',{name:t.archivar,exact:true}).click();
 expect(await contar()).toEqual([inicial[0]-1,inicial[1],inicial[2],inicial[3]+1]);
 await pedido.getByRole('button',{name:t.restaurar,exact:true}).click();
 expect(await contar()).toEqual(inicial);
 await pedido.getByRole('button',{name:t.simularPago,exact:true}).click();
 expect(await contar()).toEqual(inicial);
 await pedido.getByRole('button',{name:t.preparar,exact:true}).click();
 expect(await contar()).toEqual([inicial[0]-1,inicial[1]+1,inicial[2],inicial[3]]);
 await page.getByRole('button',{name:t.limpiar,exact:true}).click();
 expect(await contar()).toEqual([inicial[0]-1,inicial[1]+1,inicial[2],inicial[3]]);
});
