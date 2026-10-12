import {test,expect} from '@playwright/test';
import es from '../messages/es.json';
import en from '../messages/en.json';
test.skip(!process.env.SG_TEST_OAUTH,'Requiere Auth simulado.');
for(const idioma of ['es','en'] as const){test(`cuenta bloqueada sin historial en ${idioma}`,async({page,context})=>{
 const sub='00000000-0000-4000-8000-000000000008';
 const jwt=`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.fixture`;
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'},{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:jwt,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:sub}})).toString('base64url'),domain:'127.0.0.1',path:'/'}]);
 const t=(idioma==='es'?es:en).CuentaCliente;
 await page.goto('/cuenta');await expect(page.locator('.cuenta-error').first()).toHaveText(t.cuentaBloqueada);
 await expect(page.locator('.cuenta-pedidos')).toHaveCount(0);
 await context.clearCookies();await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.goto('/cuenta/confirmar?error=access_denied&error_code=user_banned');
 await expect(page.locator('.cuenta-error').first()).toHaveText(t.cuentaBloqueada);
});}
