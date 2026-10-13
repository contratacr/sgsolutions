import {test,expect} from '@playwright/test';
test.skip(process.env.SG_TEST_GIS!=='1','Requiere el proveedor simulado de playwright.google.config.ts');
const origen='http://127.0.0.1:3120';
test('GIS rechaza peticiones cruzadas, nonce ausente, token inválido y registro sin aceptación',async({request})=>{
 const post=(data:unknown,origin=origen)=>request.post('/cuenta/google',{headers:{origin},data});
 expect((await post({accion:'preparar'},'https://otro.example')).status()).toBe(403);
 expect((await post({accion:'ingresar',credential:'x'.repeat(200)})).status()).toBe(400);
 const inicio=await post({accion:'preparar'});expect(inicio.ok()).toBeTruthy();
 expect(inicio.headers()['set-cookie']).toContain('HttpOnly');
 expect(inicio.headers()['cache-control']).toContain('no-store');
 const {nonce}=await inicio.json();expect(nonce).toMatch(/^[a-f0-9]{64}$/);
 expect((await post({accion:'ingresar',credential:'x'.repeat(200)})).status()).toBe(400);
 await post({accion:'preparar'});
 expect((await (await post({accion:'ingresar',credential:'x'.repeat(200),registro:true})).json()).error).toBe('aceptacionRequerida');
});
test('GIS crea sesión SSR con la identidad existente, restringe retorno y consume nonce',async({request})=>{
 const post=(data:unknown)=>request.post('/cuenta/google',{headers:{origin:origen},data});
 const {nonce}=await (await post({accion:'preparar'})).json();
 const credential='test-google.'+nonce+'.'+'x'.repeat(100);
 const resultado=await post({accion:'ingresar',credential,retorno:'https://otro.example'});
 expect(resultado.ok()).toBeTruthy();expect((await resultado.json()).destino).toBe('/cuenta');
 const cookie=resultado.headers()['set-cookie'];expect(cookie).toContain('auth-token');
 expect((await post({accion:'ingresar',credential})).status()).toBe(400);
 const siguiente=await (await post({accion:'preparar'})).json();
 expect((await (await post({accion:'ingresar',credential:'test-google.'+siguiente.nonce+'.'+'x'.repeat(100),retorno:'/pagar'})).json()).destino).toBe('/pagar');
});
for(const idioma of ['es','en'])test(`botón GIS y carrito se conservan al ingresar ${idioma}`,async({page,context})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:origen}]);
 await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'application/javascript',body:`window.google={accounts:{id:{initialize:function(c){this.config=c},renderButton:function(el){const c=this.config;const b=document.createElement('button');b.textContent='Google fixture';b.onclick=()=>c.callback({credential:'test-google.'+c.nonce+'.'+'x'.repeat(100)});el.appendChild(b)}}}};`}));
 await page.goto('/cuenta?retorno=%2Fpagar');
 await expect(page.locator('.cuenta-acceso-titulo')).toHaveText(idioma==='es'?'Iniciar sesión':'Sign in');
 await page.evaluate(()=>localStorage.setItem('sg-carrito-v1',JSON.stringify([{id:'eurocomp-2a118312d9683064',cantidad:2}])));
 await page.getByRole('button',{name:'Google fixture'}).click();
 await expect(page).toHaveURL(/\/pagar/);
 expect(await page.evaluate(()=>localStorage.getItem('sg-carrito-v1'))).toBe(JSON.stringify([{id:'eurocomp-2a118312d9683064',cantidad:2}]));
 const cookies=await context.cookies();expect(cookies.some(c=>c.name.includes('auth-token'))).toBeTruthy();
 await page.goto('/cuenta?seccion=compras');
 await expect(page.getByText('2 × Compra previa de prueba')).toBeVisible();
});
