// Called only by the isolated Worker harness. Never receives production credentials.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {chromium,webkit,expect} from '@playwright/test';
import sharp from 'sharp';
export async function probarSoporteWorker({db,config,base}){
 assert.equal(config.API_URL,'http://127.0.0.1:54321');assert.equal(new URL(base).hostname,'127.0.0.1');
 const etiqueta='spt-'+randomBytes(6).toString('hex'),usuarios=[],registros={empresas:[],equipos:[],tickets:[],mantenimientos:[]};
 const clientes={};let browser;
 try{
  for(const rol of ['administrador','comercial']){
   const password=`Sg9!${randomBytes(24).toString('base64url')}`,email=`${etiqueta}-${rol}@example.invalid`;
   const alta=await db.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(alta.error);const id=alta.data.user.id;usuarios.push(id);
   assert.ifError((await db.from('perfiles').upsert({id,nombre:etiqueta,rol,activo:true})).error);
   const cliente=createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false}}),sesion=await cliente.auth.signInWithPassword({email,password});assert.ifError(sesion.error);clientes[rol]={cliente,sesion:sesion.data.session};
  }
  const anon=createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false}});
  assert.ok((await anon.from('soporte_tickets').select('id')).error);
  assert.ok((await clientes.comercial.cliente.rpc('resumen_soporte')).error);
  assert.deepEqual((await clientes.comercial.cliente.from('soporte_tickets').select('id')).data,[]);
  for(const [engine,nombre,movil] of [[chromium,'pc',false],[webkit,'movil',true]]){
   browser=await engine.launch();
   for(const idioma of ['es','en']){
    const t=JSON.parse(await readFile(`messages/${idioma}.json`,'utf8')).SoportePanel;
    const ctx=await browser.newContext({baseURL:base,...(movil?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{})}),page=await ctx.newPage(),fallos=[];
    page.on('pageerror',e=>fallos.push(e.message));
    const contexto=`${etiqueta}-${nombre}-${idioma}`,empresa='Empresa '+contexto,equipo='Equipo '+contexto,asunto='Ticket '+contexto;
    await ctx.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'},{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify(clientes.administrador.sesion)).toString('base64url'),domain:'127.0.0.1',path:'/',httpOnly:true}]);
    await page.goto(base+'/panel/soporte?tipo=empresas');await expect(page.getByRole('heading',{name:t.titulo,exact:true})).toBeVisible();
    const modal=page.getByRole('dialog'),guardar=()=>modal.getByRole('button',{name:t.guardar,exact:true}).click();
    const card=texto=>page.locator('.gestion-soporte-registros>li').filter({has:page.getByRole('heading',{name:texto,exact:true})});
    const tab=async tipo=>page.locator('.gestion-soporte-tabs').getByRole('link',{name:t[tipo],exact:true}).click();
    await page.getByRole('button',{name:t.nuevo.empresas}).click();await modal.getByLabel(t.campos.razon_social).fill(empresa);await modal.getByLabel(t.campos.identificacion).fill(contexto);await guardar();await expect(modal).toHaveCount(0);
    const em=await db.from('soporte_empresas').select('id').eq('razon_social',empresa).single();assert.ifError(em.error);registros.empresas.push(em.data.id);
    await tab('equipos');await page.getByRole('button',{name:t.nuevo.equipos}).click();await modal.getByLabel(t.campos.nombre).fill(equipo);await modal.getByLabel(t.campos.tipo).fill('Servidor');await modal.getByLabel(t.campos.numero_serie).fill(contexto);await modal.getByLabel(t.campos.empresa_id).selectOption(em.data.id);await guardar();await expect(modal).toHaveCount(0);
    const eq=await db.from('soporte_equipos').select('id').eq('numero_serie',contexto).single();assert.ifError(eq.error);registros.equipos.push(eq.data.id);
    await tab('tickets');await page.getByRole('button',{name:t.nuevo.tickets}).click();await modal.getByLabel(t.campos.asunto).fill(asunto);await modal.getByLabel(t.campos.descripcion).fill('Revisar el servidor de la empresa.');await modal.getByLabel(t.campos.empresa_id).selectOption(em.data.id);await modal.getByLabel(t.campos.equipo_id).selectOption(eq.data.id);await modal.getByLabel(t.campos.tecnico_id).selectOption(usuarios[0]);await guardar();await expect(modal).toHaveCount(0);
    const ti=await db.from('soporte_tickets').select('id,version').eq('asunto',asunto).single();assert.ifError(ti.error);registros.tickets.push(ti.data.id);
    assert.deepEqual((await clientes.comercial.cliente.from('soporte_tickets').select('*').eq('id',ti.data.id)).data,[]);
    assert.ok((await clientes.comercial.cliente.rpc('archivar_soporte',{entidad:'tickets',registro:ti.data.id,version_esperada:ti.data.version,archivar:true})).error);
    await card(asunto).locator('summary').click();const imagen=await sharp({create:{width:64,height:64,channels:3,background:'#304f72'}}).png().toBuffer();
    await card(asunto).locator('input[type=file]').setInputFiles({name:'prueba.png',mimeType:'image/png',buffer:imagen});await card(asunto).getByRole('button',{name:t.subir,exact:true}).click();const enlace=card(asunto).getByRole('link',{name:'prueba.png'});await expect(enlace).toBeVisible();
    const archivo=await db.from('soporte_adjuntos').select('ruta').eq('ticket_id',ti.data.id).single();assert.ifError(archivo.error);
    assert.ok((await anon.storage.from('soporte-privado').download(archivo.data.ruta)).error);
    assert.ok((await clientes.comercial.cliente.storage.from('soporte-privado').download(archivo.data.ruta)).error);
    const lectura=await ctx.request.get(await enlace.getAttribute('href'));assert.equal(lectura.status(),200);assert.equal(lectura.headers()['content-type'],'image/png');assert.ok(lectura.headers()['cache-control'].includes('no-store'));
    await enlace.click();await page.waitForURL(/\/api\/panel\/soporte\/adjuntos\/[a-f0-9-]+$/);assert.equal(await page.evaluate(()=>document.contentType),'image/png');await page.goBack();await expect(card(asunto)).toBeVisible();if(!await card(asunto).locator('details').evaluate(e=>e.open))await card(asunto).locator('summary').click();
    await card(asunto).getByRole('button',{name:t.editar,exact:true}).click();await modal.getByLabel(t.campos.estado).selectOption('resuelto');await guardar();await expect(modal.getByRole('alert')).toBeVisible();await modal.getByLabel(t.campos.solucion).fill('Se reemplazó el componente y se verificó.');await guardar();await expect(modal).toHaveCount(0);
    await tab('mantenimientos');await page.getByRole('button',{name:t.nuevo.mantenimientos}).click();await modal.getByLabel(t.campos.equipo_id).selectOption(eq.data.id);await modal.getByLabel(t.campos.ticket_id).selectOption(ti.data.id);await modal.getByLabel(t.campos.fecha).fill('2026-10-25');await modal.getByLabel(t.campos.descripcion).fill(contexto);await guardar();await expect(modal).toHaveCount(0);
    const mt=await db.from('soporte_mantenimientos').select('id').eq('equipo_id',eq.data.id).single();assert.ifError(mt.error);registros.mantenimientos.push(mt.data.id);
    await tab('tickets');await card(asunto).locator('summary').click();await card(asunto).getByRole('button',{name:t.archivar,exact:true}).click();await expect(card(asunto)).toHaveCount(0);await page.getByRole('link',{name:t.verArchivados,exact:true}).click();await card(asunto).locator('summary').click();await card(asunto).getByRole('button',{name:t.restaurar,exact:true}).click();await expect(card(asunto)).toHaveCount(0);
    const historial=await clientes.administrador.cliente.from('soporte_historial').select('accion').eq('registro_id',ti.data.id);assert.ifError(historial.error);assert.ok(historial.data.some(h=>h.accion==='restaurado'));
    await page.locator('.gestion-soporte-tabs').getByRole('link',{name:t.reportes,exact:true}).click();await expect(page.locator('.gestion-soporte-reporte tbody tr')).toHaveCount(6);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);assert.deepEqual(fallos,[]);
    await ctx.close();
   }
   await browser.close();browser=null;
  }
  assert.ifError((await db.from('perfiles').update({activo:false}).eq('id',usuarios[0])).error);
  assert.ok((await clientes.administrador.cliente.rpc('resumen_soporte')).error);
  console.log('PASS: support compiled Worker, real isolated Auth/Postgres/private Storage, active/inactive administrators, customer isolation, Chrome/WebKit and ES/EN.');
  return {workerCompilado:true,supabaseRealAislado:true,flujos:4,storagePrivado:true,permisosVerificados:true};
 }finally{
  if(browser)await browser.close();
  const propios=await db.from('soporte_tickets').select('id').like('asunto','Ticket '+etiqueta+'%');
  const tickets=propios.data?.map(t=>t.id)??registros.tickets;
  if(tickets.length){const archivos=await db.from('soporte_adjuntos').select('ruta').in('ticket_id',tickets);if(archivos.data?.length)assert.ifError((await db.storage.from('soporte-privado').remove(archivos.data.map(a=>a.ruta))).error);assert.ifError((await db.from('soporte_adjuntos').delete().in('ticket_id',tickets)).error);}
  // Cleanup only this run's uniquely tagged records, including partial workflows.
  for(const [tabla,campo] of [['mantenimientos','descripcion'],['tickets','asunto'],['equipos','numero_serie'],['empresas','identificacion']]){
   const campoValor=tabla==='tickets'?'Ticket '+etiqueta+'%':etiqueta+'%';const encontrados=await db.from('soporte_'+tabla).select('id').like(campo,campoValor);assert.ifError(encontrados.error);
   const ids=encontrados.data.map(r=>r.id);if(ids.length){assert.ifError((await db.from('soporte_historial').delete().eq('entidad',tabla).in('registro_id',ids)).error);assert.ifError((await db.from('soporte_'+tabla).delete().in('id',ids)).error);}
  }
  for(const id of usuarios)assert.ifError((await db.auth.admin.deleteUser(id)).error);
 }
}
