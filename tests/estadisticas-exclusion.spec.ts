import {test,expect,type BrowserContext} from '@playwright/test';
async function sesion(context:BrowserContext){const sub='00000000-0000-4000-8000-000000000001',jwt=[{alg:'HS256',typ:'JWT'},{sub,role:'authenticated',aud:'authenticated',aal:'aal1',exp:Math.floor(Date.now()/1000)+3600}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.')+'.fixture';await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:jwt,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:sub}})).toString('base64url'),domain:'127.0.0.1',path:'/'}]);}
for(const idioma of ['es','en'])test(`administrador en Mi cuenta y cierre real de sesión: ${idioma}`,async({page,context,request})=>{
 await request.post('http://127.0.0.1:3173/__test/perfil',{data:{rol:'administrador',activo:true}});await sesion(context);await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 const total=async()=>(await (await request.get('http://127.0.0.1:3173/__test/eventos')).json()).eventos;
 const enviados:string[]=[];page.on('request',r=>{if(r.url().includes('/api/estadisticas'))enviados.push(r.url());});
 const antes=await total();await page.goto('/cuenta');await expect(page.locator('.cuenta-salir')).toBeVisible();await expect.poll(()=>page.evaluate(()=>localStorage.getItem('sg-excluir-medicion'))).toBe('1');
 await page.locator('.cuenta-salir').click();await expect(page.locator('.cuenta-acceso')).toBeVisible();expect((await context.cookies()).some(c=>/^sb-.*auth-token/.test(c.name))).toBe(false);
 expect((await context.cookies()).find(c=>c.name==='sg-excluir-medicion')?.value).toBe('1');
 await page.evaluate(()=>localStorage.removeItem('sg-excluir-medicion'));
 for(const ruta of ['/nosotros','/tienda','/privacidad']){await page.goto(ruta);await expect(page.locator('body')).toHaveAttribute('data-excluir-medicion','1');await expect.poll(()=>page.evaluate(()=>localStorage.getItem('sg-excluir-medicion'))).toBe('1');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));expect(await total()).toBe(antes);}
 await page.reload();await expect(page.locator('body')).toHaveAttribute('data-excluir-medicion','1');expect(await total()).toBe(antes);expect(enviados).toEqual([]);
});

test('cierre directo en servidor conserva la exclusión sin marcación JavaScript',async({browser,request,baseURL})=>{
 await request.post('http://127.0.0.1:3173/__test/perfil',{data:{rol:'administrador',activo:true}});
 const sinJs=await browser.newContext({javaScriptEnabled:false});await sesion(sinJs);const pagina=await sinJs.newPage();await pagina.goto(baseURL+'/cuenta');
 const campos=await pagina.locator('.cuenta-salir').evaluate(e=>Object.fromEntries(Array.from(e.closest('form')!.querySelectorAll('input')).map(i=>[i.name,i.value])));
 const salida=await sinJs.request.post(baseURL+'/cuenta',{headers:{Origin:baseURL!},multipart:campos,maxRedirects:0});expect(salida.status()).toBe(303);await pagina.goto(baseURL+'/cuenta');await expect(pagina.locator('.cuenta-acceso')).toBeVisible();
 const cookies=await sinJs.cookies();expect(cookies.find(c=>c.name==='sg-excluir-medicion')?.value).toBe('1');expect(cookies.some(c=>/^sb-/.test(c.name))).toBe(false);await sinJs.close();
 const nuevo=await browser.newContext();await nuevo.addCookies(cookies);const destino=await nuevo.newPage();const antes=(await (await request.get('http://127.0.0.1:3173/__test/eventos')).json()).eventos;await destino.goto(baseURL+'/tienda');await expect.poll(()=>destino.evaluate(()=>localStorage.getItem('sg-excluir-medicion'))).toBe('1');expect((await (await request.get('http://127.0.0.1:3173/__test/eventos')).json()).eventos).toBe(antes);await nuevo.close();
});

test('la cookie de exclusión también bloquea el permiso sin sesión',async({context})=>{
 await context.addCookies([{name:'sg-excluir-medicion',value:'1',domain:'127.0.0.1',path:'/',httpOnly:true}]);const permiso=await (await context.request.get('/api/medicion/permiso')).json();expect(permiso).toEqual({excluir:true,administracion:true});expect((await context.cookies()).filter(c=>c.name==='sg-excluir-medicion').map(c=>c.value)).toEqual(['1']);
});

test('el administrador queda excluido en una pestaña pública que ya estaba abierta',async({page,context,request})=>{
 await request.post('http://127.0.0.1:3173/__test/perfil',{data:{rol:'administrador',activo:true}});
 await page.goto('/nosotros');await expect(page.locator('body')).toHaveAttribute('data-excluir-medicion','0');
 const otra=await context.newPage();await sesion(context);await otra.goto('/cuenta');await expect.poll(()=>otra.evaluate(()=>localStorage.getItem('sg-excluir-medicion'))).toBe('1');await expect(page.locator('body')).toHaveAttribute('data-excluir-medicion','1');
 const antes=(await (await request.get('http://127.0.0.1:3173/__test/eventos')).json()).eventos;await otra.locator('.cuenta-salir').click();await expect(otra.locator('.cuenta-acceso')).toBeVisible();await page.reload();await expect(page.locator('body')).toHaveAttribute('data-excluir-medicion','1');expect((await (await request.get('http://127.0.0.1:3173/__test/eventos')).json()).eventos).toBe(antes);await otra.close();
});

test('clientes y visitantes anónimos sí cuentan, antes y después de cerrar sesión',async({page,context,request})=>{
 await request.post('http://127.0.0.1:3173/__test/perfil',{data:{rol:'cliente',activo:true}});await sesion(context);
 const total=async()=>(await (await request.get('http://127.0.0.1:3173/__test/eventos')).json()).eventos;
 const antes=await total();await page.goto('/nosotros');await expect.poll(total).toBeGreaterThan(antes);expect(await page.evaluate(()=>localStorage.getItem('sg-excluir-medicion'))).toBeNull();
 await page.goto('/cuenta');await page.locator('.cuenta-salir').click();await expect(page.locator('.cuenta-acceso')).toBeVisible();expect((await context.cookies()).some(c=>c.name==='sg-excluir-medicion')).toBe(false);const despues=await total();await page.goto('/tienda');await expect.poll(total).toBeGreaterThan(despues);
 await request.post('http://127.0.0.1:3173/__test/perfil',{data:{rol:'administrador',activo:true}});
});

test('un fallo al consultar el rol no habilita la medición',async({page,context,request})=>{
 await sesion(context);await request.post('http://127.0.0.1:3173/__test/perfil',{data:{error:true}});const antes=(await (await request.get('http://127.0.0.1:3173/__test/eventos')).json()).eventos;
 try{await page.goto('/nosotros');await expect(page.locator('body')).toHaveAttribute('data-excluir-medicion','1');expect(await page.evaluate(()=>document.body.dataset.permisoConteo)).toBeUndefined();expect((await (await request.get('http://127.0.0.1:3173/__test/eventos')).json()).eventos).toBe(antes);}finally{await request.post('http://127.0.0.1:3173/__test/perfil',{data:{error:false,rol:'administrador',activo:true}});}
});
