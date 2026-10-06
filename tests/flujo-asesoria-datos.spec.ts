import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes,createHash} from 'node:crypto';
test.describe.configure({mode:'serial'});
test.skip(process.env.SG_TEST_ALTAS!=='1','Requiere entorno local aislado');
for(const idioma of ['es','en'])test(`datos de asesoría y compra simplificada ${idioma}`,async({page,context,request},info)=>{
 const ruta='.privado/admin-local/asesorias.json',cuentaRuta='.privado/admin-local/cuenta.json';const original=await readFile(ruta,'utf8'),originalCuenta=await readFile(cuentaRuta,'utf8');
 const cuenta=JSON.parse(originalCuenta),token=randomBytes(32).toString('hex');cuenta.sesiones.push({hash:createHash('sha256').update(token).digest('hex'),vence:Date.now()+300000});
 try{
 await writeFile(cuentaRuta,JSON.stringify(cuenta));await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'},{name:'sg-admin-local',value:token,domain:'127.0.0.1',path:'/'}]);
 const errores:string[]=[];page.on('pageerror',e=>errores.push(e.message));await page.addInitScript(()=>{window.open=()=>null;});
 await page.goto('/soluciones');await expect(page.getByText(/Prefiero que me contacten|I prefer to be contacted/)).toHaveCount(0);await expect(page.locator('.shop-producto-foto>span')).toHaveCount(0);
 await page.locator('.shop-producto .guardar-seleccion').first().click();await expect(page.locator('.carrito-confirmacion small')).toContainText(idioma==='es'?'unidad':'item');await page.locator('.carrito-confirmacion .boton-azul').click();
 await page.locator('.carrito-resumen button.boton-naranja').click();const modal=page.locator('.contacto-asesoria-modal');await expect(modal).toBeVisible();await expect(modal.locator('[name=telefono]')).toHaveValue('+506 ');
 await modal.locator('form>button').click();await expect(modal.locator('[role=alert]')).not.toHaveCount(0);await modal.locator('[name=nombre]').fill('Cliente Auditoría');await modal.locator('[name=correo]').fill('cliente@example.com');await modal.locator('[name=telefono]').fill('+506 8888 8888');await modal.locator('[name=tipoIdentificacion]').selectOption('juridica');await modal.locator('[name=identificacion]').fill('3-101-123456');await modal.locator('[name=consentimiento]').check();
 const envio=page.waitForResponse(r=>r.url().endsWith('/api/asesoria')&&r.request().method()==='POST');await modal.locator('form>button').click();expect((await envio).status()).toBe(201);await expect(modal).toHaveCount(0);await expect(page.locator('.carrito-resumen a[href^="https://wa.me/"]')).toBeVisible();
 const filas=JSON.parse(await readFile(ruta,'utf8'));const solicitud=filas.at(-1);expect(solicitud.contacto.correo).toBe('cliente@example.com');expect(solicitud.contacto.tipoIdentificacion).toBe('juridica');
 await page.goto('/panel/pedidos');const tarjeta=page.locator('.asesorias-admin:visible article').filter({hasText:'Cliente Auditoría'});await tarjeta.locator('.panel-pedido-detalle>summary').click();await tarjeta.locator('[name=confirmado]').check();await tarjeta.getByRole('button',{name:idioma==='es'?'Generar enlace de compra':'Generate checkout link',exact:true}).click();const enlace=await tarjeta.locator('textarea[readonly]').inputValue();
 await page.goto(enlace);await expect(page.locator('[name=nombre]')).toHaveValue('Cliente');await expect(page.locator('[name=apellidos]')).toHaveValue('Auditoría');await expect(page.locator('[name=correo]')).toHaveValue('cliente@example.com');await expect(page.locator('[name=telefono]')).toHaveValue('+50688888888');await expect(page.locator('[name=contacto]')).toHaveCount(0);await expect(page.locator('input[value=tarjeta]')).toHaveCount(0);
 await page.locator('[name=factura]').selectOption('electronica');await expect(page.locator('[name=identificacion]')).toHaveValue('3-101-123456');await expect(page.locator('[name=tipoIdentificacion]')).toHaveValue('juridica');await expect(page.locator('[name=correoFactura]')).toHaveValue('cliente@example.com');
 await page.locator('input[value=envio]').check();await expect(page.locator('.compra-resumen')).toContainText(/4\s?000/);
 await page.locator('input[value=transferencia]').check();await expect(page.locator('.compra-cuentas')).toBeVisible();await expect(page.locator('input[type=file]')).toBeVisible();await page.locator('input[type=file]').setInputFiles({name:'mal.txt',mimeType:'text/plain',buffer:Buffer.alloc(200)});await expect(page.locator('.compra-comprobante [role=alert]')).toBeVisible();
 await page.locator('input[type=file]').setInputFiles({name:'comprobante.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-'+ '0'.repeat(200))});await expect(page.locator('.compra-comprobante')).toContainText('comprobante.pdf');
 for(const select of await page.locator('select').all())expect(await select.evaluate(e=>getComputedStyle(e).backgroundPosition)).toContain('16px');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:`/tmp/sg-nuevo-flujo-${idioma}-${info.project.name}.png`,fullPage:true});
 await page.goto('/soporte');await expect(page.locator('.soporte-contacto-final a')).toHaveAttribute('target','_blank');await expect(page.locator('html')).toHaveAttribute('lang',idioma);
 const invalida=await request.post('/api/asesoria',{headers:{origin:'http://127.0.0.1:3107'},data:{idioma,articulos:[]}});expect(invalida.status()).toBe(400);expect(errores).toEqual([]);
 }finally{await writeFile(ruta,original);await writeFile(cuentaRuta,originalCuenta);}
});
