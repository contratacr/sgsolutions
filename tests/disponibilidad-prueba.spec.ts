import {readFile} from 'node:fs/promises';
import {test,expect} from '@playwright/test';
import es from '../messages/es.json';import en from '../messages/en.json';
import {claveEnlacesPrueba,type EnlacePrueba,rutaEnlacePrueba} from '../src/lib/disponibilidad-prueba';
async function completar(page:import('@playwright/test').Page,metodo:string,entrega:string,idioma:'es'|'en'='es'){
 let solicitudes=0;
 await page.route('**/api/pagos/**',async r=>{solicitudes++;await r.abort();});
 await page.route('**/api/pedidos/**',async r=>{solicitudes++;await r.abort();});
 await page.locator('[name=nombre]').fill('Cliente');
 await page.locator('[name=apellidos]').fill('QA');
 await page.locator('[name=correo]').fill('cliente@example.com');
 await page.locator('.campo-telefono:has(input[name=telefono]) input[type=tel]').fill('88888888');
 await page.locator('[name=identificacion]').fill('123456789');
 await page.locator('input[name=modalidad][value='+entrega+']').check();
 if(entrega!=='retiro'){
 await page.locator('[name=provincia]').selectOption('Alajuela');
 await page.locator('[name=canton]').selectOption('Atenas');
 await page.locator('[name=distrito]').selectOption('Atenas');
 await page.locator('[name=direccion]').fill('Frente a Plaza El Bosque');
 }
 await page.getByRole('button',{name:(idioma==='es'?es:en).Compra.pasoSiguiente,exact:true}).click();
 await expect(page.locator('[data-compra-paso="1"]')).toBeVisible();
 await page.getByRole('button',{name:(idioma==='es'?es:en).Compra.pasoSiguiente,exact:true}).click();
 await expect(page.locator('[data-compra-paso="2"]')).toBeVisible();
 await page.locator('input[name=pago][value='+metodo+']').check();
 if(metodo!=='tarjeta')await page.locator('#compra-comprobante').setInputFiles({name:'comprobante.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n'+'.'.repeat(200))});
 await page.locator('[name=consentimiento]').check();
 await page.locator('main form button[type=submit]').click();
 if(metodo!=='tarjeta')await page.locator('.compra-paso button.boton-naranja').click();
 await expect(page.getByRole('heading',{name:(idioma==='es'?es:en).DisponibilidadPrueba[metodo==='tarjeta'?'pagoSimulado':'comprobanteSimulado']})).toBeVisible();
 expect(solicitudes).toBe(0);
}
for(const idioma of ['es','en'] as const){
 const t=(idioma==='es'?es:en).DisponibilidadPrueba,p=(idioma==='es'?es:en).PropuestaPedidos;
 test(`Disponibilidad y enlace creado por administrador ${idioma}`,async({page,context,baseURL})=>{
  const errores:string[]=[];page.on('pageerror',e=>errores.push(e.message));
  await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
  await page.goto('/vista-previa/disponibilidad');
  await expect(page.locator('#combo').getByRole('button',{name:t.agregarCarrito})).toBeVisible();
  for(const id of ['router','mouse','monitor','cargador']){
   const card=page.locator('#'+id);await expect(card.getByRole('button',{name:t.agregarCarrito})).toHaveCount(0);const a=card.getByRole('link',{name:new RegExp(t.consultar)});await expect(a).toHaveAttribute('target','_blank');await expect(a).toHaveAttribute('rel','noopener noreferrer');const href=await a.getAttribute('href');expect(new URL(href!).pathname).toBe('/50686065342');expect(new URL(href!).searchParams.get('text')).toContain(id==='router'?'ARCHER-C6':id==='mouse'?'910-006757':id==='monitor'?'MONITOR-24':'PA046RBU001C');
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.goto('/vista-previa/pedidos');await page.getByRole('button',{name:t.crearPedido,exact:true}).click();
  const modal=page.getByRole('dialog');await modal.getByRole('textbox',{name:t.cliente,exact:true}).fill('Cliente enlace QA');
  await modal.getByRole('spinbutton',{name:t.cantidad,exact:true}).fill('4');await modal.getByRole('checkbox',{name:t.confirmaProveedor}).check();await modal.getByRole('button',{name:t.generar,exact:true}).click();await expect(modal.getByRole('heading',{name:t.enlaceListo})).toHaveCount(0);
  await modal.getByRole('spinbutton',{name:t.cantidad,exact:true}).fill('2');await modal.getByRole('spinbutton',{name:t.precioUnitario,exact:true}).fill('18000');await modal.getByRole('checkbox',{name:t.confirmaProveedor}).check();await modal.getByRole('button',{name:t.generar,exact:true}).click();
  await expect(modal.getByRole('heading',{name:t.enlaceListo})).toBeVisible();const datos=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!),claveEnlacesPrueba) as EnlacePrueba[];expect(datos).toHaveLength(1);expect(datos[0].lineas[0]).toMatchObject({cantidad:2,precio:18000});
  await modal.getByRole('link',{name:t.abrirEnlace,exact:true}).click();await expect(page).toHaveURL(/\/c\/[a-f0-9]{16}$/);await completar(page,'tarjeta','envio',idioma);await expect(page.getByRole('heading',{name:t.pagoSimulado})).toBeVisible();
  await page.getByRole('link',{name:t.volverPedidos,exact:true}).last().click();await page.getByRole('searchbox',{name:p.buscar,exact:true}).fill(datos[0].id);const row=page.locator('[data-pedido="'+datos[0].id+'"]');await expect(row).toContainText(p.pago_confirmado);await expect(row).toContainText(p.entrega_envio);await row.locator('summary').first().click();await row.getByRole('button',{name:p.preparar,exact:true}).click();await page.locator('.propuesta-vistas button').nth(1).click();await expect(row).toBeVisible();
  await page.goto('/vista-previa/compra/'+datos[0].token);await expect(page.getByRole('heading',{name:t.enlaceUsado})).toBeVisible();
  expect(errores).toEqual([]);
 });
}
test('Pagos y entregas de enlace, vencimiento y cancelación',async({page})=>{
 test.setTimeout(90000);
 await page.goto('/vista-previa/pedidos');
 for(const metodo of ['tarjeta','sinpe','transferencia'] as const)for(const entrega of ['retiro','envio','express'] as const){
  const token=crypto.randomUUID();const e:EnlacePrueba={id:'SG-LOCAL-TEST',token,cliente:'Cliente QA',creado:new Date().toISOString(),vence:new Date(Date.now()+3600000).toISOString(),lineas:[{producto:'router',cantidad:1,precio:17000}],estado:'pendiente_pago'};
  await page.evaluate(({k,e})=>localStorage.setItem(k,JSON.stringify([e])),{k:claveEnlacesPrueba,e});await page.goto('/vista-previa/pedidos');await page.goto(rutaEnlacePrueba(token));
  await completar(page,metodo,entrega);const guardado=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!)[0],claveEnlacesPrueba);expect(guardado).toMatchObject({metodo,entrega,estado:metodo==='tarjeta'?'por_preparar':'comprobante'});
  if(metodo!=='tarjeta'&&entrega==='retiro'){
   await page.goto('/vista-previa/pedidos');await page.getByRole('searchbox',{name:es.PropuestaPedidos.buscar,exact:true}).fill(e.id);
   const pedido=page.locator('[data-pedido="'+e.id+'"]');await pedido.locator('summary').first().click();
   await pedido.getByRole('button',{name:es.PropuestaPedidos.verAdjunto,exact:true}).click();
   const dialog=page.getByRole('dialog');await expect(dialog.locator('iframe')).toHaveAttribute('src',/^blob:/);
   const [descarga]=await Promise.all([page.waitForEvent('download'),dialog.getByRole('link',{name:es.PropuestaPedidos.descargarAdjunto,exact:true}).click()]);
   expect(descarga.suggestedFilename()).toBe('comprobante.pdf');
   expect(await readFile((await descarga.path())!)).toEqual(Buffer.from('%PDF-1.4\n'+'.'.repeat(200)));
   await page.keyboard.press('Escape');await expect(dialog).toBeHidden();
  }

 }
 const token=crypto.randomUUID();const e:EnlacePrueba={id:'SG-LOCAL-TEST',token,cliente:'Cliente QA',creado:new Date().toISOString(),vence:new Date(Date.now()-1000).toISOString(),lineas:[{producto:'router',cantidad:1,precio:17000}],estado:'pendiente_pago'};
 await page.evaluate(({k,e})=>localStorage.setItem(k,JSON.stringify([e])),{k:claveEnlacesPrueba,e});await page.goto('/vista-previa/compra/'+token);await expect(page.getByRole('heading',{name:es.DisponibilidadPrueba.vencido})).toBeVisible();await expect(page.getByRole('combobox')).toHaveCount(0);
 e.vence=new Date(Date.now()+3600000).toISOString();await page.evaluate(({k,e})=>localStorage.setItem(k,JSON.stringify([e])),{k:claveEnlacesPrueba,e});await page.goto('/vista-previa/pedidos');await page.getByRole('searchbox',{name:es.PropuestaPedidos.buscar,exact:true}).fill(e.id);await page.locator('[data-pedido="'+e.id+'"] summary').first().click();await page.getByRole('button',{name:es.DisponibilidadPrueba.cancelarEnlace,exact:true}).click();await page.waitForLoadState('networkidle');await page.goto('/vista-previa/compra/'+token);await expect(page.getByRole('heading',{name:es.DisponibilidadPrueba.enlaceCancelado})).toBeVisible();
});
