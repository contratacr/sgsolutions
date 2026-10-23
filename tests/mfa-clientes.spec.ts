import {test,expect,type Page} from '@playwright/test';import es from '../messages/es.json';import en from '../messages/en.json';
const mfa=(page:Page)=>page.locator('.mfa-admin');
for(const idioma of ['es','en'] as const){
 const t=(idioma==='es'?es:en).CuentaCliente;
 for(const metodo of ['correo','google'] as const)test(`cliente normal por ${metodo} sin MFA ${idioma}`,async({page,context,request},info)=>{
  await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);const rutasMfa:string[]=[];page.on('request',r=>{if(new URL(r.url()).pathname==='/admin/doble-factor')rutasMfa.push(r.url());});
  const antes=(await (await request.get('http://127.0.0.1:3175/__test/mfa')).json()).operacionesMfa;
  if(metodo==='google')await page.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'application/javascript',body:`window.google={accounts:{id:{initialize(c){window.configGoogle=c;},renderButton(n){const b=document.createElement('button');b.textContent='Google aislado';b.onclick=()=>window.configGoogle.callback({credential:'test-google.'+window.configGoogle.nonce+'.'+'x'.repeat(100)});n.append(b);}}}};` }));
  await page.goto('/cuenta');
  if(metodo==='correo'){await page.locator('#correo-cuenta').fill('cliente@example.test');await page.locator('#clave-cuenta').fill('Prueba!12345');await page.locator('.cuenta-enviar').click();}
  else {await expect(page.locator('.cuenta-acceso input[name=acepta]')).toHaveCount(0);await page.getByRole('button',{name:'Google aislado'}).click();}
  await expect(page.locator('.cuenta-menu-secciones')).toBeVisible();await expect(page.locator('.cuenta-admin-enlace')).toHaveCount(0);await expect(mfa(page)).toHaveCount(0);await expect(page.locator('html')).toHaveAttribute('lang',idioma);
  for(const ruta of ['/cuenta?seccion=compras','/cuenta?seccion=datos','/cuenta?seccion=seguridad','/cuenta?seccion=favoritos','/tienda']){await page.goto(ruta);await expect(mfa(page)).toHaveCount(0);expect(new URL(page.url()).pathname).not.toContain('/admin');}
  expect(rutasMfa).toEqual([]);
  await page.goto('/admin/doble-factor');await expect(page.locator('.acceso-denegado')).toBeVisible();await expect(mfa(page)).toHaveCount(0);await expect(page.locator('[name=codigo]')).toHaveCount(0);
  for(const ruta of ['/admin','/panel','/panel/pedidos']){await page.goto(ruta);await expect(page.locator('.acceso-denegado')).toBeVisible();await expect(mfa(page)).toHaveCount(0);}
  expect((await (await request.get('http://127.0.0.1:3175/__test/mfa')).json()).operacionesMfa).toBe(antes);
  await page.goto('/cuenta');await page.locator('.cuenta-salir').click();await expect(page.locator('.cuenta-acceso')).toBeVisible();await expect(mfa(page)).toHaveCount(0);await expect(page.getByRole('heading',{name:t.iniciarSesion,exact:true})).toBeVisible();
  await page.screenshot({path:`.privado/evidencias/mfa-cliente-${metodo}-${idioma}-${info.project.name}.png`,fullPage:true});
 });
 test(`rol comercial sin permisos de administrador no exige MFA ${idioma}`,async({page,context})=>{
  await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);await page.goto('/cuenta');await page.locator('#correo-cuenta').fill('comercial@example.test');await page.locator('#clave-cuenta').fill('Prueba!12345');await page.locator('.cuenta-enviar').click();await expect(page.locator('.cuenta-menu-secciones')).toBeVisible();await expect(page.locator('.cuenta-admin-enlace')).toHaveCount(0);await expect(mfa(page)).toHaveCount(0);await page.goto('/cuenta?seccion=seguridad');await expect(mfa(page)).toHaveCount(0);await page.goto('/admin/doble-factor');await expect(page.locator('.acceso-denegado')).toBeVisible();await expect(mfa(page)).toHaveCount(0);
 });
 test(`administrador con contraseña sí exige MFA ${idioma}`,async({page,context})=>{
  await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);await page.goto('/admin');await page.locator('input[name=correo]').fill('admin@example.test');await page.locator('input[name=clave]').fill('Prueba!12345');await page.getByRole('button',{name:(idioma==='es'?es:en).Acceso.entrar,exact:true}).click();await expect(page).toHaveURL(/\/admin\/doble-factor$/);await expect(mfa(page)).toBeVisible();await expect(page.getByRole('button',{name:(idioma==='es'?es:en).MfaAdmin.configurar,exact:true})).toBeVisible();await page.goto('/panel/pedidos');await expect(page).toHaveURL(/\/admin\/doble-factor$/);await expect(page.locator('.panel-modulos')).toHaveCount(0);
 });
}
