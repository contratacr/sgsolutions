import {abrirCompraAprobada,limpiarAprobacionesTrasPrueba} from './aprobacion-fixture';
import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes,createHash} from 'node:crypto';
limpiarAprobacionesTrasPrueba();
test.describe.configure({mode:'serial'});
for(const idioma of ['es','en'])test(`ediciones visibles sin sesión ${idioma}`,async({page,browser})=>{
 test.skip(!process.env.SG_PRUEBA_CLAVE&&process.env.SG_TEST_ALTAS!=='1','Requiere entorno local');test.setTimeout(120000);page.setDefaultTimeout(10000);
 const rutas=['.privado/admin-local/catalogo.json','.privado/admin-local/contenido.json','.privado/admin-local/cuenta.json'];
 const respaldos=await Promise.all(rutas.map(p=>readFile(p,'utf8')));
 const publico=await browser.newContext({baseURL:String(test.info().project.use.baseURL)});await publico.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);const vista=await publico.newPage();
 const es=idioma==='es';
 const guardar=async()=>{await page.locator('.admin-actions button').first().click();await expect(page.locator('.admin-actions:visible [role=status]')).toHaveText(es?'Cambios guardados.':'Changes saved.');};
 try{
  if(process.env.SG_TEST_ALTAS==='1'){const cuenta=JSON.parse(respaldos[2]),token=randomBytes(32).toString('hex');cuenta.sesiones.push({hash:createHash('sha256').update(token).digest('hex'),vence:Date.now()+120000});await writeFile(rutas[2],JSON.stringify(cuenta),{mode:0o600});await page.context().addCookies([{name:'sg-admin-local',value:token,domain:'127.0.0.1',path:'/'},{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);}
  else{await page.goto('/admin');await page.locator('[name=correo]').fill('lsanchez@sgsolutionscr.com');await page.locator('[name=clave]').fill(process.env.SG_PRUEBA_CLAVE!);await page.locator('main form button').click();await expect(page).toHaveURL(/\/panel$/);}
  await page.goto('/panel/catalogo');await page.locator('.admin-producto-fila button').first().click();const producto=page.locator('.admin-producto-editor');
  await producto.getByRole('textbox',{name:es?'Nombre (ES)':'Name (ES)',exact:true}).first().fill('Producto QA ES');await producto.getByRole('textbox',{name:es?'Nombre (EN)':'Name (EN)',exact:true}).first().fill('Product QA EN');await producto.getByLabel(es?'Precio de referencia (₡, IVA incluido)':'Reference price (₡, VAT included)').fill('123456');await guardar();
  const catalogo=JSON.parse(respaldos[0]).contenido;const id=catalogo.productos[0].id;
  const api=await publico.request.get(`/api/catalogo?ids=${id}`);const p=(await api.json()).productos[0];expect(p.precio).toBe(123456);expect(p).not.toHaveProperty('costoUsd');
  await vista.goto(`/soluciones/${id}`);await expect(vista.locator('h1')).toHaveText(idioma==='es'?'Producto QA ES':'Product QA EN');await expect(vista.locator('.ficha-compra')).toContainText('123');
  await producto.getByLabel(es?'Publicado en Soluciones':'Published in Solutions',{exact:true}).uncheck();await guardar();expect((await (await publico.request.get(`/api/catalogo?ids=${id}`)).json()).productos).toHaveLength(0);
  await producto.getByLabel(es?'Publicado en Soluciones':'Published in Solutions',{exact:true}).check();await guardar();
  await page.getByRole('button',{name:es?'Presentación de Soluciones':'Solutions introduction',exact:true}).click();await page.getByRole('textbox',{name:es?'Título de Soluciones (ES)':'Solutions title (ES)',exact:true}).fill('Tienda QA ES');await page.getByRole('textbox',{name:es?'Título de Soluciones (EN)':'Solutions title (EN)',exact:true}).fill('Store QA EN');await guardar();await vista.goto('/soluciones');await expect(vista.locator('h1')).toHaveText(idioma==='es'?'Tienda QA ES':'Store QA EN');
  await page.goto('/panel/contenido');const caso=page.locator('details.admin-item').first();await caso.locator('summary').first().click();await caso.locator('input').first().fill('Cliente QA');await guardar();await vista.goto('/casos-de-exito');await expect(vista.getByRole('heading',{name:'Cliente QA',exact:true})).toBeVisible();
  await caso.getByLabel(es?'Publicado en Soluciones':'Published in Solutions',{exact:true}).uncheck();await guardar();await vista.reload();await expect(vista.getByRole('heading',{name:'Cliente QA',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:es?'Textos del sitio':'Site text',exact:true}).click();await page.locator('input[type=search]').fill('Entrada.descripcion');const texto=page.locator('details.admin-item').first();await texto.locator('summary').first().click();await texto.locator('textarea').nth(0).fill('Descripción de prueba ES');await texto.locator('textarea').nth(1).fill('Test description EN');await guardar();await vista.goto('/');await expect(vista.locator('main')).toContainText(idioma==='es'?'Descripción de prueba ES':'Test description EN');
  await page.getByRole('button',{name:es?'Datos de pago':'Payment details',exact:true}).click();await page.getByRole('textbox',{name:es?'Titular':'Account holder',exact:true}).fill('Titular QA');await guardar();await vista.goto(`/soluciones/${id}`);await vista.locator('.ficha-agregar').click();await abrirCompraAprobada(vista,id);await vista.locator('[value=transferencia]').check();await expect(vista.locator('.compra-cuentas')).toHaveAttribute('open','');await expect(vista.locator('main')).toContainText('Titular QA');
 }finally{await publico.close();await Promise.all(rutas.map((p,i)=>writeFile(p,respaldos[i],{mode:0o600})));}
});
