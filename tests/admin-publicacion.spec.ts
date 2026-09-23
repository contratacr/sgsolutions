import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
test.describe.configure({mode:'serial'});
for(const idioma of ['es','en'])test(`ediciones visibles sin sesión ${idioma}`,async({page,browser})=>{
 test.skip(!process.env.SG_PRUEBA_CLAVE,'Requiere entorno local');test.setTimeout(120000);page.setDefaultTimeout(10000);
 const rutas=['.privado/admin-local/catalogo.json','.privado/admin-local/contenido.json'];
 const respaldos=await Promise.all(rutas.map(p=>readFile(p,'utf8')));
 const publico=await browser.newContext({baseURL:String(test.info().project.use.baseURL)});await publico.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);const vista=await publico.newPage();
 const guardar=async()=>{await page.locator('.admin-actions button').first().click();await expect(page.locator('.admin-actions:visible [role=status]')).toHaveText('Cambios guardados.');};
 try{
  await page.goto('/admin');await page.locator('[name=correo]').fill('lsanchez@sgsolutionscr.com');await page.locator('[name=clave]').fill(process.env.SG_PRUEBA_CLAVE!);await page.locator('main form button').click();await expect(page).toHaveURL(/\/panel$/);
  await page.goto('/panel/catalogo');const producto=page.locator('details.admin-item').first();await producto.locator('summary').first().click();
  await producto.getByRole('textbox',{name:'Nombre (ES)',exact:true}).first().fill('Producto QA ES');await producto.getByRole('textbox',{name:'Nombre (EN)',exact:true}).first().fill('Product QA EN');await producto.getByLabel('Precio manual final (CRC, IVA incluido; opcional)',{exact:true}).fill('123456');await guardar();
  const catalogo=JSON.parse(respaldos[0]).contenido;const id=catalogo.productos[0].id;
  const api=await publico.request.get(`/api/catalogo?ids=${id}`);const p=(await api.json()).productos[0];expect(p.precio).toBe(123456);expect(p).not.toHaveProperty('costoUsd');
  await vista.goto(`/tienda/${id}`);await expect(vista.locator('h1')).toHaveText(idioma==='es'?'Producto QA ES':'Product QA EN');await expect(vista.locator('.ficha-compra')).toContainText('123');
  await producto.getByLabel('Visible en tienda',{exact:true}).uncheck();await guardar();expect((await (await publico.request.get(`/api/catalogo?ids=${id}`)).json()).productos).toHaveLength(0);
  await producto.getByLabel('Visible en tienda',{exact:true}).check();await guardar();
  await page.getByRole('button',{name:'Textos de la tienda',exact:true}).click();await page.getByRole('textbox',{name:'Título de tienda (ES)',exact:true}).fill('Tienda QA ES');await page.getByRole('textbox',{name:'Título de tienda (EN)',exact:true}).fill('Store QA EN');await guardar();await vista.goto('/tienda');await expect(vista.locator('h1')).toHaveText(idioma==='es'?'Tienda QA ES':'Store QA EN');
  await page.goto('/panel/contenido');const caso=page.locator('details.admin-item').first();await caso.locator('summary').first().click();await caso.getByRole('textbox',{name:'Nombre del cliente',exact:true}).fill('Cliente QA');await guardar();await vista.goto('/casos-de-exito');await expect(vista.getByRole('heading',{name:'Cliente QA',exact:true})).toBeVisible();
  await caso.getByLabel('Visible en tienda',{exact:true}).uncheck();await guardar();await vista.reload();await expect(vista.getByRole('heading',{name:'Cliente QA',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Textos del sitio',exact:true}).click();await page.locator('input[type=search]').fill('Entrada.descripcion');const texto=page.locator('details.admin-item').first();await texto.locator('summary').first().click();await texto.locator('textarea').nth(0).fill('Descripción de prueba ES');await texto.locator('textarea').nth(1).fill('Test description EN');await guardar();await vista.goto('/');await expect(vista.locator('main')).toContainText(idioma==='es'?'Descripción de prueba ES':'Test description EN');
  await page.getByRole('button',{name:'Datos de pago',exact:true}).click();await page.getByRole('textbox',{name:'Titular',exact:true}).fill('Titular QA');await guardar();await vista.goto(`/tienda/${id}`);await vista.locator('.ficha-compra button').click();await vista.goto('/finalizar-compra');await vista.locator('[value=transferencia]').check();await expect(vista.locator('.compra-cuentas')).toHaveAttribute('open','');await expect(vista.locator('main')).toContainText('Titular QA');
 }finally{await publico.close();await Promise.all(rutas.map((p,i)=>writeFile(p,respaldos[i],{mode:0o600})));}
});
