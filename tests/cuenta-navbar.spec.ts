import {test,expect} from '@playwright/test';
test.skip(!process.env.SG_TEST_OAUTH,'Requiere Auth aislado de pruebas.');
for(const idioma of ['es','en'] as const){test(`etiqueta de sesión validada en ${idioma}`,async({page,context},info)=>{
 const jwt=`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:'00000000-0000-4000-8000-000000000001',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.fixture`;
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'},{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:jwt,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:'00000000-0000-4000-8000-000000000001'}})).toString('base64url'),domain:'127.0.0.1',path:'/'}]);
 await page.goto('/');
 if(info.project.name==='movil')await page.getByRole('button',{name:idioma==='es'?'Abrir menú':'Open menu'}).click();
 await expect(page.getByRole('link',{name:idioma==='es'?'Mi cuenta':'My account',exact:true}).first()).toBeVisible();
 await context.clearCookies();await page.reload();
 if(info.project.name==='movil')await page.getByRole('button',{name:'Abrir menú'}).click();
 await expect(page.getByRole('link',{name:'Ingresar',exact:true}).first()).toBeVisible();
});}
