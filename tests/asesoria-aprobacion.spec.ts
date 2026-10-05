import {test,expect} from '@playwright/test';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {randomBytes,createHash,randomUUID} from 'node:crypto';

test.describe.configure({mode:'serial'});
test.skip(process.env.SG_TEST_ALTAS!=='1','Requiere servidor local aislado');
const archivo='.privado/admin-local/asesorias.json';
for(const idioma of ['es','en'])test(`asesor prepara compra y servidor impide saltar aprobación ${idioma}`,async({page,context,request},info)=>{
 const catalogoArchivo='.privado/admin-local/catalogo.json',catalogoOriginal=await readFile(catalogoArchivo,'utf8');
 const catalogo=JSON.parse(catalogoOriginal);const privado=catalogo.contenido.productos.find((p:{id:string;codigoFabricante:string})=>p.id!=='portatil'&&p.codigoFabricante);catalogo.contenido.gestion='manual';privado.publicado=false;
 const cuentaOriginal=await readFile('.privado/admin-local/cuenta.json','utf8');let anterior:string|null=null;try{anterior=await readFile(archivo,'utf8');}catch{}
 const cuenta=JSON.parse(cuentaOriginal),token=randomBytes(32).toString('hex');cuenta.sesiones.push({hash:createHash('sha256').update(token).digest('hex'),vence:Date.now()+300000});
 try{
  await writeFile('.privado/admin-local/cuenta.json',JSON.stringify(cuenta));await writeFile(catalogoArchivo,JSON.stringify(catalogo));
  expect((await request.get('/soluciones/'+privado.id)).status()).toBe(404);
  await context.addCookies([{name:'sg-admin-local',value:token,domain:'127.0.0.1',path:'/'},{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
  const origen='http://127.0.0.1:3107';
  for(const ruta of ['/api/pedidos/manual','/api/pagos/tilopay/iniciar'])expect((await request.post(ruta,{headers:{origin:origen},data:{articulos:[{id:'portatil',cantidad:1}]}})).status()).toBe(403);
  // A callback enquiry is saved without billing/address or choosing products.
  expect((await request.post('/api/asesoria',{headers:{origin:origen},data:{idioma,articulos:[],contacto:{nombre:'Cliente prueba',telefono:'50688888888',necesidad:'Necesito mejorar la red'}}})).status()).toBe(400);
  await page.goto('/soluciones');await page.locator('.contacto-asesoria-trigger').click();
  await page.locator('.contacto-asesoria [name=nombre]').fill('Cliente prueba');await page.locator('.contacto-asesoria [name=telefono]').fill('+506 8888 8888');await page.locator('.contacto-asesoria [name=necesidad]').fill('Necesito mejorar la red');await page.locator('.contacto-asesoria [name=consentimiento]').check();await page.locator('.contacto-asesoria form button').click();
  await expect(page.locator('.contacto-asesoria [role=status]')).toContainText('SG-');
  await page.goto('/panel/pedidos');const contacto=page.locator('.asesorias-admin:visible article').filter({hasText:'Cliente prueba'});await contacto.locator('.panel-pedido-detalle>summary').click();await expect(contacto).toContainText('Necesito mejorar la red');await expect(contacto.locator('a[href^="https://wa.me/"]')).toHaveAttribute('href',/^https:\/\/wa.me\/50688888888\?/);
  await page.screenshot({path:`/tmp/sg-consultas-${idioma}-${info.project.name}.png`});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.goto('/finalizar-compra');await expect(page.locator('main form')).toHaveCount(0);
  const solicitud=await request.post('/api/asesoria',{headers:{origin:origen},data:{idioma,articulos:[{id:'portatil',cantidad:2}]}});expect(solicitud.status()).toBe(201);const {referencia}=await solicitud.json();
  await page.goto('/panel/pedidos');const tarjeta=page.locator('.asesorias-admin:visible article').filter({hasText:referencia});
  await tarjeta.locator('.panel-pedido-detalle>summary').click();await tarjeta.locator('[name=cantidad]').fill('3');await tarjeta.locator('[name=precio]').fill('555000');await tarjeta.locator('[name=confirmado]').check();await tarjeta.getByRole('button',{name:idioma==='es'?'Generar enlace de compra':'Generate checkout link',exact:true}).click();
  await expect(page.locator('main>p[role=status]')).toContainText(idioma==='es'?'no se envió ningún correo':'no email was sent');
  const bloque=tarjeta.locator('.asesoria-enlace');
  await expect(bloque).toBeFocused();
  await expect.poll(()=>bloque.evaluate(e=>{const r=e.getBoundingClientRect();return Math.abs(r.y+r.height/2-innerHeight/2);})).toBeLessThan(30);
  await expect(bloque.locator('code')).toContainText('/compra/');
  await expect(bloque.locator('details')).not.toHaveAttribute('open','');
  await page.screenshot({path:`/tmp/sg-enlace-corto-${idioma}-${info.project.name}.png`});
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await bloque.getByRole('button',{name:idioma==='es'?'Copiar enlace':'Copy link',exact:true}).click();
  const enlace=await tarjeta.locator('input[readonly]').inputValue();
  expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(enlace);
  await page.evaluate(()=>{Object.defineProperty(navigator.clipboard,'writeText',{configurable:true,value:async()=>{throw new Error('Portapapeles no disponible en esta prueba');}});});
  await bloque.locator('button').click();await expect(bloque.locator('details')).toHaveAttribute('open','');await expect(bloque.locator('input')).toBeFocused();const url=new URL(enlace);expect(url.pathname).toMatch(/^\/compra\/[A-Za-z0-9_-]{22}$/);expect(url.search).toBe('');
  const tokenEnlace=Buffer.from(url.pathname.split('/').at(-1)!,'base64url').toString('hex');
  const aprobacion=JSON.parse(await readFile(archivo,'utf8')).find((s:{token:string})=>s.token===tokenEnlace);expect(aprobacion.estado).toBe('aprobada');
  const cliente=await context.browser()!.newContext({viewport:info.project.name==='movil'?{width:390,height:844}:{width:1440,height:1000}});await cliente.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);const vista=await cliente.newPage();
  const respuesta=await vista.goto(enlace);expect(respuesta?.headers()['referrer-policy']).toBe('no-referrer');await expect(vista.locator('main form')).toBeVisible();await expect(vista.locator('.compra-resumen')).toContainText('555');await expect(vista.locator('html')).toHaveAttribute('lang',idioma);expect(await vista.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await vista.goto('/compra/no-valido');await expect(vista.locator('main form')).toHaveCount(0);
  // Compatibility: previously issued 256-bit links and query URLs still work.
  const archivoCompat=JSON.parse(await readFile(archivo,'utf8'));const compat=archivoCompat.find((x:{id:string})=>x.id===aprobacion.id),corto=compat.token;
  compat.token=randomBytes(32).toString('hex');await writeFile(archivo,JSON.stringify(archivoCompat));
  await vista.goto(`${origen}/compra/${Buffer.from(compat.token,'hex').toString('base64url')}`);await expect(vista.locator('main form')).toBeVisible();
  await vista.goto(`${origen}/finalizar-compra?asesoria=${compat.id}&acceso=${compat.token}`);await expect(vista.locator('main form')).toBeVisible();
  compat.token=corto;await writeFile(archivo,JSON.stringify(archivoCompat));

  await vista.goto(`${origen}/finalizar-compra?asesoria=${aprobacion.id}&acceso=${aprobacion.token}`);await expect(vista.locator('main form')).toBeVisible();
  await vista.goto(enlace);
  await vista.screenshot({path:`/tmp/sg-aprobado-${idioma}-${info.project.name}.png`,fullPage:true});
  const datos={idioma,asesoria:aprobacion.id,acceso:aprobacion.token,metodo:'sinpe',datos:{nombre:'Prueba',apellidos:'Asesoria',correo:'prueba@example.com',telefono:'88888888',contacto:'whatsapp',modalidad:'retiro',factura:'tiquete',consentimiento:'on'},articulos:[{id:'portatil',cantidad:4}]};
  expect((await request.post('/api/pedidos/manual',{headers:{origin:origen},data:datos})).status()).toBe(403);
  // Preparar de nuevo invalida el enlace anterior.
  await page.goto('/panel/pedidos');await tarjeta.locator('.panel-pedido-detalle>summary').click();
  await tarjeta.getByRole('button',{name:idioma==='es'?/^Quitar/:/^Remove/}).click();
  await tarjeta.locator('input[type=search]').fill(privado.codigoFabricante);
  await expect(tarjeta.locator('.asesoria-busqueda-resultados')).toContainText(idioma==='es'?'Catálogo privado':'Private catalog');
  await tarjeta.locator('.asesoria-busqueda-resultados button').first().click();
  await tarjeta.locator('[name=precio]').fill('45000');await tarjeta.locator('[name=cantidad]').fill('2');
  await tarjeta.getByRole('button',{name:idioma==='es'?'Generar enlace de compra':'Generate checkout link',exact:true}).click();
  await expect(tarjeta.locator('[role=alert]')).toBeVisible();
  await tarjeta.locator('[name=confirmado]').check();await tarjeta.getByRole('button',{name:idioma==='es'?'Generar enlace de compra':'Generate checkout link',exact:true}).click();await expect(tarjeta.locator('input[readonly]')).not.toHaveValue(enlace);await vista.goto(enlace);await expect(vista.locator('main form')).toHaveCount(0);
  const segundo=await tarjeta.locator('input[readonly]').inputValue();await vista.goto(segundo);await expect(vista.locator('main form')).toBeVisible();await expect(vista.locator('.compra-resumen')).toContainText(privado.nombre[idioma]);
  expect((await request.get('/soluciones/'+privado.id)).status()).toBe(404);
  const actualizado=JSON.parse(await readFile(archivo,'utf8')).find((x:{id:string})=>x.id===aprobacion.id);expect(actualizado.articulos).toHaveLength(1);expect(actualizado.articulos[0].producto.id).toBe(privado.id);expect(actualizado.articulos[0].producto.precio).toBe(45000);expect(actualizado.articulos[0].cantidad).toBe(2);
  const filas=JSON.parse(await readFile(archivo,'utf8'));const s=filas.find((x:{id:string})=>x.id===aprobacion.id);s.vence_en=new Date(Date.now()-1000).toISOString();await writeFile(archivo,JSON.stringify(filas));await vista.reload();await expect(vista.locator('main form')).toHaveCount(0);
  s.vence_en=new Date(Date.now()+3600000).toISOString();s.estado='utilizada';await writeFile(archivo,JSON.stringify(filas));await vista.reload();await expect(vista.locator('main form')).toHaveCount(0);
  // Exercise history paging/search with more than one page of local records.
  const historial=Array.from({length:11},(_,i)=>({...s,id:randomUUID(),estado:'cancelada',token:null,vence_en:null,contacto:{nombre:`Cliente paginación ${i+1}`,telefono:'50688888888',necesidad:'Prueba de búsqueda y paginación'}}));
  await writeFile(archivo,JSON.stringify([...filas,...historial]));await page.goto('/panel/pedidos');
  const bandeja=page.locator('.asesorias-admin:visible .panel-lista');
  await bandeja.getByRole('button',{name:idioma==='es'?/^Historial/:/^History/}).click();
  await expect(bandeja.locator('article')).toHaveCount(10);
  await bandeja.locator('.admin-paginacion button').last().click();await expect(bandeja.locator('article')).toHaveCount(2);
  await expect(bandeja.locator('.admin-paginacion button').first()).toBeEnabled();
  await bandeja.locator('.panel-buscador input').fill('Cliente paginación 11');await expect(bandeja.locator('article')).toHaveCount(1);
  await bandeja.locator('.panel-buscador input').fill('referencia inexistente');await expect(bandeja.locator('article')).toHaveCount(0);
  await expect(bandeja.locator('.admin-lista-vacia')).toBeVisible();
  // A newly prepared purchase remains visible even behind more than a page of pending enquiries.
  const respaldoPaginado=JSON.parse(await readFile(archivo,'utf8'));
  const pendientes=Array.from({length:15},()=>({...s,id:randomUUID(),numero:undefined,estado:'solicitada',token:null,vence_en:null,creado_en:'2020-01-01T00:00:00Z'}));
  await writeFile(archivo,JSON.stringify([...respaldoPaginado,...pendientes]));await page.goto('/panel/pedidos');
  const nueva=page.locator('.panel-nueva-asesoria:visible');await nueva.locator('summary').click();
  await nueva.locator('input[type=search]').fill('21H2S1NH00');await nueva.locator('.asesoria-busqueda-resultados button').first().click();
  await nueva.locator('[name=confirmado]').check();await nueva.getByRole('button',{name:idioma==='es'?'Generar enlace de compra':'Generate checkout link',exact:true}).click();
  await page.waitForURL(u=>u.hash.startsWith('#enlace-')&&u.searchParams.get('asesoria')!==aprobacion.id);
  const generado=page.locator(`[id="${new URL(page.url()).hash.slice(1)}"]`);await expect(generado).toBeFocused();
  await expect.poll(()=>generado.evaluate(e=>{const r=e.getBoundingClientRect();return Math.abs(r.y+r.height/2-innerHeight/2);})).toBeLessThan(30);
  await expect(page.locator('.asesorias-admin:visible .admin-paginacion')).toContainText(idioma==='es'?'Página 2':'Page 2');

  await cliente.close();
  await context.clearCookies();await page.goto('/panel/pedidos');await expect(page).toHaveURL(/\/admin$/);
 }finally{await writeFile(catalogoArchivo,catalogoOriginal);await writeFile('.privado/admin-local/cuenta.json',cuentaOriginal);if(anterior===null)await unlink(archivo).catch(()=>{});else await writeFile(archivo,anterior);}
});
