import {test,expect} from '@playwright/test';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {randomBytes,createHash,randomUUID} from 'node:crypto';

test.describe.configure({mode:'serial'});
test.skip(process.env.SG_TEST_ALTAS!=='1','Requiere servidor local aislado');
for(const idioma of ['es','en'])test(`historial conserva contacto y solo elimina canceladas sin pedido ${idioma}`,async({page,context,request},info)=>{
 const archivo='.privado/admin-local/asesorias.json',cuentaArchivo='.privado/admin-local/cuenta.json';
 const cuentaOriginal=await readFile(cuentaArchivo,'utf8');let original:string|null=null;try{original=await readFile(archivo,'utf8');}catch{}
 const cuenta=JSON.parse(cuentaOriginal),token=randomBytes(32).toString('hex');cuenta.sesiones.push({hash:createHash('sha256').update(token).digest('hex'),vence:Date.now()+300000});
 const base={creado_en:new Date().toISOString(),idioma,articulos:[],token:null,vence_en:null,pedido_id:null,contacto:{nombre:'Cliente historial prueba',telefono:'+506 8888 8888',necesidad:'Necesito una red para mi oficina.\nCon tres computadoras.',correo:'cliente@example.test',notas:'Contactarme en la mañana',contacto:'llamada'}};
 const cancelada={...base,id:randomUUID(),numero:9910,estado:'cancelada'};
 const protegida={...base,id:randomUUID(),numero:9909,estado:'utilizada'};
 const vinculada={...base,id:randomUUID(),numero:9908,estado:'cancelada',pedido_id:randomUUID()};
 const pendiente={...base,id:randomUUID(),numero:9907,estado:'solicitada'};
 const sinContacto={...base,id:randomUUID(),numero:9906,estado:'utilizada',contacto:null};
 try{
  await writeFile(cuentaArchivo,JSON.stringify(cuenta));await writeFile(archivo,JSON.stringify([cancelada,protegida,vinculada,pendiente,sinContacto]));
  await context.addCookies([{name:'sg-admin-local',value:token,domain:'127.0.0.1',path:'/'},{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
  await page.goto('/panel/pedidos');await expect(page.locator('html')).toHaveAttribute('lang',idioma);
  const bandeja=page.locator('.asesorias-admin:visible');
  await expect(bandeja.locator('.panel-eliminar-consulta')).toHaveCount(0);
  await bandeja.getByRole('button',{name:idioma==='es'?/^Historial/:/^History/}).click();
  const tarjeta=bandeja.locator('article').filter({hasText:'SG-9910'});
  await tarjeta.locator('.panel-pedido-detalle>summary').click();
  const contacto=tarjeta.locator('.panel-contacto-cliente');
  await expect(contacto).toContainText('+50688888888');await expect(contacto).toContainText('Necesito una red para mi oficina.');await expect(contacto).toContainText('cliente@example.test');await expect(contacto).toContainText('Contactarme en la mañana');await expect(contacto).toContainText(idioma==='es'?'Llamada telefónica':'Phone call');
  const whatsapp=contacto.locator('a[href^="https://wa.me/"]');
  await expect(whatsapp).toHaveAttribute('target','_blank');await expect(whatsapp).toHaveAttribute('rel','noopener noreferrer');
  const destino=new URL((await whatsapp.getAttribute('href'))!);expect(destino.pathname).toBe('/50688888888');expect(destino.searchParams.get('text')).toContain('SG-9910');
  await expect(bandeja.locator('article').filter({hasText:'SG-9909'}).locator('.panel-eliminar-consulta')).toHaveCount(0);
  await expect(bandeja.locator('article').filter({hasText:'SG-9908'}).locator('.panel-eliminar-consulta')).toHaveCount(0);
  const sinTelefono=bandeja.locator('article').filter({hasText:'SG-9906'});await sinTelefono.locator('.panel-pedido-detalle>summary').click();await expect(sinTelefono.locator('.panel-contacto-cliente')).toContainText(idioma==='es'?'No dejó un teléfono':'No contact phone');
  await tarjeta.locator('.panel-eliminar-consulta summary').click();
  await tarjeta.locator('.panel-eliminar-consulta button').click();
  expect((JSON.parse(await readFile(archivo,'utf8'))).find((x:{id:string})=>x.id===cancelada.id).eliminado_en).toBeUndefined();
  // La restricción se comprueba también en servidor, aunque se altere el ID del formulario.
  await tarjeta.locator('[name=confirmarEliminar]').check();await tarjeta.locator('.panel-eliminar-consulta input[name=id]').evaluate((e,id)=>(e as HTMLInputElement).value=id,protegida.id);
  await tarjeta.locator('.panel-eliminar-consulta button').click();await page.waitForURL(/resultado=error/);
  expect(JSON.parse(await readFile(archivo,'utf8')).find((x:{id:string})=>x.id===protegida.id).eliminado_en).toBeUndefined();
  await bandeja.getByRole('button',{name:idioma==='es'?/^Historial/:/^History/}).click();await tarjeta.locator('.panel-pedido-detalle>summary').click();await tarjeta.locator('.panel-eliminar-consulta summary').click();
  await tarjeta.locator('[name=confirmarEliminar]').check();await tarjeta.scrollIntoViewIfNeeded();
  await page.screenshot({path:`/tmp/sg-historial-contacto-${idioma}-${info.project.name}.png`});
  await tarjeta.locator('.panel-eliminar-consulta button').click();await page.waitForURL(/resultado=consulta_eliminada/);
  await expect(bandeja.locator('article').filter({hasText:'SG-9910'})).toHaveCount(0);
  await page.reload();await expect(bandeja.locator('article').filter({hasText:'SG-9910'})).toHaveCount(0);
  const borrada=JSON.parse(await readFile(archivo,'utf8')).find((x:{id:string})=>x.id===cancelada.id);expect(borrada.eliminado_en).toBeTruthy();expect(borrada.token).toBeNull();
  const r=await request.post('/api/asesoria',{headers:{origin:'http://127.0.0.1:3107'},data:{idioma,articulos:[],contacto:{nombre:'Siguiente consulta prueba',telefono:'50688888888',necesidad:''},consentimiento:true}});expect(r.status()).toBe(201);expect((await r.json()).referencia).toBe('SG-9911');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }finally{await writeFile(cuentaArchivo,cuentaOriginal);if(original!==null)await writeFile(archivo,original);else await unlink(archivo).catch(()=>{});}
});
