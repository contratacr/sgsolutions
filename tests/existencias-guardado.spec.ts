import {test,expect} from '@playwright/test';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import base from '../src/lib/catalogo-base.json';
import {esquemaCatalogo} from '../src/lib/catalogo-modelo';
import es from '../messages/es.json';import en from '../messages/en.json';
const archivo='.privado/contenido-pruebas/catalogo.json';
test.afterEach(async()=>{await unlink(archivo).catch(()=>{});});
for(const idioma of ['es','en'] as const)test('existencias sin ceros, persistencia y dos paneles '+idioma,async({page,context,browser},info)=>{
 const textos=idioma==='es'?es:en,t=textos.AdminCatalogo;
 const c=esquemaCatalogo.parse(base),p=c.productos.find(p=>p.publicado&&p.codigoEurocomp)!;
 const manual={...p,id:'manual-stock-guardado',origen:'manual' as const,codigoEurocomp:undefined,eurocomp:undefined,codigoIntcomex:undefined,proveedor:undefined,coleccion:undefined,slug:'stock-guardado',nombre:{es:'Stock QA',en:'QA stock'},codigoFabricante:'QA-GUARDADO',stockManual:0,precioManual:25000,precioDescuento:null,publicado:true};
 c.productos=[manual,{...manual,id:'manual-no-modificar',slug:'no-modificar',codigoFabricante:'QA-INTACTO',stockManual:7}];
 await writeFile(archivo,JSON.stringify({contenido:c,revision:1}));
 const {token}=JSON.parse(await readFile('.privado/contenido-pruebas/sesion.json','utf8'));
 const cookies=[{name:'sg-admin-local',value:token,domain:'127.0.0.1',path:'/'},{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}];
 const otro=await browser.newContext({viewport:page.viewportSize()??undefined});
 await context.addCookies(cookies);await otro.addCookies(cookies);
 await context.route('https://**/*',r=>r.abort());await otro.route('https://**/*',r=>r.abort());
 const segunda=await otro.newPage();
 try{
  for(const vista of [page,segunda]){
   await vista.goto('http://127.0.0.1:3124/panel/catalogo');
   await vista.locator('.admin-producto-fila').filter({hasText:'QA-GUARDADO'}).getByRole('button',{name:textos.AdminUX.editar,exact:true}).click();
  }
  const campo=page.getByLabel(t.existenciasManuales,{exact:false}),otroCampo=segunda.getByLabel(t.existenciasManuales,{exact:false});
  await expect(campo).toHaveValue('0');await campo.press('End');await campo.pressSequentially('1');await expect(campo).toHaveValue('1');
  await campo.pressSequentially('1');await expect(campo).toHaveValue('11');
  await page.route('**/panel/catalogo',async r=>{if(r.request().method()==='POST')await new Promise(res=>setTimeout(res,500));await r.continue();});
  await page.locator('.admin-actions button').first().click();
  await expect(page.locator('.admin-actions [role=status]')).toHaveText(t.guardando);
  await expect(campo).toBeDisabled();
  await expect(page.locator('.admin-actions [role=status]')).toHaveText(t.guardado);
  const guardado=JSON.parse(await readFile(archivo,'utf8'));
  expect(guardado.contenido.productos.find((x:{id:string})=>x.id===manual.id).stockManual).toBe(11);
  expect(guardado.contenido.productos.find((x:{id:string})=>x.id==='manual-no-modificar').stockManual).toBe(7);
  await segunda.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(otroCampo).toHaveValue('11');
  await otroCampo.fill('22');
  await campo.fill('33');await page.locator('.admin-actions button').first().click();await expect(page.locator('.admin-actions [role=status]')).toHaveText(t.guardado);
  await segunda.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(otroCampo).toHaveValue('22');
  await segunda.locator('.admin-actions button').first().click();await expect(segunda.locator('.admin-actions [role=status]')).toHaveText(t.conflicto);
  await page.reload();await page.locator('.admin-producto-fila').filter({hasText:'QA-GUARDADO'}).getByRole('button',{name:textos.AdminUX.editar,exact:true}).click();await expect(campo).toHaveValue('33');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await campo.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('existencias-'+idioma+'.png')});
 }finally{await otro.close();}
});
