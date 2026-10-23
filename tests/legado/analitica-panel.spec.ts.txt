import {test,expect} from '@playwright/test';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {randomBytes,createHash} from 'node:crypto';
test.describe.configure({mode:'serial'});
for(const idioma of ['es','en'])test(`eventos persistidos y panel protegido ${idioma}`,async({page,context,baseURL})=>{
 test.skip(process.env.SG_TEST_ALTAS!=='1','Servidor local aislado requerido');
 const ruta='.privado/admin-local/cuenta.json',archivo='.privado/estadisticas-agregadas-local.json';const original=await readFile(ruta,'utf8');const previo=await readFile(archivo,'utf8').catch(()=>null);const cuenta=JSON.parse(original),token=randomBytes(32).toString('hex');
 cuenta.sesiones.push({hash:createHash('sha256').update(token).digest('hex'),vence:Date.now()+120000});
 try{
  await page.goto('/panel/estadisticas');await expect(page).toHaveURL(/\/admin$/);
  await context.addCookies([{name:'sg-analitica',value:'1',domain:'127.0.0.1',path:'/'}]);
  const evento={tipo:'plan',ruta:'/empresas',detalle:'1',dispositivo:'movil',idioma:'es'};
  const post=()=>context.request.post('/api/estadisticas',{data:evento,headers:{Origin:baseURL!}});
  expect((await post()).status()).toBe(204);expect((await post()).status()).toBe(204);
  const guardados=JSON.parse(await readFile(archivo,'utf8'));expect(guardados.some((e:{tipo:string;cantidad:number})=>e.tipo==='plan'&&e.cantidad>=2)).toBe(true);expect(guardados.some((e:object)=>'sesion' in e||'visitante' in e)).toBe(false);
  await writeFile(ruta,JSON.stringify(cuenta),{mode:0o600});await context.addCookies([{name:'sg-admin-local',value:token,domain:'127.0.0.1',path:'/'},{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
  await page.goto('/panel/estadisticas');await expect(page.locator('main:visible:not([aria-busy]) h1')).toHaveText(idioma==='es'?'Estadísticas':'Analytics');await expect(page.locator('main:visible:not([aria-busy])')).toContainText(idioma==='es'?'Planes seleccionados':'Selected plans');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:`evidencias/analitica-${idioma}-${test.info().project.name}.png`,fullPage:true});
 }finally{await writeFile(ruta,original,{mode:0o600});if(previo!==null)await writeFile(archivo,previo,{mode:0o600});else await unlink(archivo).catch(()=>{});}
});
