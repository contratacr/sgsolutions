import {test,expect,type BrowserContext} from '@playwright/test';
import es from '../messages/es.json';import en from '../messages/en.json';
import {combinarDatosCompra,esquemaPerfilCompra} from '../src/lib/perfil-compra';
test('datos de asesor tienen prioridad y el perfil no admite permisos',()=>{
 expect(combinarDatosCompra({nombre:'Guardado',telefono:'+506 88881111'},{nombre:'Asesor',telefono:''})).toEqual({nombre:'Asesor',telefono:'+506 88881111'});
 const datos=esquemaPerfilCompra.parse({nombre:'Ana',apellidos:'López',rol:'administrador',usuario_id:'otro'});expect(datos).not.toHaveProperty('rol');expect(datos).not.toHaveProperty('usuario_id');
 expect(esquemaPerfilCompra.safeParse({...datos,telefono:'abc'}).success).toBe(false);
});
test.skip(!process.env.SG_TEST_PERFIL,'Requiere servidor aislado de perfil.');
async function sesion(context:BrowserContext,numero:number,idioma:string){
 const sub=`00000000-0000-4000-8000-${String(numero).padStart(12,'0')}`;
 const jwt=`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.fixture`;
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'},{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:jwt,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:sub}})).toString('base64url'),domain:'127.0.0.1',path:'/'}]);
}
for(const idioma of ['es','en'] as const)test(`datos guardados, historial y checkout en ${idioma}`,async({page,context},info)=>{
 const n=(idioma==='es'?1:2)+(info.project.name==='movil'?2:0);await sesion(context,n,idioma);const d=(idioma==='es'?es:en).DatosCuenta,c=(idioma==='es'?es:en).Compra;
 await page.goto('/cuenta');await expect(page.getByRole('heading',{name:d.titulo})).toBeVisible();await expect(page.locator('.cuenta-pedidos')).toContainText('Producto de mi compra');
 await page.locator('#datos-telefono').fill('+506 88881111');await page.getByText(d.envio,{exact:true}).click();await page.locator('#datos-canton').fill('Atenas');await page.getByRole('button',{name:d.guardar,exact:true}).click();await expect(page.getByRole('status')).toContainText(d.guardado);
 await page.reload();await expect(page.locator('#datos-telefono')).toHaveValue('+506 88881111');await expect(page.locator('#datos-canton')).toHaveValue('Atenas');
 await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();window.scrollTo({top:0,behavior:'instant'});});
 await page.screenshot({animations:'disabled',path:`.privado/evidencias/cuenta-datos-${idioma}-${info.project.name}.png`,fullPage:true});
 await page.locator('.cuenta-pedidos').screenshot({path:`.privado/evidencias/cuenta-historial-${idioma}-${info.project.name}.png`,animations:'disabled'});
 await page.goto('/tienda');await page.locator('.shop-producto').first().getByRole('button',{name:idioma==='es'?'Agregar al carrito':'Add to cart',exact:true}).click();
 await expect(page.getByText(idioma==='es'?'Ver carrito':'View cart',{exact:true}).first()).toBeVisible();await page.goto('/finalizar-compra');
 await expect(page.locator('input[name=nombre]')).toHaveValue('Ana');await expect(page.locator('input[name=telefono]')).toHaveValue('+506 88881111');await expect(page.locator('input[name=correo]')).toHaveValue(`cliente-${n}@example.com`);await expect(page.getByRole('checkbox',{name:d.guardarProxima})).not.toBeChecked();
 await page.locator('input[name=telefono]').fill('+506 88882222');await page.getByRole('checkbox',{name:d.guardarProxima}).check();await page.locator('input[name=consentimiento]').check();await page.getByRole('button',{name:c.revisar,exact:true}).click();await expect(page.locator('.compra-aviso-datos')).toHaveText(d.guardado);
 await page.goto('/cuenta');await expect(page.locator('#datos-telefono')).toHaveValue('+506 88882222');await expect(page.locator('#datos-canton')).toHaveValue('Atenas');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 await context.clearCookies();await page.goto('/finalizar-compra');await expect(page.locator('input[name=correo]')).toHaveValue('');await expect(page.getByRole('checkbox',{name:d.guardarProxima})).toHaveCount(0);
 // Otra cuenta no hereda los datos del cliente anterior.
 await sesion(context,9,idioma);await page.goto('/cuenta');await expect(page.locator('#datos-canton')).toHaveValue('');
});
