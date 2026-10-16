import {test,expect} from '@playwright/test';
import es from '../messages/es.json';import en from '../messages/en.json';
for(const idioma of ['es','en'] as const)test(`tarjeta con sesión permanece en compra y guarda perfil sin datos de tarjeta ${idioma}`,async({page,context,baseURL,request})=>{
 const t=(idioma==='es'?es:en).Compra;
 const id='00000000-0000-4000-8000-000000000051';
 const token=Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.fixture';
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!},{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id}})).toString('base64url'),url:baseURL!}]);
 await page.route('https://app.tilopay.com/sdk/v2/sdk_tpay.min.js',r=>r.fulfill({contentType:'application/javascript',body:`window.Tilopay={Init:async()=>({test:1,methods:[{id:'qa-card',name:'Card',type:'card'}]}),startPayment:async()=>{const frame=document.createElement('iframe');frame.title='3D Secure QA';document.getElementById('responseTilopay').append(frame);document.body.dataset.sdkPago='1'}}`}));
 await page.route('**/api/compra/verificar',r=>r.fulfill({json:{id:'qa',token:'qa'}}));
 let inicios=0;
 await page.route('**/api/pagos/tilopay/iniciar',async r=>{inicios++;expect(r.request().postDataJSON().sdk).toBe(true);await r.fulfill({json:{sdk:{token:'qa',amount:100,orderNumber:'qa'},metodo:'qa-card'}});});
 await page.goto('/cuenta');await page.goto('/tienda');await expect(page.locator('.shop-orden-trigger')).toBeEnabled();await page.locator('.shop-producto').first().hover();await page.locator('.producto-agregar').first().click();await page.goto('/pagar');
 await expect(page.locator('.compra-acceso')).toHaveCount(0);
 await page.locator('[name=nombre]').fill('Ana');await page.locator('[name=apellidos]').fill('Prueba');await page.locator('[name=correo]').fill('checkout@example.com');await page.locator('[name=identificacion]').fill('123456789');await page.locator('.campo-telefono input[type=tel]').fill('88888888');
 await page.getByRole('button',{name:t.pasoSiguiente,exact:true}).click();await page.getByRole('button',{name:t.pasoSiguiente,exact:true}).click();await page.locator('[name=pago][value=tarjeta]').check();
 await page.locator('#tlpy_cc_number').fill('4111111111111111');await page.locator('#tlpy_cc_expiration_date').fill('12/30');await page.locator('#tlpy_cvv').fill('123');await page.locator('[name=consentimiento]').check();
 const navigations:string[]=[],serverActions:string[]=[],bodies:string[]=[];
 page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations.push(frame.url());});
 page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).origin===baseURL){bodies.push(r.postData()??'');if(r.headers()['next-action'])serverActions.push(r.url());}});
 await page.locator('.compra-acciones-finales button[type=submit]').click();
 await expect(page.locator('body')).toHaveAttribute('data-sdk-pago','1');
 await expect(page.locator('#responseTilopay iframe')).toHaveAttribute('title','3D Secure QA');
 expect(await page.locator('#responseTilopay').evaluate(el=>el.closest('form'))).toBeNull();
 expect(navigations).toEqual([]);expect(serverActions).toEqual([]);expect(inicios).toBe(1);await expect(page).toHaveURL(/\/pagar$/);
 expect(bodies.join(' ')).not.toContain('4111111111111111');expect(bodies.join(' ')).not.toContain('tlpy_cvv');
 const profile=await(await request.get('http://127.0.0.1:3126/__test/profile')).json();expect(profile).toMatchObject({nombre:'Ana',apellidos:'Prueba'});expect(profile).not.toHaveProperty('consentimiento');expect(profile).not.toHaveProperty('tlpy_cc_number');
});

test('guardar perfil rechaza origen ajeno y una sesión ausente',async({request,baseURL})=>{
 const datos={nombre:'Ana',apellidos:'Prueba',telefono:'+50688888888'};
 const externo=await request.post('/api/cuenta/datos-compra',{headers:{Origin:'https://example.invalid'},data:datos});expect(externo.status()).toBe(403);
 const anonimo=await request.post('/api/cuenta/datos-compra',{headers:{Origin:baseURL!},data:datos});expect(anonimo.status()).toBe(401);
 const invalido=await request.post('/api/cuenta/datos-compra',{headers:{Origin:baseURL!},data:{nombre:''}});expect(invalido.status()).toBe(400);
});
