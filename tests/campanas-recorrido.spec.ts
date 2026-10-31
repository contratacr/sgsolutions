import {test,expect} from '@playwright/test';
import {VERSION_PREFERENCIAS_MEDICION} from '../src/lib/preferencias-medicion';
import {VERSION_PUBLICIDAD} from '../src/lib/campanas-modelo';
test('el servidor conserva fbclid y registra las señales de tienda en la base aislada',async({request})=>{
 const api=request,headers={Origin:'http://127.0.0.1:3122'};
 const origen={canal:'instagram',medio:'pago',campana:'sg_ventas_tienda_20261028'};
 const respuesta=await api.post('/api/publicidad/contexto',{headers,data:{permitir:true,version:VERSION_PUBLICIDAD,adquisicion:origen,primera:origen,fbclid:'clic_api_sintetico'}});
 expect(respuesta.status()).toBe(200);expect(await respuesta.json()).toEqual({activo:true});
 const cookie=(await api.storageState()).cookies.find(c=>c.name==='sg-publicidad');expect(cookie?.httpOnly).toBe(true);
 const r=await api.post('/api/publicidad/evento',{headers,data:{id:crypto.randomUUID(),evento:'PageView',ruta:'/tienda'}});expect(r.status()).toBe(204);
 const hitos=await (await request.get('http://127.0.0.1:3123/__test/publicidad')).json();
 const nuevos=hitos.filter((h:{contexto:{fbc?:string}})=>h.contexto.fbc?.endsWith('.clic_api_sintetico'));
 expect(nuevos.map((h:{tipo:string})=>h.tipo)).toEqual(expect.arrayContaining(['campana_visita','tienda_vista','tienda_vista_clic_meta']));
 expect(nuevos.at(-1).contexto.reciente.campana).toBe('sg_ventas_tienda_20261028');
 expect((await api.post('/api/publicidad/evento',{headers,data:{id:crypto.randomUUID(),evento:'Purchase',ruta:'/tienda'}})).status()).toBe(400);
 const revocada=await api.post('/api/publicidad/contexto',{headers,data:{permitir:false}});expect(await revocada.json()).toEqual({activo:false});
 // Inspect the HTTP client's own cookie jar, not an asynchronously mirrored
 // WebKit browser jar: this scenario exercises the server endpoints directly.
 expect((await api.storageState()).cookies.find(c=>c.name==='sg-publicidad')?.value??'').toBe('');
 await api.post('/api/publicidad/evento',{headers,data:{id:crypto.randomUUID(),evento:'PageView',ruta:'/tienda'}});
 expect((await (await request.get('http://127.0.0.1:3123/__test/publicidad')).json()).length).toBe(hitos.length);
});
for(const idioma of ['es','en'] as const)test('llegada consentida a tienda y navegación '+idioma,async({page,context})=>{
 await context.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.addInitScript(version=>localStorage.setItem('sg-medicion',JSON.stringify({version,analitica:true,publicidad:true,fecha:new Date().toISOString()})),VERSION_PREFERENCIAS_MEDICION);
 const eventos:{evento:string;ruta:string}[]=[],contextos:{fbclid?:string;adquisicion:{campana:string}}[]=[];
 await page.route('**/api/publicidad/contexto',async r=>{const body=r.request().postDataJSON();if(body.permitir)contextos.push(body);await r.fulfill({json:{activo:body.permitir===true}});});
 await page.route('**/api/publicidad/evento',async r=>{eventos.push(r.request().postDataJSON());await r.fulfill({status:204});});
 await page.goto('/tienda?utm_source=ig&utm_medium=paid_social&utm_campaign=sg_ventas_tienda_20261028&fbclid=clic_sintetico');
 await expect.poll(()=>eventos.filter(e=>e.evento==='PageView'&&e.ruta==='/tienda').length).toBe(1);
 expect(contextos[0].fbclid).toBe('clic_sintetico');expect(contextos[0].adquisicion.campana).toBe('sg_ventas_tienda_20261028');
 await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('pageshow'));});
 await expect.poll(()=>contextos.length).toBeGreaterThan(1);
 expect(eventos.filter(e=>e.evento==='PageView'&&e.ruta==='/tienda')).toHaveLength(1);
 await page.locator('a[href="/empresas"]:visible').first().click();
 await expect.poll(()=>eventos.some(e=>e.evento==='PageView'&&e.ruta==='/empresas')).toBe(true);
 expect(contextos.at(-1)?.fbclid).toBe('clic_sintetico');
 await expect(page.locator('html')).toHaveAttribute('lang',idioma);
 expect(eventos.some(e=>e.evento==='Purchase')).toBe(false);
});
for(const idioma of ['es','en'] as const)test('sin consentimiento no se envía publicidad '+idioma,async({page,context})=>{
 await context.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 const enviados:string[]=[];page.on('request',r=>{if(r.url().endsWith('/api/publicidad/evento'))enviados.push(r.url());});
 await page.goto('/tienda?fbclid=no_capturar');
 await expect(page.locator('.medicion-aviso')).toBeVisible();
 await expect(page.locator('.shop-orden-trigger')).toBeEnabled();
 expect(enviados).toHaveLength(0);expect(await page.evaluate(()=>Boolean(window.fbq))).toBe(false);
});
