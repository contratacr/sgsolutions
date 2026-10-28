import {test,expect} from '@playwright/test';
import {VERSION_PUBLICIDAD} from '../src/lib/campanas-modelo';
import {conteoAnonimo} from '../src/lib/estadisticas-agregadas-modelo';
import es from '../messages/es.json';import en from '../messages/en.json';
const evento={tipo:'pagina',ruta:'/tienda',detalle:'',dispositivo:'movil',idioma:'es'};
test('solo admite dimensiones cerradas, sin identidad ni contenido libre',()=>{
 expect(conteoAnonimo.safeParse(evento).success).toBe(true);
 for(const extra of [{usuario:'cuenta'},{sesion:crypto.randomUUID()},{visitante:crypto.randomUUID()},{ip:'127.0.0.1'},{campana:'identificador'},{ruta:'/cuenta'},{ruta:'/pagar/token-secreto'},{detalle:'nombre-persona'},{tipo:'scroll',detalle:'numero-telefono'}])expect(conteoAnonimo.safeParse({...evento,...extra}).success).toBe(false);
});
for(const idioma of ['es','en'] as const)test(`contadores sin cookies, identidad ni publicidad por defecto ${idioma}`,async({page,context})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 let publicidadPermitida=0;page.on('request',r=>{if(r.url().includes('/api/publicidad/contexto')&&r.postDataJSON()?.permitir===true)publicidadPermitida++;});
 const eventos:Record<string,string>[]=[];await page.route('**/api/estadisticas',async r=>{const headers=await r.request().allHeaders();expect(headers.cookie).toBeUndefined();expect(headers.authorization).toBeUndefined();expect(headers.referer).toBeUndefined();expect(headers['x-sg-conteo']).toBeTruthy();eventos.push(r.request().postDataJSON());await r.fulfill({status:204});});
 await page.goto('/?utm_campaign=persona-identificable');await expect.poll(()=>eventos.filter(e=>e.tipo==='pagina').length).toBe(1);
 await expect(page.locator('.medicion-aviso')).toBeVisible();expect(await page.evaluate(()=>Boolean(window.fbq))).toBe(false);
 expect(await page.evaluate(()=>localStorage.getItem('sg-medicion'))).toBeNull();expect(publicidadPermitida).toBe(0);
 for(const e of eventos){expect(Object.keys(e).sort()).toEqual(['detalle','dispositivo','idioma','ruta','tipo']);expect(JSON.stringify(e)).not.toContain('persona-identificable');}
 expect((await context.cookies()).some(c=>c.name==='sg-analitica')).toBe(false);
 expect(await page.evaluate(()=>[localStorage.getItem('sg-medicion-visitante'),sessionStorage.getItem('sg-medicion-sesion'),sessionStorage.getItem('sg-medicion-actividad')])).toEqual([null,null,null]);
 const antes=eventos.length;await page.goto('/admin');await expect(page.locator('h1')).toBeVisible();expect(eventos.length).toBe(antes);
 await page.goto('/privacidad');await page.getByRole('button',{name:(idioma==='es'?es:en).Analitica.rechazar,exact:true}).click();
 await page.reload();await expect(page.locator('.medicion-aviso')).toHaveCount(0);
 const guardados=eventos.filter(e=>e.tipo==='pagina').length;await page.goto('/nosotros');await expect.poll(()=>eventos.filter(e=>e.tipo==='pagina').length).toBe(guardados+1);
});
for(const idioma of ['es','en'] as const)test(`la elección de privacidad se sincroniza entre pestañas ${idioma}`,async({page,context})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 const otra=await context.newPage();await page.goto('/tienda');await otra.goto('/empresas');
 await expect(page.locator('.medicion-aviso')).toBeVisible();await expect(otra.locator('.medicion-aviso')).toBeVisible();
 await page.getByRole('button',{name:(idioma==='es'?es:en).Analitica.rechazar,exact:true}).click();
 await expect(otra.locator('.medicion-aviso')).toHaveCount(0);
 await otra.reload();await expect(otra.locator('.medicion-aviso')).toHaveCount(0);
 expect(await otra.evaluate(()=>JSON.parse(localStorage.getItem('sg-medicion')??'null')?.publicidad)).toBe(false);
});
for(const idioma of ['es','en'] as const)test(`la portada empresarial ofrece asesoría accesible por WhatsApp ${idioma}`,async({page,context})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.goto('/empresas');const accion=page.locator('.empresa-portada-acciones').getByRole('link',{name:new RegExp((idioma==='es'?es:en).Empresas.asesoriaWhatsapp)});
 await expect(accion).toBeVisible();await expect(accion).toHaveAttribute('href',/^https:\/\/wa\.me\//);
 await expect(accion).toHaveAttribute('target','_blank');await expect(accion).toHaveAttribute('rel',/noopener/);await expect(accion).toHaveAttribute('rel',/noreferrer/);
 await expect(page.locator('.empresa-portada-acciones a[href="#planes"]')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('endpoint exige mismo origen, cuerpo acotado y rechaza identificadores',async({request,baseURL})=>{
 expect((await request.post('/api/estadisticas',{data:evento})).status()).toBe(403);
 expect((await request.post('/api/estadisticas',{data:evento,headers:{Origin:'https://otro.example'}})).status()).toBe(403);
 expect((await request.post('/api/estadisticas',{data:{...evento,visitante:crypto.randomUUID()},headers:{Origin:baseURL!}})).status()).toBe(400);
 expect((await request.post('/api/estadisticas',{data:'x'.repeat(3000),headers:{Origin:baseURL!}})).status()).toBe(413);
 expect((await request.post('/api/analitica',{data:evento})).status()).toBe(410);
});
for(const idioma of ['es','en'] as const)test(`Meta separado y limpieza de identificadores antiguos ${idioma}`,async({page,context})=>{
 const t=(idioma==='es'?es:en).Analitica;
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'},{name:'sg-analitica',value:'1',domain:'127.0.0.1',path:'/'}]);
 await page.addInitScript(()=>{localStorage.setItem('sg-medicion-visitante','identificador-antiguo');sessionStorage.setItem('sg-medicion-sesion','sesion-antigua');});
 let cargas=0;const eventos:{tipo:string}[]=[];await page.route('https://connect.facebook.net/**',async r=>{cargas++;await r.fulfill({status:200,body:''});});
 await page.route('**/api/estadisticas',async r=>{eventos.push(r.request().postDataJSON());await r.fulfill({status:204});});
 await page.goto('/privacidad');await expect.poll(()=>eventos.some(e=>e.tipo==='pagina')).toBe(true);expect(cargas).toBe(0);
 expect(await page.evaluate(()=>localStorage.getItem('sg-medicion-visitante'))).toBeNull();expect(await page.evaluate(()=>sessionStorage.getItem('sg-medicion-sesion'))).toBeNull();expect((await context.cookies()).some(c=>c.name==='sg-analitica')).toBe(false);
 await expect(page.locator('.medicion-aviso')).toBeVisible();await page.getByRole('button',{name:t.aceptar,exact:true}).click();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sg-medicion')??'null')?.publicidad)).toBe(true);expect(cargas).toBe(0);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('sg-medicion')??'null')?.version)).toBe(VERSION_PUBLICIDAD);
 expect(await page.evaluate(()=>Boolean(window.fbq))).toBe(false);
 expect(eventos.filter(e=>e.tipo==='pagina')).toHaveLength(1);
 await page.locator('footer .pie-preferencias').click();await page.getByRole('button',{name:t.rechazar,exact:true}).click();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('sg-medicion')??'null')?.publicidad)).toBe(false);expect(cargas).toBe(0);
 await expect(page.locator('html')).toHaveAttribute('lang',idioma);
 await page.screenshot({path:`.privado/estadisticas-anonimas/privacidad-${test.info().project.name}-${idioma}.png`,fullPage:true});
});

