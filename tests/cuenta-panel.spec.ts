import {test,expect,type BrowserContext} from '@playwright/test';
async function sesion(context:BrowserContext,idioma:string,numero=1){
 const id=`00000000-0000-4000-8000-${String(numero).padStart(12,'0')}`;
 const token=`${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.fixture`;
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'},{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id}})).toString('base64url'),domain:'127.0.0.1',path:'/'}]);
}
for(const idioma of ['es','en'])test(`cuenta y panel comparten sesión de producción y menú uniforme ${idioma}`,async({page,context},info)=>{
 await sesion(context,idioma);await page.goto('/cuenta');
 const menu=page.locator('.cuenta-menu-secciones');await expect(menu.locator(':scope>a')).toHaveCount(5);
 const admin=menu.locator('a.cuenta-admin-enlace');await expect(admin).toHaveAttribute('href','/panel');
 const salir=menu.locator('.cuenta-salir');await expect(salir).toBeVisible();
 const filas=await menu.locator(':scope>a:not([aria-current=page]),:scope>form>button').evaluateAll(es=>es.map(e=>{const s=getComputedStyle(e);return {peso:s.fontWeight,tamano:s.fontSize,color:s.color,izquierda:e.getBoundingClientRect().left};}));
 for(const f of filas)expect(f).toEqual(filas[0]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`.privado/cuenta-menu-unificado-${info.project.name}-${idioma}.png`,fullPage:true});
 await admin.click();await expect(page).toHaveURL(/\/panel$/);await expect(page.locator('.panel-modulos')).toBeVisible();
 await page.goto('/admin');await expect(page).toHaveURL(/\/panel$/);
 await expect(page.locator('html')).toHaveAttribute('lang',idioma);
 await page.goto('/cuenta');await page.locator('.cuenta-menu-secciones .cuenta-salir').click();
 await expect(page.locator('.cuenta-menu-secciones')).toHaveCount(0);
 await page.goto('/panel');await expect(page).toHaveURL(/\/admin$/);
});
test('entrar al panel sigue exigiendo sesión y permiso de administrador',async({page,context})=>{
 await page.goto('/panel');await expect(page).toHaveURL(/\/admin$/);
 await sesion(context,'es',7);await page.goto('/panel');await expect(page.locator('.panel-modulos')).toHaveCount(0);
 await expect(page).not.toHaveURL(/\/admin$/);
});

for(const idioma of ['es','en'])test(`favoritos dentro de mi cuenta conservan tarjetas y guardan equipos empresariales ${idioma}`,async({page,context,baseURL},info)=>{
 await sesion(context,idioma,idioma==='es'?11:12);
 const catalogo=await(await context.request.get('/api/catalogo?categoria=soluciones-empresariales')).json();
 const seleccion=catalogo.productos.slice(0,4);expect(seleccion).toHaveLength(4);
 const ajeno=await context.request.post('/api/favoritos',{headers:{Origin:'https://otro.example'},data:{id:seleccion[0].id,guardar:true}});expect(ajeno.status()).toBe(403);
 for(const p of seleccion){const r=await context.request.post('/api/favoritos',{headers:{Origin:baseURL!},data:{id:p.id,guardar:true}});expect(r.status()).toBe(204);}
 await page.goto('/cuenta?seccion=favoritos');const tarjetas=page.locator('.favoritos-grid .shop-producto');await expect(tarjetas).toHaveCount(4);
 for(const tarjeta of await tarjetas.all()){await expect(tarjeta.locator('.shop-producto-info .shop-codigo')).toBeVisible();await expect(tarjeta.locator('a.producto-agregar')).toHaveCount(1);}
 expect(await page.locator('.favoritos-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(info.project.name==='safari-movil'?2:3);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`.privado/favoritos-cuenta-${info.project.name}-${idioma}.png`,fullPage:true});
 await page.reload();await expect(tarjetas).toHaveCount(4);await tarjetas.first().hover();const guardado=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/favoritos'&&r.request().method()==='POST');await tarjetas.first().locator('[aria-pressed]').click();await expect(tarjetas).toHaveCount(3);expect((await guardado).status()).toBe(204);
 await page.reload();await expect(tarjetas).toHaveCount(3);await expect(page.locator('html')).toHaveAttribute('lang',idioma);
});
