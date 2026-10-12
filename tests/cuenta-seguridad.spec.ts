import {test,expect,type BrowserContext} from '@playwright/test';
import es from '../messages/es.json';import en from '../messages/en.json';
test.skip(!process.env.SG_TEST_PERFIL,'Utiliza exclusivamente el servidor Auth aislado.');
async function sesion(context:BrowserContext,n:number,idioma:string){
 const id=`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 const token=`${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.fixture`;
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'},{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id}})).toString('base64url'),domain:'127.0.0.1',path:'/'}]);return id;
}
for(const idioma of ['es','en'] as const)test(`cuenta: menú y autogestión segura ${idioma}`,async({page,context,request},info)=>{
 const n=(idioma==='es'?5:6)+(info.project.name==='movil'?10:0),id=await sesion(context,n,idioma),t=(idioma==='es'?es:en).SeguridadCuenta;
 await page.goto('/cuenta');await expect(page.locator('.cuenta-menu-secciones a')).toHaveCount(3);await expect(page.locator('.cuenta-datos')).toHaveCount(0);
 await expect(page.locator('.cuenta-perfil')).toHaveCount(0);
 if(info.project.name==='escritorio'){
  const resumen=page.locator('.nav-cuenta-menu summary');await expect(resumen).toContainText('Ana');await resumen.click();await expect(page.locator('.nav-cuenta-desplegable')).toBeVisible();await resumen.press('Escape');await expect(page.locator('.nav-cuenta-desplegable')).not.toBeVisible();
  await resumen.click();await page.locator('.cuenta-intro h1').click();await expect(page.locator('.nav-cuenta-desplegable')).not.toBeVisible();await expect(page.locator('.cuenta-pedidos')).toBeVisible();
  // Safari puede emitir blur con relatedTarget=null antes del click del enlace.
  for(const seccion of ['datos','seguridad','compras']){
   const altoCerrado=await page.locator('.navegacion').evaluate(e=>e.getBoundingClientRect().height);
   await resumen.click();
   await expect(page.locator('.nav-cuenta-desplegable')).toHaveCSS('position','absolute');
   await expect(page.locator('.nav-cuenta-desplegable')).toHaveCSS('background-color','rgb(255, 255, 255)');
   await expect(page.locator('.nav-cuenta-desplegable a').first()).toHaveCSS('display','flex');
   expect(await page.locator('.navegacion').evaluate(e=>e.getBoundingClientRect().height)).toBe(altoCerrado);
   await page.locator(`.nav-cuenta-desplegable a[href="/cuenta?seccion=${seccion}"]`).click();
   await expect(page).toHaveURL(new RegExp(`seccion=${seccion}$`));await expect(page.locator('.nav-cuenta-desplegable')).not.toBeVisible();
  }
 }else{await expect(page.locator('.nav-cuenta-menu')).not.toBeVisible();await expect(page.locator('.cuenta-contenido')).not.toBeVisible();}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 await page.screenshot({path:`.privado/evidencias/cuenta-menu-${idioma}-${info.project.name}.png`,fullPage:true,caret:'initial'});
 await page.getByRole('link',{name:new RegExp(t.titulo)}).click();await expect(page).toHaveURL(/seccion=seguridad/);
 await page.locator('#seguridad-correo').fill(`cliente-${String(n).slice(-1)}@example.com`);await page.getByRole('button',{name:t.cambiarCorreo,exact:true}).click();await expect(page.locator('.cuenta-seguridad').getByRole('alert')).toHaveText(t.mismoCorreo);
 await page.locator('#seguridad-correo').fill(`nuevo-${n}@example.com`);await page.getByRole('button',{name:t.cambiarCorreo,exact:true}).click();await expect(page.getByRole('status')).toHaveText(t.correoEnviado);
 await expect(page.locator('.cuenta-seguridad')).toContainText(`cliente-${String(n).slice(-1)}@example.com`);
 await page.getByRole('button',{name:t.cambiarClave,exact:true}).click();await expect(page.getByRole('status').filter({hasText:t.recuperacionEnviada})).toBeVisible();
 let eventos=await (await request.get('http://127.0.0.1:3112/__test/security-events')).json();
 expect(eventos.findLast((e:{id:string;tipo:string})=>e.id===id&&e.tipo==='clave').datos.email).toBe(`cliente-${String(n).slice(-1)}@example.com`);
 expect(eventos.findLast((e:{id:string;tipo:string})=>e.id===id&&e.tipo==='correo').datos).toMatchObject({email:`nuevo-${n}@example.com`});
 await page.getByText(t.desactivarTitulo,{exact:true}).click();await page.locator('#seguridad-confirmacion').fill('otra@example.com');await page.locator('input[name=acepta]').check();await page.getByRole('button',{name:t.desactivar,exact:true}).click();await expect(page.locator('.cuenta-seguridad').getByRole('alert')).toHaveText(t.confirmarDesactivacion);
 await page.screenshot({path:`.privado/evidencias/cuenta-seguridad-${idioma}-${info.project.name}.png`,fullPage:true,caret:'initial'});
 await page.locator('#seguridad-confirmacion').fill(`cliente-${String(n).slice(-1)}@example.com`);await page.getByRole('button',{name:t.desactivar,exact:true}).click();await expect(page).toHaveURL(/desactivada=si/);await expect(page.getByRole('status')).toHaveText(t.desactivada);await expect(page.locator('.cuenta-perfil')).toHaveCount(0);
 eventos=await (await request.get('http://127.0.0.1:3112/__test/security-events')).json();expect(eventos.findLast((e:{id:string;tipo:string})=>e.id===id&&e.tipo==='desactivar').datos).toEqual({});
 await context.clearCookies();await sesion(context,9,idioma);await page.goto('/cuenta?seccion=seguridad');await page.getByText(t.desactivarTitulo,{exact:true}).click();await page.locator('#seguridad-confirmacion').fill('cliente-9@example.com');await page.locator('input[name=acepta]').check();await page.getByRole('button',{name:t.desactivar,exact:true}).click();await expect(page.locator('.cuenta-seguridad').getByRole('alert')).toHaveText(t.reautenticar);await expect(page.getByRole('button',{name:t.salirReautenticar,exact:true})).toBeVisible();
 await context.clearCookies();await sesion(context,8,idioma);await page.goto('/cuenta?seccion=seguridad');await expect(page.locator('.cuenta-desactivar')).toHaveCount(0);
 await context.clearCookies();await page.goto('/cuenta?seccion=seguridad');await expect(page.locator('.cuenta-seguridad')).toHaveCount(0);
});
