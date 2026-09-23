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
 await page.goto('/empresas');await expect(page.locator('.medicion-aviso')).toBeVisible();expect(eventos).toHaveLength(0);
 await page.getByRole('button',{name:idioma==='es'?'Solo estadísticas':'Analytics only',exact:true}).click();
 await expect.poll(()=>eventos.filter(e=>e.tipo==='pagina').length).toBe(1);
 await page.locator('.plan button').first().click();await expect.poll(()=>eventos.some(e=>e.tipo==='plan')).toBe(true);
 await page.getByRole('dialog').locator('.solicitud-cerrar').click();
 expect(await page.evaluate(()=>!!window.fbq)).toBe(false);
 await page.locator('.medicion-preferencias').click();await page.getByRole('button',{name:idioma==='es'?'Rechazar opcionales':'Reject optional tracking',exact:true}).click();
 const antes=eventos.length;await page.goto('/nosotros');await expect(page.locator('h1')).toBeVisible();expect(eventos.length).toBe(antes);
 await page.goto('/admin');await expect(page.locator('.medicion-aviso')).toHaveCount(0);expect(eventos.length).toBe(antes);
});
test('el endpoint exige origen y consentimiento',async({request})=>{
 const data={id:crypto.randomUUID(),sesion:crypto.randomUUID(),tipo:'pagina',ruta:'/',detalle:'',dispositivo:'movil',idioma:'es',campana:''};
 expect((await request.post('/api/analitica',{data})).status()).toBe(403);
 expect((await request.post('/api/analitica',{data,headers:{Origin:'https://otro.example',Cookie:'sg-analitica=1'}})).status()).toBe(403);
});
