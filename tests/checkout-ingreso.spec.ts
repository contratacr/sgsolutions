import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {retornoCompra,enlaceIngresoCompra} from '../src/lib/retorno-compra';
test('retornos de compra bloquean destinos externos y parámetros ajenos',()=>{
 for(const url of ['https://example.com','//example.com/finalizar-compra','/\\example.com/finalizar-compra','/admin','/finalizar-compra?retorno=https://example.com','/finalizar-compra#otro','/finalizar-compra?asesoria=no&acceso=no'])expect(retornoCompra(url)).toBeNull();
 expect(retornoCompra('/finalizar-compra')).toBe('/finalizar-compra');
 expect(retornoCompra('/pagar')).toBe('/pagar');
 expect(retornoCompra('/pagar?retorno=https://example.com')).toBeNull();
 const destino='/finalizar-compra?asesoria=00000000-0000-4000-8000-000000000001&acceso='+'a'.repeat(64);
 expect(retornoCompra(destino)).toBe(destino);expect(new URL(enlaceIngresoCompra(destino),'https://sg.invalid').searchParams.get('retorno')).toBe(destino);
});
for(const idioma of ['es','en'])test(`acceso visible en carrito y pedido sin obligar registro ${idioma}`,async({page,context})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);await page.goto('/tienda');await page.locator('#buscar-equipo').fill('conector');await expect(page.locator('.shop-producto button.producto-agregar').first()).toBeVisible();await expect(page.locator('.shop-orden-trigger')).toBeEnabled();await page.locator('.shop-producto button').first().click();
 await page.getByRole('button',{name:idioma==='es'?'Abrir carrito':'Open cart',exact:true}).click();
 const enlace=page.locator('.carrito-ingreso');await expect(enlace).toHaveAttribute('href',enlaceIngresoCompra());await enlace.click();await expect(page).toHaveURL(/\/cuenta\?retorno=/);
 await expect(page.locator('.cuenta-formulario [name=retorno]')).toHaveValue('/pagar');
 await page.goto('/finalizar-compra');await expect(page.locator('.compra-acceso')).toBeVisible();await expect(page.locator('main form [name=nombre]')).toBeVisible();
 await expect(page.locator('.compra-acceso a')).toHaveCount(1);
 await page.locator('.compra-acceso-titulo a').click();await expect(page.locator('.cuenta-formulario [name=retorno]')).toHaveValue('/pagar');
});
test.describe('sesión real contra Auth local',()=>{
 test.skip(process.env.SG_TEST_CUENTA_LOCAL!=='1','Requiere cuenta de prueba local; nunca usa producción.');
 let usuarioId:string|undefined;
 let cuenta:{email:string;password:string};
 let admin:SupabaseClient;
 test.beforeEach(async()=>{
  const conexion=JSON.parse(fs.readFileSync(process.env.TEST_SUPABASE_CONFIG||'.privado/qa-local/conexion.json','utf8'));
  expect(['http://127.0.0.1:54321','http://127.0.0.1:55321']).toContain(conexion.API_URL);
  admin=createClient(conexion.API_URL,conexion.SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  cuenta={email:`qa-ingreso-${randomUUID()}@sgsolutions.test`,password:`Qa!${randomUUID()}Aa9`};
  const creado=await admin.auth.admin.createUser({...cuenta,email_confirm:true,user_metadata:{nombre_completo:'Ana Prueba'}});
  expect(creado.error).toBeNull();usuarioId=creado.data.user!.id;
  const perfil=await admin.from('perfiles_compra_clientes').insert({usuario_id:usuarioId,datos:{tipoIdentificacion:'fisica',identificacion:'111111111',nombre:'Ana',apellidos:'Prueba',telefono:'+50688883333',provincia:'Alajuela',canton:'Atenas',distrito:'Atenas',direccion:'DIRECCION DE PRUEBA'}});
  expect(perfil.error).toBeNull();
 });
 test.afterEach(async()=>{
  if(usuarioId){const id=usuarioId;usuarioId=undefined;const eliminado=await admin.auth.admin.deleteUser(id);expect(eliminado.error).toBeNull();const perfil=await admin.from('perfiles_compra_clientes').select('usuario_id').eq('usuario_id',id);expect(perfil.error).toBeNull();expect(perfil.data).toEqual([]);}
 });
 for(const idioma of ['es','en'])test(`correo vuelve al pedido, conserva carrito y rellena datos ${idioma}`,async({page,context,baseURL})=>{
  expect(new URL(baseURL!).hostname).toBe('127.0.0.1');
  await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);await page.goto('/tienda');await page.locator('#buscar-equipo').fill('conector');await expect(page.locator('.shop-producto button.producto-agregar').first()).toBeVisible();await expect(page.locator('.shop-orden-trigger')).toBeEnabled();await page.locator('.shop-producto button').first().click();const carrito=await page.evaluate(()=>localStorage.getItem('sg-carrito-v1'));
  await page.goto('/finalizar-compra');await page.locator('.compra-acceso-titulo>a').click();
  await page.locator('.cuenta-formulario [name=correo]').fill(cuenta.email);await page.locator('.cuenta-formulario [name=clave]').fill('Incorrecta-123!');await page.locator('.cuenta-enviar').click();await expect(page.locator('.cuenta-formulario [role=alert]')).toBeVisible();
  await page.locator('.cuenta-formulario [name=clave]').fill(cuenta.password);await page.locator('.cuenta-enviar').click();await expect(page).toHaveURL(/\/pagar$/);
  expect(await page.evaluate(()=>localStorage.getItem('sg-carrito-v1'))).toBe(carrito);await expect(page.locator('.compra-acceso')).toHaveCount(0);
  await expect(page.locator('main form [name=nombre]')).toHaveValue('Ana');await expect(page.locator('main form [name=apellidos]')).toHaveValue('Prueba');await expect(page.locator('main form [name=telefono]')).toHaveValue('+50688883333');await expect(page.locator('main form [name=correo]')).toHaveValue(cuenta.email);
  await page.locator('main form [name=modalidad][value=envio]').check();
  await expect(page.locator('main form [name=provincia]')).toHaveValue('Alajuela');await expect(page.locator('main form [name=canton]')).toHaveValue('Atenas');await expect(page.locator('main form [name=direccion]')).toHaveValue('DIRECCION DE PRUEBA');
  await page.getByRole('button',{name:idioma==='es'?'Abrir carrito':'Open cart',exact:true}).click();await expect(page.locator('.carrito-ingreso')).toHaveCount(0);
 });
});
for(const idioma of ['es','en'])test(`borrador sobrevive a ingresar, registro y regreso ${idioma}`,async({page,context})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
 await page.goto('/tienda');await page.locator('#buscar-equipo').fill('conector');await expect(page.locator('.shop-producto button.producto-agregar').first()).toBeVisible();await expect(page.locator('.shop-orden-trigger')).toBeEnabled();await page.locator('.shop-producto button').first().click();
 await page.goto('/pagar');
 await page.locator('[name=identificacion]').fill('111111111');await page.locator('[name=nombre]').fill('Nombre conservado');await page.locator('[name=apellidos]').fill('Prueba');await page.locator('[name=correo]').fill('borrador@example.com');
 await page.locator('.campo-telefono:has(input[name=telefono]) input[type=tel]').fill('88888888');
 await page.locator('input[name=modalidad][value=envio]').check();
 await page.locator('[name=provincia]').selectOption('Alajuela');await page.locator('[name=canton]').selectOption('Atenas');await page.locator('[name=distrito]').selectOption('Atenas');await page.locator('[name=direccion]').fill('Dirección conservada');
 const carrito=await page.evaluate(()=>localStorage.getItem('sg-carrito-v1'));
 await page.locator('.compra-acceso-titulo a').click();
 await expect(page.locator('.cuenta-formulario [name=retorno]')).toHaveValue('/pagar');
 await page.locator('.cuenta-cambio button').click();await expect(page.locator('.cuenta-formulario [name=modo]')).toHaveValue('registro');await expect(page.locator('.cuenta-formulario [name=retorno]')).toHaveValue('/pagar');
 await page.goBack();await expect(page.locator('[name=nombre]')).toHaveValue('Nombre conservado');
 await expect(page.locator('[name=telefono]')).toHaveValue('+50688888888');await expect(page.locator('[name=direccion]')).toHaveValue('Dirección conservada');await expect(page.locator('[name=distrito]')).toHaveValue('Atenas');
 await page.getByRole('button',{name:idioma==='es'?'Siguiente':'Next',exact:true}).click();await expect(page.locator('[data-compra-paso="1"]')).toBeVisible();
 await page.reload();await expect(page.locator('[data-compra-paso="1"]')).toBeVisible();
 // Una pestaña independiente comparte carrito, pero no el borrador con datos personales.
 const confirmacion=await context.newPage();await confirmacion.goto('/pagar');await expect(confirmacion.locator('[data-compra-paso="0"]')).toBeVisible();await expect(confirmacion.locator('[name=nombre]')).toHaveValue('');
 expect(await confirmacion.evaluate(()=>localStorage.getItem('sg-carrito-v1'))).toBe(carrito);
 await confirmacion.close();
});
