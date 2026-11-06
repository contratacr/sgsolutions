import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import es from '../messages/es.json';
import en from '../messages/en.json';
for(const idioma of ['es','en'] as const)test('claridad del panel '+idioma,async({page,context},info)=>{
 test.setTimeout(120000);
 const {token}=JSON.parse(await readFile('.privado/contenido-pruebas/sesion.json','utf8'));
 await context.addCookies([{name:'sg-admin-local',value:token,domain:'127.0.0.1',path:'/'},{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.route('https://**/*',r=>r.abort());
 for(const ruta of ['/panel','/panel/catalogo','/panel/contenido','/panel/proveedores','/panel/pedidos','/panel/usuarios','/panel/soporte','/panel/estadisticas']){
  await page.goto(ruta);await expect(page.locator('h1').first()).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang',idioma);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),ruta).toBe(true);
  await page.screenshot({path:info.outputPath(ruta.replaceAll('/','-')+'.png'),fullPage:true});
 }
 await page.goto('/panel/catalogo');const t=(idioma==='es'?es:en).AdminCatalogo;
 await page.getByRole('button',{name:t.agregarProducto,exact:true}).click();
 const editor=page.locator('.admin-producto-editor');await expect(editor).toBeVisible();
 await expect(editor.getByLabel(t.codigoFabricante,{exact:true})).toBeVisible();
 await expect(editor.getByLabel(t.codigoFabricante,{exact:true})).toHaveCount(1);
 await expect(editor.getByLabel(t.existenciasManuales,{exact:false})).toBeVisible();
 await expect(editor.getByLabel(t.publicado,{exact:true})).toBeAttached();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:info.outputPath('producto.png'),fullPage:true});
});
