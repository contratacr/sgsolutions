import {test,expect} from '@playwright/test';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import es from '../messages/es.json';import en from '../messages/en.json';
import base from '../src/lib/catalogo-base.json';
const archivo='.privado/contenido-pruebas/catalogo.json';
test.afterEach(async()=>{await unlink(archivo).catch(()=>{});});
for(const idioma of ['es','en'] as const)test('borrador visible, publicación comprobada y ruta estable '+idioma,async({page,context},info)=>{
 const t=(idioma==='es'?es:en).AdminCatalogo,u=(idioma==='es'?es:en).AdminUX;
 await writeFile(archivo,JSON.stringify({contenido:{...base,productos:[]},revision:1}),{mode:0o600});
 const {token}=JSON.parse(await readFile('.privado/contenido-pruebas/sesion.json','utf8'));
 await context.addCookies([{name:'sg-admin-local',value:token,domain:'127.0.0.1',path:'/'},{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/panel/catalogo');await page.getByRole('button',{name:t.agregarProducto,exact:true}).click();
 const editor=page.locator('.admin-producto-editor'),guardar=page.locator('.admin-actions button').first(),estado=page.locator('.admin-actions [role=status]');
 for(const l of ['es','en'] as const){await editor.getByLabel(`${t.nombre} (${l==='es'?u.idiomaEs:u.idiomaEn})`,{exact:true}).fill('Producto QA '+l);await editor.getByLabel(`${t.descripcionCampo} (${l==='es'?u.idiomaEs:u.idiomaEn})`,{exact:true}).fill('Descripción QA '+l);}
 await guardar.click();await expect(estado).toHaveText(t.guardado);await expect(page.locator('.admin-publicacion-nota')).toHaveText(t.guardadoBorrador);
 const inicial=JSON.parse(await readFile(archivo,'utf8')),p=inicial.contenido.productos[0];expect(p.publicado).toBe(false);expect(p.slug).toBeTruthy();
 // A reload must not hide a successfully persisted draft behind the default Published filter.
 await page.reload();const fila=page.locator('.admin-producto-fila').filter({hasText:'Producto QA '+idioma});await expect(fila).toBeVisible();await expect(fila).toContainText(t.borrador);await fila.getByRole('button',{name:u.editar,exact:true}).click();
 await editor.getByLabel(t.publicado,{exact:true}).check();await guardar.click();await expect(estado).toHaveText(t.publicacionInvalida);expect(JSON.parse(await readFile(archivo,'utf8')).revision).toBe(inicial.revision);
 await editor.locator('input[type=file]').setInputFiles('public/imagenes/logo-principal.png');await expect(editor.locator('.gestor-foto')).toHaveCount(1);
 await editor.getByLabel(`${t.nombre} (${u.idiomaEs})`,{exact:true}).fill('Nombre cambiado QA');
 await editor.getByLabel(t.codigoFabricante,{exact:true}).fill('QA-GUARDADO');await editor.getByLabel(t.precioManual,{exact:false}).fill('25000');
 await guardar.click();await expect(estado).toHaveText(t.guardado);await expect(page.locator('.admin-publicacion-nota')).toHaveText(t.guardadoPublicado);
 const publicado=JSON.parse(await readFile(archivo,'utf8'));expect(publicado.revision).toBe(inicial.revision+1);expect(publicado.contenido.productos.filter((x:{origen?:string})=>x.origen==='manual')).toHaveLength(1);expect(publicado.contenido.productos[0]).toMatchObject({id:p.id,slug:p.slug,publicado:true,precioManual:25000});
 await guardar.click();await expect(estado).toHaveText(t.guardado);expect(JSON.parse(await readFile(archivo,'utf8')).contenido.productos.filter((x:{origen?:string})=>x.origen==='manual')).toHaveLength(1);
 await page.reload();await expect(page.locator('.admin-producto-fila').filter({hasText:idioma==='es'?'Nombre cambiado QA':'Producto QA en'})).toBeVisible();
 await page.goto('/tienda?q=QA-GUARDADO');const tarjeta=page.locator('.shop-producto').filter({hasText:'QA-GUARDADO'});await expect(tarjeta).toHaveCount(1);await tarjeta.locator('h3 a').click();await expect(page).toHaveURL(new RegExp('/tienda/'+p.slug+'$'));await expect(page.locator('.ficha-precio')).toContainText('25');
 await page.screenshot({path:info.outputPath('producto-publicado.png'),fullPage:true});
 // An outdated editor must never overwrite a concurrent save or report success.
 await page.goto('/panel/catalogo');await page.locator('.admin-producto-fila').filter({hasText:'QA-GUARDADO'}).getByRole('button',{name:u.editar,exact:true}).click();
 const ajeno=JSON.parse(await readFile(archivo,'utf8'));ajeno.revision++;ajeno.contenido.textos.titulo.es='Otra edición QA';await writeFile(archivo,JSON.stringify(ajeno),{mode:0o600});
 await editor.getByLabel(t.precioManual,{exact:false}).fill('26000');await guardar.click();await expect(estado).toHaveText(t.conflicto);expect(JSON.parse(await readFile(archivo,'utf8')).contenido.productos[0].precioManual).toBe(25000);
 await expect(editor.getByLabel(t.precioManual,{exact:false})).toHaveValue('26000');
});
