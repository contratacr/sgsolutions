import {test,expect} from '@playwright/test';
import {eventoAnalitica,resumirEventos} from '../src/lib/analitica-modelo';
test('los eventos rechazan información extra y rutas privadas',()=>{
 const evento={id:crypto.randomUUID(),sesion:crypto.randomUUID(),tipo:'pagina',ruta:'/tienda',detalle:'',dispositivo:'movil',idioma:'es',campana:''};
 expect(eventoAnalitica.safeParse(evento).success).toBe(true);
 for(const datos of [{...evento,correo:'persona@example.com'},{...evento,ruta:'/admin'},{...evento,tipo:'Purchase'},{...evento,detalle:'persona@example.com'}])expect(eventoAnalitica.safeParse(datos).success).toBe(false);
 expect(resumirEventos([eventoAnalitica.parse(evento)]).sesiones).toBe(1);
});
for(const idioma of ['es','en'])test(`consentimiento y exclusión de administración ${idioma}`,async({page,context})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 const eventos:Record<string,string>[]=[];await page.route('**/api/analitica',async r=>{eventos.push(r.request().postDataJSON());await r.fulfill({status:204});});
 await page.goto('/');await expect(page.locator('.medicion-aviso')).toHaveCount(0);expect(eventos).toHaveLength(0);await page.goto('/privacidad');await expect(page.locator('.pie-preferencias').locator('xpath=ancestor::section[1]')).not.toHaveAttribute('data-revelar-pendiente','');await page.locator('.pie-preferencias').click();await expect(page.locator('.medicion-aviso')).toBeVisible();
 await page.getByRole('button',{name:idioma==='es'?'Solo estadísticas':'Analytics only',exact:true}).click();
 await expect.poll(()=>eventos.filter(e=>e.tipo==='pagina').length).toBe(1);
 await page.goto('/empresas');await page.locator('.plan button').first().click();await expect.poll(()=>eventos.some(e=>e.tipo==='plan')).toBe(true);
 await page.getByRole('dialog').locator('.solicitud-cerrar').click();
 expect(await page.evaluate(()=>!!window.fbq)).toBe(false);
 await page.goto('/privacidad');await expect(page.locator('.pie-preferencias').locator('xpath=ancestor::section[1]')).not.toHaveAttribute('data-revelar-pendiente','');await page.locator('.pie-preferencias').click();await page.getByRole('button',{name:idioma==='es'?'Rechazar opcionales':'Reject optional tracking',exact:true}).click();
 const antes=eventos.length;await page.goto('/nosotros');await expect(page.locator('h1')).toBeVisible();expect(eventos.length).toBe(antes);
 await page.goto('/admin');await expect(page.locator('.medicion-aviso')).toHaveCount(0);expect(eventos.length).toBe(antes);
});
test('el endpoint exige origen y consentimiento',async({request})=>{
 const data={id:crypto.randomUUID(),sesion:crypto.randomUUID(),tipo:'pagina',ruta:'/',detalle:'',dispositivo:'movil',idioma:'es',campana:''};
 expect((await request.post('/api/analitica',{data})).status()).toBe(403);
 expect((await request.post('/api/analitica',{data,headers:{Origin:'https://otro.example',Cookie:'sg-analitica=1'}})).status()).toBe(403);
});
test('Meta Pixel solo inicia tras aceptar publicidad y se detiene al revocar el permiso',async({page})=>{
 let cargas=0;
 await page.route('https://connect.facebook.net/**',async ruta=>{cargas++;await ruta.fulfill({status:200,contentType:'application/javascript',body:''});});
 await page.goto('/privacidad');await expect(page.locator('.medicion-aviso')).toHaveCount(0);await expect(page.locator('.pie-preferencias').locator('xpath=ancestor::section[1]')).not.toHaveAttribute('data-revelar-pendiente','');await page.locator('.pie-preferencias').click();
 await expect(page.locator('.medicion-aviso')).toBeVisible();
 expect(cargas).toBe(0);
 expect(await page.evaluate(()=>!!(window as Window&{fbq?:unknown}).fbq)).toBe(false);
 await page.getByRole('button',{name:'Estadísticas y publicidad'}).click();
 await expect.poll(()=>cargas).toBe(1);
 const cola=await page.evaluate(()=>(window as Window&{fbq?:{queue:unknown[][]}}).fbq?.queue??[]);
 expect(cola).toContainEqual(['init','1837501974261618']);
 expect(cola.filter(evento=>evento[0]==='track'&&evento[1]==='PageView')).toHaveLength(1);
 await expect(page.locator('.pie-preferencias').locator('xpath=ancestor::section[1]')).not.toHaveAttribute('data-revelar-pendiente','');await page.locator('.pie-preferencias').click();
 await page.getByRole('button',{name:'Rechazar opcionales'}).click();
 await expect.poll(()=>page.evaluate(()=>(window as Window&{fbq?:{queue:unknown[][]}}).fbq?.queue.some(evento=>evento[0]==='consent'&&evento[1]==='revoke'))).toBe(true);
 await page.goto('/nosotros');
 expect(cargas).toBe(1);
});
for(const idioma of ['es','en'])test(`la política de privacidad explica Meta Pixel en ${idioma}`,async({page,context})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.goto('/privacidad');
 await expect(page.locator('main')).toContainText(idioma==='es'?'solo con su permiso':'only with your permission');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
for(const idioma of ['es','en'])test(`visitantes anónimos, sesiones y retirada del permiso ${idioma}`,async({page,context})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 const eventos:{sesion:string;visitante:string}[]=[];
 await context.route('**/api/analitica',async r=>{eventos.push(r.request().postDataJSON());await r.fulfill({status:204});});
 await page.goto('/privacidad');expect(await page.evaluate(()=>localStorage.getItem('sg-medicion-visitante'))).toBeNull();await expect(page.locator('.pie-preferencias').locator('xpath=ancestor::section[1]')).not.toHaveAttribute('data-revelar-pendiente','');await page.locator('.pie-preferencias').click();await page.getByRole('button',{name:idioma==='es'?'Solo estadísticas':'Analytics only',exact:true}).click();await expect.poll(()=>eventos.length).toBeGreaterThan(0);
 const inicial=eventos.at(-1)!;expect(inicial.visitante).toMatch(/^[0-9a-f-]{36}$/);expect(inicial).not.toHaveProperty('correo');expect(inicial).not.toHaveProperty('usuario');
 await page.goto('/contacto');await expect.poll(()=>eventos.at(-1)?.sesion).toBe(inicial.sesion);expect(eventos.at(-1)?.visitante).toBe(inicial.visitante);
 await page.evaluate(()=>sessionStorage.setItem('sg-medicion-actividad',String(Date.now()-31*60_000)));await page.goto('/nosotros');await expect.poll(()=>eventos.at(-1)?.sesion).not.toBe(inicial.sesion);expect(eventos.at(-1)?.visitante).toBe(inicial.visitante);
 await page.evaluate(()=>{const v=JSON.parse(localStorage.getItem('sg-medicion-visitante')!);v.vence=Date.now()-1;localStorage.setItem('sg-medicion-visitante',JSON.stringify(v));});await page.goto('/soporte');await expect.poll(()=>eventos.at(-1)?.visitante).not.toBe(inicial.visitante);
 await page.goto('/privacidad');await expect(page.locator('.pie-preferencias').locator('xpath=ancestor::section[1]')).not.toHaveAttribute('data-revelar-pendiente','');await page.locator('.pie-preferencias').click();await page.getByRole('button',{name:idioma==='es'?'Rechazar opcionales':'Reject optional tracking',exact:true}).click();expect(await page.evaluate(()=>localStorage.getItem('sg-medicion-visitante'))).toBeNull();expect(await page.evaluate(()=>sessionStorage.getItem('sg-medicion-sesion'))).toBeNull();
 const total=eventos.length;await page.goto('/contacto');await expect(page.locator('h1')).toBeVisible();expect(eventos.length).toBe(total);
});
