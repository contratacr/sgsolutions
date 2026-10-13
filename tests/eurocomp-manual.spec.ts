import {test,expect} from '@playwright/test';
import es from '../messages/es.json';import en from '../messages/en.json';
for(const idioma of ['es','en'] as const)test('actualización manual entre tareas horarias y protección ante fallos '+idioma,async({page,context,request})=>{
 const t=(idioma==='es'?es:en).Proveedores,sub='00000000-0000-4000-8000-000000000001';
 const jwt=[{alg:'HS256',typ:'JWT'},{sub,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.')+'.fixture';
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'},{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify({access_token:jwt,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:sub}})).toString('base64url'),domain:'127.0.0.1',path:'/'}]);
 await request.post('http://127.0.0.1:3121/__test/reset',{data:{}});
 await page.goto('/panel/proveedores');const boton=page.getByRole('button',{name:t.actualizar,exact:true});await expect(boton).toBeEnabled();await boton.click();await expect(page).toHaveURL(/resultado=actualizado$/);await expect(page.getByRole('status').filter({hasText:t.actualizado})).toBeVisible();
 let estado=await (await request.get('http://127.0.0.1:3121/__test/state')).json();expect(estado.consultas).toBe(1);expect(estado.publicaciones).toBe(1);expect(estado.visible.productos).toHaveLength(1);expect(estado.visible.productos[0].codigoEurocomp).toBe('DEMO15');expect(estado.visible.productos[0]).not.toHaveProperty('eurocomp');
 await page.getByRole('button',{name:t.actualizar,exact:true}).click();await expect(page).toHaveURL(/resultado=espera$/);await expect(page.getByRole('alert').filter({hasText:t.espera})).toBeVisible();estado=await (await request.get('http://127.0.0.1:3121/__test/state')).json();expect(estado.consultas).toBe(1);
 const guardado=estado.visible;
 for(const [modo,resultado] of [['conexion','conexion'],['vacio','respuesta'],['conflicto','conflicto']] as const){
  await request.post('http://127.0.0.1:3121/__test/reset',{data:{modo}});await page.goto('/panel/proveedores');await page.getByRole('button',{name:t.actualizar,exact:true}).click();await expect(page).toHaveURL(new RegExp('resultado='+resultado+'$'));await expect(page.getByRole('alert').filter({hasText:t[resultado]})).toBeVisible();estado=await (await request.get('http://127.0.0.1:3121/__test/state')).json();expect(estado.visible).toEqual(guardado);expect(estado.publicaciones).toBe(0);
 }
 await page.reload();await expect(page.locator('html')).toHaveAttribute('lang',idioma);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
