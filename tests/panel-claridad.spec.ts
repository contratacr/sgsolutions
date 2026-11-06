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
  await page.screenshot({path:info.outputPath(ruta.replaceAll('/','-')+'.png'),fullPage:true,caret:'initial'});
  if(ruta==='/panel/estadisticas'){await page.getByRole('link',{name:idioma==='es'?'Todo el historial':'All time',exact:true}).click();await expect(page).toHaveURL(/dias=todo/);await expect(page.locator('nav a[aria-current=page]').filter({hasText:idioma==='es'?'Todo el historial':'All time'})).toBeVisible();}
  if(ruta==='/panel/contenido'){for(const tab of await page.locator('.admin-tabs button').all()){await tab.click();await expect(tab).toHaveAttribute('aria-pressed','true');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}}
 }
 await page.goto('/panel/catalogo');const t=(idioma==='es'?es:en).AdminCatalogo;
 await page.getByRole('button',{name:t.categorias,exact:true}).click();
 await expect(page.locator('.admin-categorias-grid .admin-item').first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:info.outputPath('categorias.png'),fullPage:true,caret:'initial'});
 await page.getByRole('button',{name:t.productos,exact:true}).click();
 await page.getByRole('button',{name:t.agregarProducto,exact:true}).click();
 const editor=page.locator('.admin-producto-editor');await expect(editor).toBeVisible();
 await expect(editor.getByLabel(t.codigoFabricante,{exact:true})).toBeVisible();
 await expect(editor.getByLabel(t.codigoFabricante,{exact:true})).toHaveCount(1);
 await expect(editor.getByLabel(t.existenciasManuales,{exact:false})).toBeVisible();
 await expect(editor.getByLabel(t.publicado,{exact:true})).toBeAttached();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await expect(editor.locator('.admin-editor-indice a')).toHaveCount(6);
 const distribucion=await editor.evaluate(el=>{
  const principal=el.querySelector('.admin-producto-principal')!.getBoundingClientRect();
  const venta=el.querySelector('.admin-producto-lateral')!.getBoundingClientRect();
  return innerWidth>850 ? venta.left>=principal.right && Math.abs(venta.top-principal.top)<2 : venta.top>=principal.bottom && Math.abs(venta.left-principal.left)<2;
 });
 expect(distribucion,'Las zonas de edición no deben superponerse').toBe(true);
 await page.screenshot({path:info.outputPath('producto.png'),fullPage:true,caret:'initial'});
});
