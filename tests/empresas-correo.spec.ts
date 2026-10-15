import {test,expect} from '@playwright/test';
import es from '../messages/es.json';import en from '../messages/en.json';
for(const idioma of ['es','en'] as const)test(`Empresas envía desde el sitio ${idioma}`,async({page,context,request,baseURL},info)=>{
 const correo=`cliente-${idioma}-${info.project.name}@example.com`;
 const t=(idioma==='es'?es:en).SolicitudPlan;
 await request.get('http://127.0.0.1:3151/reset');
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.goto('/empresas');await page.locator('#planes .plan button').first().click();
 const f=page.locator('.solicitud-dialog form');
 await f.locator('[name=empresa]').fill('Empresa de prueba');await f.locator('[name=nombre]').fill('Cliente Ejemplo');await f.locator('[name=correo]').fill(correo);await f.locator('input[type=tel]').fill('8888 8888');await f.locator('[name=equipos]').selectOption('1–5');await f.locator('[name=mensaje]').fill('Necesitamos soporte para nuestra empresa.');await f.locator('[name=consentimiento]').check();
 await request.get('http://127.0.0.1:3151/fallar');await f.getByRole('button',{name:t.enviar,exact:true}).click();await expect(f.getByRole('alert')).toHaveText(t.errorEnvio);await expect(f.locator('[name=empresa]')).toHaveValue('Empresa de prueba');
 await request.get('http://127.0.0.1:3151/reset');await f.getByRole('button',{name:t.enviar,exact:true}).click();
 await expect(page.getByRole('heading',{name:t.enviadoTitulo,exact:true})).toBeVisible();
 expect(context.pages()).toHaveLength(1);const correos=await(await request.get('http://127.0.0.1:3151/correos')).json();expect(correos).toHaveLength(1);expect(correos[0].replyTo.email).toBe(correo);expect(correos[0].textContent).toContain('Empresa de prueba');expect(correos[0].to[0].email).toBe('asesor@sgsolutionscr.com');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('Valida origen, datos y consentimiento antes de enviar',async({request,baseURL})=>{
 await request.get('http://127.0.0.1:3151/reset');
 expect((await request.post('/api/empresas',{headers:{origin:'https://otro.example'},data:{}})).status()).toBe(403);
 expect((await request.post('/api/empresas',{headers:{origin:baseURL!},data:{idioma:'es',consentimiento:false}})).status()).toBe(400);
 expect(await(await request.get('http://127.0.0.1:3151/correos')).json()).toHaveLength(0);
});
