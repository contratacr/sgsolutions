import {test,expect} from '@playwright/test';import es from '../messages/es.json';import en from '../messages/en.json';
for(const idioma of ['es','en'] as const)test('estadísticas, períodos, privacidad y fallos '+idioma,async({page,context,request})=>{
 const t=(idioma==='es'?es:en).Analitica,sub='00000000-0000-4000-8000-000000000001';const jwt=[{alg:'HS256',typ:'JWT'},{sub,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.')+'.fixture';
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'},{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:jwt,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:sub}})).toString('base64url'),domain:'127.0.0.1',path:'/'}]);
 await request.post('http://127.0.0.1:3123/__test/error',{data:{error:false}});await page.goto('/panel/estadisticas');
 await context.addCookies([{name:'sg-analitica',value:'1',domain:'127.0.0.1',path:'/'}]);
 await page.addInitScript(()=>localStorage.setItem('sg-medicion',JSON.stringify({analitica:true,publicidad:true})));
 const enviados:string[]=[];page.on('request',r=>{if(r.url().includes('/api/estadisticas'))enviados.push(r.url());});
 await page.goto('/tienda');await expect(page.locator('body')).toHaveAttribute('data-excluir-medicion','1');await expect(page.locator('.shop-orden-trigger')).toBeEnabled();expect(enviados).toHaveLength(0);expect(await page.evaluate(()=>Boolean(window.fbq))).toBe(false);
 const antes=(await (await request.get('http://127.0.0.1:3123/__test/eventos')).json()).eventos;
 const directo=await context.request.post('/api/estadisticas',{headers:{Origin:'http://127.0.0.1:3122'},data:{tipo:'pagina',ruta:'/tienda',detalle:'',dispositivo:'movil',idioma}});expect(directo.status()).toBe(204);expect((await (await request.get('http://127.0.0.1:3123/__test/eventos')).json()).eventos).toBe(antes);
 await page.goto('/panel/estadisticas');

 const tarjeta=(nombre:string)=>page.locator('main.estadisticas-panel:visible .estadisticas-tarjetas article').filter({has:page.locator('span').filter({hasText:new RegExp('^'+nombre+'$')})});
 await expect(tarjeta(t.pagina).locator('strong')).toHaveText('30');await expect(tarjeta(t.visitantes)).toHaveCount(0);await expect(tarjeta(t.visitas)).toHaveCount(0);await expect(tarjeta(t.registrados).locator('strong')).toHaveText('9');await expect(tarjeta(t.nuevosRegistros).locator('strong')).toHaveText('3');await expect(tarjeta(t.clicsContacto).locator('strong')).toHaveText('6');await expect(tarjeta(t.pedidosPagados).locator('strong')).toHaveText('2');
 for(const texto of [t.ayudaPanel,t.detalleMedicion,t.pixelListo,t.configurar])await expect(page.locator('main.estadisticas-panel:visible')).not.toContainText(texto);
 await expect(page.getByRole('heading',{name:t.masVistos,exact:true})).toBeVisible();await expect(page.locator('.estadisticas-lista').filter({has:page.getByRole('heading',{name:t.masVistos,exact:true})})).toContainText(t.accionesProducto.replace('{total}','3'));
 await expect(page.getByRole('heading',{name:t.masComprados,exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:t.categoriasVistas,exact:true})).toBeVisible();await expect(page.locator('.estadisticas-lista').filter({has:page.getByRole('heading',{name:t.categoriasVistas,exact:true})}).locator('li strong')).toHaveText('8');await expect(page.getByRole('heading',{name:t.subcategoriasVistas,exact:true})).toBeVisible();await expect(page.locator('main.estadisticas-panel')).toContainText(t.alcanceConteos);
 const comprados=page.locator('.estadisticas-lista').filter({has:page.getByRole('heading',{name:t.masComprados,exact:true})});
 await expect(comprados.locator('li strong')).toHaveText('5');
 await expect(page.getByRole('img',{name:t.graficoDescripcion.replace('{dias}','30')})).toBeVisible();await page.getByText(t.verDatos,{exact:true}).click();await expect(page.locator('.estadisticas-grafico table tbody tr')).toHaveCount(30);
 await page.getByRole('link',{name:t.periodo7,exact:true}).click();await expect(page).toHaveURL(/dias=7$/);await expect(tarjeta(t.pagina).locator('strong')).toHaveText('30');await expect(tarjeta(t.nuevosRegistros).locator('strong')).toHaveText('1');await expect(comprados.locator('li strong')).toHaveText('1');await page.reload();await expect(page.locator('html')).toHaveAttribute('lang',idioma);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:'.privado/evidencias/estadisticas-'+idioma+'-'+test.info().project.name+'.png',fullPage:true});
 await request.post('http://127.0.0.1:3123/__test/error',{data:{error:true}});await page.reload();await expect(page.locator('main.estadisticas-panel:visible').getByRole('alert')).toContainText(t.noDisponible);await expect(tarjeta(t.pagina).locator('strong')).toHaveText('—');
 await request.post('http://127.0.0.1:3123/__test/error',{data:{error:false}});await page.getByRole('link',{name:t.reintentar,exact:true}).click();await expect(tarjeta(t.pagina).locator('strong')).toHaveText('30');
});

