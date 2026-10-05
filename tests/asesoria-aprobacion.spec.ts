import {test,expect} from '@playwright/test';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {randomBytes,createHash} from 'node:crypto';

test.describe.configure({mode:'serial'});
test.skip(process.env.SG_TEST_ALTAS!=='1','Requiere servidor local aislado');
const archivo='.privado/admin-local/asesorias.json';
for(const idioma of ['es','en'])test(`asesor prepara compra y servidor impide saltar aprobación ${idioma}`,async({page,context,request},info)=>{
 const cuentaOriginal=await readFile('.privado/admin-local/cuenta.json','utf8');let anterior:string|null=null;try{anterior=await readFile(archivo,'utf8');}catch{}
 const cuenta=JSON.parse(cuentaOriginal),token=randomBytes(32).toString('hex');cuenta.sesiones.push({hash:createHash('sha256').update(token).digest('hex'),vence:Date.now()+300000});
 try{
  await writeFile('.privado/admin-local/cuenta.json',JSON.stringify(cuenta));
  await context.addCookies([{name:'sg-admin-local',value:token,domain:'127.0.0.1',path:'/'},{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
  const origen='http://127.0.0.1:3107';
  for(const ruta of ['/api/pedidos/manual','/api/pagos/tilopay/iniciar'])expect((await request.post(ruta,{headers:{origin:origen},data:{articulos:[{id:'portatil',cantidad:1}]}})).status()).toBe(403);
  // A callback enquiry is saved without billing/address or choosing products.
  expect((await request.post('/api/asesoria',{headers:{origin:origen},data:{idioma,articulos:[],contacto:{nombre:'Cliente prueba',telefono:'50688888888',necesidad:'Necesito mejorar la red'}}})).status()).toBe(400);
  await page.goto('/soluciones');await page.locator('.contacto-asesoria summary').click();
  await page.locator('.contacto-asesoria [name=nombre]').fill('Cliente prueba');await page.locator('.contacto-asesoria [name=telefono]').fill('+506 8888 8888');await page.locator('.contacto-asesoria [name=necesidad]').fill('Necesito mejorar la red');await page.locator('.contacto-asesoria [name=consentimiento]').check();await page.locator('.contacto-asesoria button').click();
  await expect(page.locator('.contacto-asesoria [role=status]')).toContainText('SG-');
  await page.goto('/panel/pedidos');const contacto=page.locator('.asesorias-admin article').filter({hasText:'Cliente prueba'});await expect(contacto).toContainText('Necesito mejorar la red');await expect(contacto.locator('a[href^="https://wa.me/"]')).toHaveAttribute('href',/^https:\/\/wa.me\/50688888888\?/);
  await page.screenshot({path:`/tmp/sg-consultas-${idioma}-${info.project.name}.png`});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.goto('/finalizar-compra');await expect(page.locator('main form')).toHaveCount(0);
  const solicitud=await request.post('/api/asesoria',{headers:{origin:origen},data:{idioma,articulos:[{id:'portatil',cantidad:2}]}});expect(solicitud.status()).toBe(201);const {referencia}=await solicitud.json();
  await page.goto('/panel/pedidos');const tarjeta=page.locator('.asesorias-admin article').filter({hasText:referencia});
  await tarjeta.locator('[name=cantidad]').fill('3');await tarjeta.locator('[name=precio]').fill('555000');await tarjeta.locator('[name=confirmado]').check();await tarjeta.getByRole('button',{name:idioma==='es'?'Preparar pedido':'Prepare order',exact:true}).click();
  const enlace=await tarjeta.locator('input[readonly]').inputValue();const url=new URL(enlace);expect(url.pathname).toBe('/finalizar-compra');
  const aprobacion=JSON.parse(await readFile(archivo,'utf8')).find((s:{id:string})=>s.id===url.searchParams.get('asesoria'));expect(aprobacion.estado).toBe('aprobada');
  const cliente=await context.browser()!.newContext({viewport:info.project.name==='movil'?{width:390,height:844}:{width:1440,height:1000}});await cliente.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);const vista=await cliente.newPage();
  await vista.goto(enlace);await expect(vista.locator('main form')).toBeVisible();await expect(vista.locator('.compra-resumen')).toContainText('555');await expect(vista.locator('html')).toHaveAttribute('lang',idioma);expect(await vista.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await vista.screenshot({path:`/tmp/sg-aprobado-${idioma}-${info.project.name}.png`,fullPage:true});
  const datos={idioma,asesoria:aprobacion.id,acceso:aprobacion.token,metodo:'sinpe',datos:{nombre:'Prueba',apellidos:'Asesoria',correo:'prueba@example.com',telefono:'88888888',contacto:'whatsapp',modalidad:'retiro',factura:'tiquete',consentimiento:'on'},articulos:[{id:'portatil',cantidad:4}]};
  expect((await request.post('/api/pedidos/manual',{headers:{origin:origen},data:datos})).status()).toBe(403);
  // Preparar de nuevo invalida el enlace anterior.
  await page.goto('/panel/pedidos');await tarjeta.locator('[name=confirmado]').check();await tarjeta.getByRole('button',{name:idioma==='es'?'Preparar pedido':'Prepare order',exact:true}).click();await expect(tarjeta.locator('input[readonly]')).not.toHaveValue(enlace);await vista.goto(enlace);await expect(vista.locator('main form')).toHaveCount(0);
  const segundo=await tarjeta.locator('input[readonly]').inputValue();await vista.goto(segundo);await expect(vista.locator('main form')).toBeVisible();
  const filas=JSON.parse(await readFile(archivo,'utf8'));const s=filas.find((x:{id:string})=>x.id===aprobacion.id);s.vence_en=new Date(Date.now()-1000).toISOString();await writeFile(archivo,JSON.stringify(filas));await vista.reload();await expect(vista.locator('main form')).toHaveCount(0);
  s.vence_en=new Date(Date.now()+3600000).toISOString();s.estado='utilizada';await writeFile(archivo,JSON.stringify(filas));await vista.reload();await expect(vista.locator('main form')).toHaveCount(0);
  await cliente.close();
  await context.clearCookies();await page.goto('/panel/pedidos');await expect(page).toHaveURL(/\/admin$/);
 }finally{await writeFile('.privado/admin-local/cuenta.json',cuentaOriginal);if(anterior===null)await unlink(archivo).catch(()=>{});else await writeFile(archivo,anterior);}
});
