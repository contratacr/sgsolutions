import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes,createHash} from 'node:crypto';
test.describe.configure({mode:'serial'});
for(const idioma of ['es','en'])test(`Eurocomp privado, búsqueda, paginación e idioma ${idioma}`,async({page,context})=>{
 test.skip(process.env.SG_TEST_ALTAS!=='1','Requiere panel local');
 const ruta='.privado/admin-local/cuenta.json';const original=await readFile(ruta,'utf8');const cuenta=JSON.parse(original);const token=randomBytes(32).toString('hex');
 try{
  await page.goto('/panel/proveedores');await expect(page).toHaveURL(/\/admin$/);
  cuenta.sesiones.push({hash:createHash('sha256').update(token).digest('hex'),vence:Date.now()+120000});await writeFile(ruta,JSON.stringify(cuenta),{mode:0o600});
  await context.addCookies([{name:'sg-admin-local',value:token,domain:'127.0.0.1',path:'/'},{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
  await page.goto('/panel/proveedores');await expect(page.locator('main:visible:not([aria-busy]) h1')).toHaveText(idioma==='es'?'Proveedores':'Suppliers');
  await expect(page.locator('.eurocomp-productos article')).toHaveCount(20);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:`evidencias/eurocomp-${idioma}-${test.info().project.name}.png`,fullPage:true});
  await page.getByRole('link',{name:idioma==='es'?'Siguiente':'Next',exact:true}).click();await expect(page).toHaveURL(/pagina=2/);
  const codigo=(await page.locator('.eurocomp-productos article').first().locator('p').last().textContent())!.split(':')[1].split('·')[0].trim();
  await page.locator('#buscar-proveedor').fill(codigo);await page.getByRole('button',{name:idioma==='es'?'Buscar':'Search',exact:true}).click();
  await expect(page.locator('.eurocomp-productos article').first()).toContainText(codigo);
  await page.goto('/panel/proveedores?resultado=espera');await expect(page.locator('main [role=alert]')).toContainText(idioma==='es'?'cinco minutos':'five minutes');
  await page.goto('/tienda');expect(await page.locator('main').textContent()).not.toContain(idioma==='es'?'Precio del proveedor':'Supplier price');
  await page.goto('/panel/proveedores');await expect(page.locator('html')).toHaveAttribute('lang',idioma);
 }finally{await writeFile(ruta,original,{mode:0o600});}
});