for(const estado of ['inactivo','rol-no-disponible'])test(`no medir administración con estado ${estado}`,async({page,context,request})=>{
 const sub='00000000-0000-4000-8000-000000000001';const jwt=[{alg:'HS256',typ:'JWT'},{sub,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.')+'.fixture';
 await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:jwt,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:sub}})).toString('base64url'),domain:'127.0.0.1',path:'/'},{name:'sg-analitica',value:'1',domain:'127.0.0.1',path:'/'}]);
 await page.addInitScript(()=>localStorage.setItem('sg-medicion',JSON.stringify({analitica:true,publicidad:true})));
 await request.post('http://127.0.0.1:3123/__test/perfil',{data:{activo:false,error:estado==='rol-no-disponible'}});
 try{
  const antes=(await (await request.get('http://127.0.0.1:3123/__test/eventos')).json()).eventos;
  const enviados:string[]=[];page.on('request',r=>{if(r.url().includes('/api/estadisticas')||r.url().includes('connect.facebook.net'))enviados.push(r.url());});
  await page.goto('/');await expect(page.locator('body')).toHaveAttribute('data-excluir-medicion','1');await expect(page.locator('.inicio-camino')).toHaveCount(3);expect(enviados).toHaveLength(0);
  const r=await context.request.post('/api/estadisticas',{headers:{Origin:'http://127.0.0.1:3122'},data:{tipo:'pagina',ruta:'/tienda',detalle:'',dispositivo:'movil',idioma:'es'}});
  expect(r.status()).toBe(204);
  expect((await (await request.get('http://127.0.0.1:3123/__test/eventos')).json()).eventos).toBe(antes);
 }finally{await request.post('http://127.0.0.1:3123/__test/perfil',{data:{activo:true,error:false}});}
});

for(const idioma of ['es','en'] as const)test(`visita anónima llega al contador sin pedir permiso ${idioma}`,async({page,context,request})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 const total=async()=>(await (await request.get('http://127.0.0.1:3123/__test/eventos')).json()).eventos as number;
 const antes=await total();await page.goto('/privacidad');await expect(page.locator('h1')).toBeVisible();await expect.poll(total).toBeGreaterThan(antes);
 const guardados=await total();await page.goto('/tienda');await expect.poll(total).toBeGreaterThan(guardados);
 expect(await page.evaluate(()=>Boolean(window.fbq))).toBe(false);await expect(page.locator('.medicion-aviso')).toHaveCount(0);
});

for(const idioma of ['es','en'] as const)test(`excluye una pestaña abierta antes del ingreso y conserva la exclusión al salir ${idioma}`,async({page,context,request})=>{
 const sub='00000000-0000-4000-8000-000000000001',jwt=[{alg:'HS256',typ:'JWT'},{sub,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.')+'.fixture';
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 const total=async()=>(await (await request.get('http://127.0.0.1:3123/__test/eventos')).json()).eventos as number;
 const antes=await total();await page.goto('/nosotros');await expect.poll(total).toBeGreaterThan(antes);
 const otra=await context.newPage();await otra.goto('/privacidad');await expect(otra.locator('body')).toHaveAttribute('data-excluir-medicion','0');
 await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:jwt,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:sub}})).toString('base64url'),domain:'127.0.0.1',path:'/'}]);
 const guardados=await total();await page.bringToFront();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect.poll(()=>page.evaluate(()=>localStorage.getItem('sg-excluir-medicion'))).toBe('1');await page.locator('a[href="/tienda"]:visible').first().click();await expect(page).toHaveURL(/\/tienda$/);
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('sg-excluir-medicion'))).toBe('1');expect(await total()).toBe(guardados);
 await expect(otra.locator('body')).toHaveAttribute('data-excluir-medicion','1');await otra.close();
 await context.clearCookies({name:/^sb-/});await page.goto('/nosotros');await expect(page.locator('body')).toHaveAttribute('data-excluir-medicion','1');expect(await total()).toBe(guardados);
});

test('la exclusión administrativa no bloquea a clientes con cuenta',async({page,context,request})=>{
 const sub='00000000-0000-4000-8000-000000000007',jwt=[{alg:'HS256',typ:'JWT'},{sub,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.')+'.fixture';
 await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:jwt,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:sub}})).toString('base64url'),domain:'127.0.0.1',path:'/'}]);
 await request.post('http://127.0.0.1:3123/__test/perfil',{data:{rol:'cliente',activo:true}});
 try{
  const total=async()=>(await (await request.get('http://127.0.0.1:3123/__test/eventos')).json()).eventos as number,antes=await total();
  await page.goto('/nosotros');await expect.poll(total).toBeGreaterThan(antes);await expect(page.locator('body')).toHaveAttribute('data-excluir-medicion','0');expect(await page.evaluate(()=>localStorage.getItem('sg-excluir-medicion'))).toBeNull();
 }finally{await request.post('http://127.0.0.1:3123/__test/perfil',{data:{rol:'administrador',activo:true}});}
});