test('permiso compartido, sin identificador de navegador y sin consulta de cuenta por evento',async({browser,request,baseURL})=>{
 const contextos=await Promise.all([browser.newContext(),browser.newContext()]);
 try{
  const permisos=[];
  for(const contexto of contextos){const pagina=await contexto.newPage();await pagina.goto(baseURL+'/privacidad');permisos.push(await pagina.locator('body').getAttribute('data-permiso-conteo'));}
  expect(permisos[0]).toBeTruthy();expect(permisos[0]).toBe(permisos[1]);
  const encabezados={Origin:baseURL!,'X-SG-Conteo':permisos[0]!};
  const anterior=await (await request.get('http://127.0.0.1:3123/__test/eventos')).json();
  expect((await request.post('/api/estadisticas',{headers:encabezados,data:evento})).status()).toBe(204);
  expect((await request.post('/api/estadisticas',{headers:{Origin:baseURL!},data:evento})).status()).toBe(403);
  expect((await request.post('/api/estadisticas',{headers:{...encabezados,'X-SG-Conteo':'é'.repeat(43)},data:evento})).status()).toBe(403);
  const transporte=await (await request.get('http://127.0.0.1:3123/__test/eventos')).json();
  expect(transporte.transporte).toEqual({cookie:false,referer:false,ipVisitante:false,soloServicio:true});
  // Refuse credentialed collection, without resolving or logging an account.
  expect((await request.post('/api/estadisticas',{headers:{...encabezados,Cookie:'sb-prueba-auth-token=privado'},data:evento})).status()).toBe(204);
  expect((await (await request.get('http://127.0.0.1:3123/__test/eventos')).json()).consultasCuenta).toBe(anterior.consultasCuenta);
 }finally{await Promise.all(contextos.map(c=>c.close()));}
});

 test('publicidad rechaza origen externo, contratos libres y conversiones inventadas',async({request,baseURL})=>{
 const headers={Origin:baseURL!};
 expect((await request.post('/api/publicidad/contexto',{headers:{Origin:'https://otro.example'},data:{permitir:false}})).status()).toBe(403);
 for(const data of [{permitir:true,version:'anterior',adquisicion:{canal:'directo',medio:'directo',campana:''}},{permitir:false,correo:'privado@example.test'}])expect((await request.post('/api/publicidad/contexto',{headers,data})).status()).toBe(400);
 for(const evento of ['Purchase','Lead'])expect((await request.post('/api/publicidad/evento',{headers,data:{id:crypto.randomUUID(),evento,ruta:'/tienda'}})).status()).toBe(400);
 expect((await request.post('/api/publicidad/evento',{headers,data:{id:crypto.randomUUID(),evento:'Search',ruta:'/tienda',search_string:'privado'}})).status()).toBe(400);
 expect((await request.post('/api/publicidad/evento',{headers,data:{id:crypto.randomUUID(),evento:'PageView',ruta:'/tienda'}})).status()).toBe(204);
 expect((await request.post('/api/interno/medicion/procesar')).status()).toBe(401);
 });
