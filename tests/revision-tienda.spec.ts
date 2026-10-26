import {test,expect} from '@playwright/test';
import es from '../messages/es.json';
import en from '../messages/en.json';

for(const idioma of ['es','en'] as const){
 test(`contactos abren destinos aislados y conservan la página ${idioma}`,async({page,context,baseURL})=>{
  await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
  await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.fulfill({contentType:'text/html',body:'<h1>Destino externo simulado</h1>'}));
  await page.goto('/contacto');
  const enlaces=page.locator('.contactos-grid a[target=_blank],.ubicacion-acciones a,.contacto-redes-enlaces a');
  await expect(enlaces).toHaveCount(6);
  for(let i=0;i<await enlaces.count();i++){
   const enlace=enlaces.nth(i),url=new URL((await enlace.getAttribute('href'))!);
   expect(['wa.me','outlook.office.com','www.google.com','www.waze.com','www.facebook.com','www.instagram.com']).toContain(url.hostname);
   await expect(enlace).toHaveAttribute('rel','noopener noreferrer');await expect(enlace).toHaveAttribute('title',idioma==='es'?es.Navegacion.nuevaPestana:en.Navegacion.nuevaPestana);
   const abierto=page.waitForEvent('popup');await enlace.click();const popup=await abierto;await popup.waitForLoadState();expect(new URL(popup.url()).hostname).toBe(url.hostname);await popup.close();await expect(page).toHaveURL(/\/contacto$/);
  }
  await expect(page.locator('.contactos-grid a[href^="tel:"]')).toHaveAttribute('href',/^tel:\+506\d{8}$/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 });

 test(`validación cuenta un error por intento y reintento no duplica pago ${idioma}`,async({page,context,baseURL})=>{
  const t=(idioma==='es'?es:en).Compra,eventos:Record<string,string>[]=[];
  await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
  await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.route('**/api/medicion/permiso',r=>r.fulfill({json:{excluir:false,permiso:'fixture-only'}}));
  await page.route('**/api/estadisticas',r=>{eventos.push(r.request().postDataJSON());return r.fulfill({status:204});});
  let verificaciones=0,inicios=0,permitir=false;
  await page.route('**/api/compra/verificar',r=>{verificaciones++;return r.fulfill({json:{id:'qa',token:'qa'}});});
  await page.route('**/api/pagos/tilopay/iniciar',async r=>{inicios++;await new Promise(resolve=>setTimeout(resolve,250));return permitir?r.fulfill({json:{url:'https://secure.tilopay.com/qa-pasarela',pedido:'00000000-0000-4000-8000-000000000099'}}):r.fulfill({status:503,json:{error:'qa-no-disponible'}});});
  await page.route('https://secure.tilopay.com/qa-pasarela',r=>r.fulfill({contentType:'text/html',body:'<h1>Sin cargo</h1>'}));
  await page.goto('/tienda');await page.locator('#buscar-equipo').fill('conector');await page.locator('#buscar-equipo').press('Enter');await expect(page.locator('.producto-agregar').first()).toBeVisible();await page.locator('.shop-producto').first().hover();await page.locator('.producto-agregar').first().click();await page.goto('/pagar');
  await expect.poll(()=>eventos.some(e=>e.tipo==='pagina'&&e.ruta==='/pagar')).toBe(true);
  await page.locator('[name=nombre]').fill('Ana');await page.getByRole('button',{name:t.pasoSiguiente,exact:true}).click();
  await expect(page.locator('.aviso-formulario:visible')).toBeVisible();
  await expect.poll(()=>eventos.filter(e=>e.tipo==='formulario_error').length).toBe(1);
  expect(inicios).toBe(0);expect(verificaciones).toBe(0);
  await page.locator('[name=apellidos]').fill('QA');await page.locator('[name=correo]').fill('qa@example.test');await page.locator('[name=identificacion]').fill('123456789');await page.locator('.campo-telefono input[type=tel]').fill('88888888');
  await page.getByRole('button',{name:t.pasoSiguiente,exact:true}).click();await page.getByRole('button',{name:t.pasoSiguiente,exact:true}).click();await page.locator('[name=pago][value=tarjeta]').check();
  for(const ruta of ['/terminos','/privacidad']){
   await page.locator(`form a[href="${ruta}"]`).click();await expect(page).toHaveURL(baseURL+ ruta);await page.goBack();await expect(page.locator('[name=correo]')).toHaveValue('qa@example.test');await expect(page.locator('[name=pago][value=tarjeta]')).toBeChecked();
  }
  await page.locator('[name=consentimiento]').check();
  const boton=page.locator('.compra-acciones-finales button[type=submit]');await boton.click();await expect(page.locator('form [role=alert]').filter({hasText:t.errorPago}).first()).toBeVisible();expect(inicios).toBe(1);await expect(page.locator('[name=correo]')).toHaveValue('qa@example.test');await expect(page.locator('.carrito-cantidad')).toHaveText('1');
  permitir=true;await boton.dblclick();await expect(page).toHaveURL('https://secure.tilopay.com/qa-pasarela');expect(inicios).toBe(2);
 });
}
