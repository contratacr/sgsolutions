import {test,expect} from '@playwright/test';
import es from '../messages/es.json';import en from '../messages/en.json';
// Todos los pedidos son respuestas en memoria del navegador. Nunca se persisten.
for(const idioma of ['es','en'] as const)for(const cuenta of [false,true])for(const modalidad of ['retiro','envio','express'])for(const pago of ['sinpe','transferencia','tarjeta']){
 test(`${idioma} ${cuenta?'cuenta':'invitado'} ${modalidad} ${pago}`,async({page,context,baseURL,request})=>{
  await request.post('http://127.0.0.1:3126/__test/reset');
  const t=(idioma==='es'?es:en).Compra;
  await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
  if(cuenta){
   const id='00000000-0000-4000-8000-000000000051';
   const token=Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.fixture';
   await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id}})).toString('base64url'),url:baseURL!}]);
  }
  const destino='https://secure.tilopay.com/qa-payment';const pedido='/pedido/'+'a'.repeat(64);
  let verificaciones=0,creaciones=0,adjuntos=0;
  await context.route('**/*',async r=>{
   const url=new URL(r.request().url());
   if(r.request().url()===destino)return r.fulfill({contentType:'text/html',body:'<h1>Pasarela simulada: sin cargo</h1>'});
   if(url.hostname!=='127.0.0.1')return r.abort();
   if(url.pathname===pedido)return r.fulfill({contentType:'text/html',body:'<h1>Pedido simulado pendiente de revisión</h1>'});
   return r.continue();
  });
  await page.route('**/api/compra/verificar',async r=>{verificaciones++;expect(r.request().postDataJSON().articulos).toHaveLength(1);await r.fulfill({json:{id:'qa',token:'qa'}});});
  await page.route('**/api/pagos/tilopay/iniciar',async r=>{
   expect(pago).toBe('tarjeta');creaciones++;const b=r.request().postDataJSON();expect(b.datos.modalidad).toBe(modalidad);expect(b.consentimiento).toBe(true);expect(b.articulos[0].cantidad).toBe(1);await r.fulfill({json:{url:destino,pedido:'00000000-0000-4000-8000-000000000099'}});
  });
  await page.route('**/api/pedidos/manual',async r=>{creaciones++;const b=r.request().postDataJSON();expect(b.metodo).toBe(pago);expect(b.datos.modalidad).toBe(modalidad);await r.fulfill({json:{urlCorta:pedido}});});
  await page.route('**/api/pedidos/manual/comprobante',async r=>{adjuntos++;expect(r.request().postDataBuffer()?.length).toBeGreaterThan(200);await r.fulfill({json:{ok:true}});});
  await page.goto('/tienda');await page.locator('#buscar-equipo').fill('conector');await expect(page.locator('.shop-orden-trigger')).toBeEnabled();
  await expect(page.locator('.producto-agregar').first()).toBeVisible();await page.locator('.shop-producto').first().hover();await page.locator('.producto-agregar').first().click();
  await expect(page.locator('.carrito-cantidad')).toHaveText('1');await page.goto('/pagar');
  if(cuenta)await expect(page.locator('.compra-acceso')).toHaveCount(0);else await expect(page.locator('.compra-acceso')).toBeVisible();
  const monto=async()=>Number((await page.locator('.compra-total dd').innerText()).replace(/\D/g,''));await expect.poll(monto).toBeGreaterThan(0);const base=await monto();
  await page.locator('[name=nombre]').fill('Ana');await page.locator('[name=apellidos]').fill('QA matriz');await page.locator('[name=correo]').fill('qa@example.test');await page.locator('[name=identificacion]').fill('123456789');await page.locator('.campo-telefono input[type=tel]').fill('88888888');
  await page.locator(`input[name=modalidad][value=${modalidad}]`).check();
  if(modalidad!=='retiro'){await page.locator('[name=provincia]').selectOption('Alajuela');await page.locator('[name=canton]').selectOption('Atenas');await page.locator('[name=distrito]').selectOption('Atenas');await page.locator('[name=direccion]').fill('Dirección sintética QA');}
  expect(await monto()).toBe(base+(modalidad==='envio'?4000:0));
  await page.getByRole('button',{name:t.pasoSiguiente,exact:true}).click();await page.getByRole('button',{name:t.pasoSiguiente,exact:true}).click();
  await page.locator(`[name=pago][value=${pago}]`).check();
  if(pago!=='tarjeta')await page.locator('#compra-comprobante').setInputFiles({name:'qa.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n'+'.'.repeat(200))});
  await page.locator('[name=consentimiento]').check();
  await page.locator('.compra-acciones-finales button[type=submit]').click();
  if(pago!=='tarjeta'){
   await expect(page.locator('.pedido-datos')).toBeVisible();expect(creaciones).toBe(0);
   await page.getByRole('button',{name:t.completarPedido,exact:true}).click();
  }
  await expect(page).toHaveURL(pago==='tarjeta'?destino:baseURL+pedido);
  expect(verificaciones).toBe(1);expect(creaciones).toBe(1);expect(adjuntos).toBe(pago==='tarjeta'?0:1);
 });
}
for(const idioma of ['es','en'] as const)test(`resumen no muestra cero mientras recupera precios ${idioma}`,async({page,context,request,baseURL})=>{
 const t=(idioma==='es'?es:en).Compra;
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 const catalogo=await (await request.get('/api/catalogo?q=conector')).json();const producto={...catalogo.productos[0],id:'qa-precio-pendiente',precio:500};
 await page.addInitScript(()=>localStorage.setItem('sg-carrito-v1',JSON.stringify([{id:'qa-precio-pendiente',cantidad:1}])));
 let liberar!:()=>void;const pendiente=new Promise<void>(r=>{liberar=r;});
 await page.route('**/api/catalogo?ids=**',async r=>{await pendiente;await r.fulfill({json:{productos:[producto]}});});
 await page.goto('/pagar');
 await expect(page.locator('.compra-total dd')).toHaveText(t.pendiente);
 await expect(page.locator('.compra-acciones-finales button[type=submit]')).toBeDisabled();
 await expect(page.locator('.compra-acciones-finales button[type=submit]')).toContainText(t.pendiente);
 liberar();await expect(page.locator('.compra-total dd')).toHaveText(/500/);
});
