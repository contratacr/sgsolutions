import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import es from '../messages/es.json';import en from '../messages/en.json';
for(const idioma of ['es','en'] as const)test(`soporte: empresas, equipos, tickets, mantenimiento, adjuntos y archivo ${idioma}`,async({page,context,request},info)=>{
 const t=(idioma==='es'?es:en).SoportePanel,{token}=JSON.parse(await readFile('.privado/soporte-pruebas/sesion.json','utf8'));
 await context.addCookies([{name:'sg-admin-local',value:token,domain:'127.0.0.1',path:'/'},{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 const sufijo=idioma+'-'+info.project.name,nombreEmpresa='Empresa QA '+sufijo,nombreEquipo='Servidor QA '+sufijo,asunto='Servicio QA '+sufijo;
 await page.goto('/panel/soporte?tipo=empresas');await expect(page.getByRole('heading',{name:t.titulo,exact:true})).toBeVisible();await expect(page.locator('body')).toHaveAttribute('data-excluir-medicion','1');
 const modal=page.getByRole('dialog'),guardar=()=>modal.getByRole('button',{name:t.guardar,exact:true}).click();
 const card=(texto:string)=>page.locator('.gestion-soporte-registros>li').filter({has:page.getByRole('heading',{name:texto,exact:true})});
 const tab=async(tipo:'equipos'|'tickets'|'mantenimientos')=>{await page.locator('.gestion-soporte-tabs').getByRole('link',{name:t[tipo],exact:true}).click();};
 await page.getByRole('button',{name:t.nuevo.empresas}).click();await modal.getByLabel(t.campos.razon_social).fill(nombreEmpresa);await modal.getByLabel(t.campos.identificacion).fill('QA-'+sufijo);await guardar();await expect(modal).toHaveCount(0);await expect(card(nombreEmpresa)).toBeVisible();
 await tab('equipos');await page.getByRole('button',{name:t.nuevo.equipos}).click();await modal.getByLabel(t.campos.nombre).fill(nombreEquipo);await modal.getByLabel(t.campos.tipo).fill('Servidor');await modal.getByLabel(t.campos.numero_serie).fill('SERIE-'+sufijo);await modal.getByLabel(t.campos.empresa_id).selectOption({label:nombreEmpresa});await guardar();await expect(modal).toHaveCount(0);await expect(card(nombreEquipo)).toBeVisible();
 await tab('tickets');await page.getByRole('button',{name:t.nuevo.tickets}).click();await modal.getByLabel(t.campos.asunto).fill(asunto);await modal.getByLabel(t.campos.descripcion).fill('El equipo necesita revisión técnica.');await modal.getByLabel(t.campos.empresa_id).selectOption({label:nombreEmpresa});await modal.getByLabel(t.campos.equipo_id).selectOption({label:nombreEquipo+' · SERIE-'+sufijo});await guardar();await expect(modal).toHaveCount(0);
 await card(asunto).locator('summary').click();await card(asunto).getByRole('button',{name:t.editar,exact:true}).click();await modal.getByLabel(t.campos.estado).selectOption('cerrado');await guardar();await expect(modal.getByRole('alert')).toContainText(t.mensajes.validacion);await modal.getByLabel(t.campos.solucion).fill('Se reparó y se verificó su funcionamiento.');await guardar();await expect(modal).toHaveCount(0);await expect(card(asunto)).toContainText(t.valores.cerrado);
 // Evidence stays behind the authenticated same-origin route.
 if(!await card(asunto).locator('details').getAttribute('open')){const abierto=await card(asunto).locator('details').evaluate(e=>(e as HTMLDetailsElement).open);if(!abierto)await card(asunto).locator('summary').click();}
 const imagen=await sharp({create:{width:64,height:64,channels:3,background:'#304f72'}}).png().toBuffer();
 await card(asunto).locator('input[type=file]').setInputFiles({name:'prueba.png',mimeType:'image/png',buffer:imagen});await card(asunto).getByRole('button',{name:t.subir,exact:true}).click();const enlace=card(asunto).getByRole('link',{name:'prueba.png'});await expect(enlace).toBeVisible();const href=await enlace.getAttribute('href');
 const ticket=await card(asunto).locator('input[name=ticket]').getAttribute('value');
 expect((await context.request.post('/api/panel/soporte/adjuntos',{headers:{Origin:'http://127.0.0.1:3124'},multipart:{ticket:ticket!,archivo:{name:'invalido.png',mimeType:'image/png',buffer:Buffer.from('<script>no es una imagen</script>'.repeat(10))}}})).status()).toBe(400);
 expect((await context.request.post('/api/panel/soporte/adjuntos',{headers:{Origin:'http://127.0.0.1:3124'},multipart:{ticket:ticket!,archivo:{name:'excesivo.png',mimeType:'image/png',buffer:Buffer.alloc(6*1024*1024+1)}}})).status()).toBe(413);
 const privado=await context.request.get(href!);expect(privado.status()).toBe(200);expect(privado.headers()['content-type']).toBe('image/png');expect(privado.headers()['cache-control']).toContain('no-store');expect((await request.get(href!)).status()).toBe(403);
 await tab('mantenimientos');await page.getByRole('button',{name:t.nuevo.mantenimientos}).click();await modal.getByLabel(t.campos.equipo_id).selectOption({label:nombreEquipo+' · SERIE-'+sufijo});await modal.getByLabel(t.campos.fecha).fill('2026-10-25');await modal.getByLabel(t.campos.descripcion).fill('Mantenimiento de prueba '+sufijo);await guardar();await expect(modal).toHaveCount(0);await expect(card('Mantenimiento de prueba '+sufijo)).toBeVisible();
 await tab('tickets');await card(asunto).locator('summary').click();await card(asunto).getByRole('button',{name:t.archivar,exact:true}).click();await expect(card(asunto)).toHaveCount(0);await page.getByRole('link',{name:t.verArchivados,exact:true}).click();await expect(card(asunto)).toBeVisible();await card(asunto).locator('summary').click();await card(asunto).getByRole('button',{name:t.restaurar,exact:true}).click();await expect(card(asunto)).toHaveCount(0);await page.getByRole('link',{name:t.verActivos,exact:true}).click();await expect(card(asunto)).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await expect(page.locator('html')).toHaveAttribute('lang',idioma);await page.screenshot({path:`.privado/evidencias/soporte-${sufijo}.png`,fullPage:true});
 await page.locator('.gestion-soporte-tabs').getByRole('link',{name:t.reportes,exact:true}).click();await expect(page.locator('.gestion-soporte-indicadores article')).toHaveCount(3);await expect(page.locator('.gestion-soporte-reporte tbody tr')).toHaveCount(6);
 const otroIdioma=idioma==='es'?'en':'es';await page.locator('.gestion-soporte-idioma button[value="'+otroIdioma+'"]').click();await expect(page.locator('html')).toHaveAttribute('lang',otroIdioma);await page.reload();await expect(page.locator('html')).toHaveAttribute('lang',otroIdioma);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('soporte no permite acceso anónimo ni archivos de otro origen',async({page,request,baseURL})=>{
 await page.goto('/panel/soporte');await expect(page).toHaveURL(/\/admin/);
 expect((await request.get('/api/panel/soporte/adjuntos?ticket=00000000-0000-4000-8000-000000000001')).status()).toBe(403);
 expect((await request.post('/api/panel/soporte/adjuntos',{headers:{Origin:'https://otro.example'},data:'incorrecto'})).status()).toBe(403);
 expect((await request.post('/api/panel/soporte/adjuntos',{headers:{Origin:baseURL!},data:'incorrecto'})).status()).toBe(403);
});
