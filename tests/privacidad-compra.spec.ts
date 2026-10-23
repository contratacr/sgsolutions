import {test,expect} from '@playwright/test';
import es from '../messages/es.json';
import en from '../messages/en.json';
const fixture='http://127.0.0.1:3196',origen='http://127.0.0.1:3195',clave='sg-compra-borrador-v1:carrito';
for(const idioma of ['es','en']){
 test(`Google no registra sin aceptación explícita ${idioma}`,async({request})=>{
  const antes=await (await request.get(fixture+'/__test/estado')).json();
  for(const registro of [true])for(const aceptado of [undefined,false]){
   const configuracion=await request.post('/cuenta/google',{headers:{origin:origen},data:{accion:'preparar'}});const {nonce}=await configuracion.json();
   const respuesta=await request.post('/cuenta/google',{headers:{origin:origen},data:{accion:'ingresar',credential:'test-google.'+nonce+'.'+'x'.repeat(100),registro,...(aceptado===undefined?{}:{aceptado})}});
   expect(respuesta.status()).toBe(400);expect((await respuesta.json()).error).toBe('aceptacionRequerida');
  }
  const despues=await (await request.get(fixture+'/__test/estado')).json();expect(despues.tokens).toBe(antes.tokens);expect(despues.aceptaciones).toEqual(antes.aceptaciones);
 });
 test(`depura borradores antiguos, vencidos y corruptos conservando carrito y favoritos ${idioma}`,async({page,context,baseURL})=>{
  await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);await page.goto('/terminos');
  await page.evaluate(()=>{
   localStorage.setItem('sg-compra-borrador-v1:antiguo','datos personales antiguos');localStorage.setItem('sg-pago-pendiente-v1:antiguo','datos de pago antiguos');localStorage.setItem('sg-carrito-v1','[]');localStorage.setItem('sg-favoritos-v1','[]');
   sessionStorage.setItem('sg-compra-borrador-v1:vencido',JSON.stringify({fecha:Date.now()-31*60*1000,datos:{nombre:'Privado'}}));sessionStorage.setItem('sg-compra-borrador-v1:futuro',JSON.stringify({fecha:Date.now()+3600000}));sessionStorage.setItem('sg-compra-borrador-v1:corrupto','{');sessionStorage.setItem('sg-compra-borrador-v1:vigente',JSON.stringify({fecha:Date.now(),datos:{nombre:'Vigente'}}));sessionStorage.setItem('sg-pago-pendiente-v1:vencido',JSON.stringify({fecha:Date.now()-25*3600000}));
  });await page.reload();
  await expect.poll(()=>page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('sg-compra-')||k.startsWith('sg-pago-pendiente')).length)).toBe(0);
  expect(await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('sg-compra-borrador-v1:')))).toEqual(['sg-compra-borrador-v1:vigente']);
  expect(await page.evaluate(()=>sessionStorage.getItem('sg-pago-pendiente-v1:vencido'))).toBeNull();expect(await page.evaluate(()=>localStorage.getItem('sg-carrito-v1'))).toBe('[]');expect(await page.evaluate(()=>localStorage.getItem('sg-favoritos-v1'))).toBe('[]');
 });
 test(`cierre de sesión real limpia borradores de dos pestañas sin borrar carrito ${idioma}`,async({page,context,baseURL})=>{
  if(idioma==='en')await context.addInitScript(()=>{Object.defineProperty(window,'BroadcastChannel',{value:undefined});});
  await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);await page.goto('/cuenta');await page.locator('#correo-cuenta').fill('fixture@example.com');await page.locator('#clave-cuenta').fill('Ab1!xyzw');await page.locator('.cuenta-enviar').click();await expect(page.locator('.cuenta-menu-secciones')).toBeVisible();
  const otra=await context.newPage();await otra.goto('/terminos');await expect.poll(()=>otra.evaluate(()=>sessionStorage.getItem('sg-compra-cierre-visto'))).toBe('0');
  for(const pagina of [page,otra])await pagina.evaluate(clave=>{sessionStorage.setItem(clave,JSON.stringify({fecha:Date.now(),datos:{nombre:'Privado'}}));sessionStorage.setItem('sg-pago-pendiente-v1:carrito',JSON.stringify({fecha:Date.now(),pedido:'fixture'}));localStorage.setItem('sg-carrito-v1','[]');},clave);
  await page.locator('.cuenta-salir').click();await expect(page.locator('.cuenta-acceso')).toBeVisible();
  for(const pagina of [page,otra]){await pagina.bringToFront();await expect.poll(()=>pagina.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('sg-compra-borrador')||k.startsWith('sg-pago-pendiente')).length),{message:'Borradores en '+pagina.url()}).toBe(0);}
  expect(await page.evaluate(()=>localStorage.getItem('sg-carrito-v1'))).toBe('[]');
 });
 test(`caducidad periódica sin cambiar de página ${idioma}`,async({page})=>{
  await page.clock.install();await page.goto('/terminos');await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem('sg-compra-cierre-visto'))).not.toBeNull();
  await page.evaluate(clave=>sessionStorage.setItem(clave,JSON.stringify({fecha:Date.now()-31*60*1000,datos:{nombre:'Privado'}})),clave);
  await page.clock.fastForward(61000);await expect.poll(()=>page.evaluate(clave=>sessionStorage.getItem(clave),clave)).toBeNull();
 });
 test(`caducidad al recuperar foco y restauración de formulario vigente ${idioma}`,async({page,context,baseURL})=>{
  await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);await page.goto('/tienda');
  await page.evaluate(clave=>{localStorage.setItem('sg-carrito-v1',JSON.stringify([{id:'eurocomp-2a118312d9683064',cantidad:1}]));sessionStorage.setItem(clave,JSON.stringify({fecha:Date.now(),datos:{nombre:'Ana vigente',correo:'qa@example.test'},tipo:'fisica',paso:0,pago:'sinpe'}));},clave);
  await page.goto('/pagar');await expect(page.locator('[name=nombre]')).toHaveValue('Ana vigente');await page.locator('[name=nombre]').fill('Ana editada');await page.reload();await expect(page.locator('[name=nombre]')).toHaveValue('Ana editada');
  expect(await page.evaluate(clave=>localStorage.getItem(clave),clave)).toBeNull();
  await page.evaluate(clave=>{const d=JSON.parse(sessionStorage.getItem(clave)!);d.fecha=Date.now()-31*60*1000;sessionStorage.setItem(clave,JSON.stringify(d));window.dispatchEvent(new Event('focus'));},clave);
  await expect.poll(()=>page.evaluate(clave=>sessionStorage.getItem(clave),clave)).toBeNull();
 });
}
for(const idioma of ['es','en'] as const)test(`abrir términos y privacidad conserva el pedido al regresar ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);await page.goto('/tienda');
 await page.evaluate(()=>localStorage.setItem('sg-carrito-v1',JSON.stringify([{id:'eurocomp-2a118312d9683064',cantidad:1}])));await page.goto('/pagar');
 await page.locator('[name=nombre]').fill('Ana conservada');await page.locator('[name=apellidos]').fill('Prueba');await page.locator('[name=correo]').fill('qa@example.test');await page.locator('.campo-telefono:has(input[name=telefono]) input[type=tel]').fill('88888888');await page.locator('[name=identificacion]').fill('123456789');
 // Use the form's next-step submit button; its label can vary by translation.
 await page.getByRole('button',{name:(idioma==='es'?es:en).Compra.pasoSiguiente,exact:true}).click();await expect(page.locator('[data-compra-paso="1"]')).toBeVisible();
 await page.getByRole('button',{name:(idioma==='es'?es:en).Compra.pasoSiguiente,exact:true}).click();await expect(page.locator('[data-compra-paso="2"]')).toBeVisible();
 for(const ruta of ['/terminos','/privacidad']){
  await page.locator(`.compra-check:has(input[name=consentimiento]) a[href="${ruta}"]`).click();await expect(page).toHaveURL(new RegExp(ruta+'$'));
  await page.goBack();await expect(page.locator('[data-compra-paso="2"]')).toBeVisible();
  await page.locator('.compra-pasos button').first().click();await expect(page.locator('[name=nombre]')).toHaveValue('Ana conservada');await expect(page.locator('[name=correo]')).toHaveValue('qa@example.test');await expect(page.locator('[name=identificacion]')).toHaveValue('123456789');
  await page.locator('.compra-pasos button').nth(2).click();
 }
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('sg-carrito-v1')!)[0].cantidad)).toBe(1);
});
