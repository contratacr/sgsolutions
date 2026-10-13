import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
test.describe('guardado automático contra Supabase local',()=>{
 test.skip(process.env.SG_TEST_CUENTA_LOCAL!=='1','Solo se ejecuta con Auth de pruebas local.');
 for(const idioma of ['es','en'])test(`guarda al revisar sin casilla y reutiliza datos ${idioma}`,async({page,context,baseURL})=>{
  expect(new URL(baseURL!).origin).toBe('http://127.0.0.1:3107');
  const conexion=JSON.parse(fs.readFileSync('.privado/qa-local/conexion.json','utf8'));expect(conexion.API_URL).toBe('http://127.0.0.1:54321');
  const admin=createClient(conexion.API_URL,conexion.SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  const email=`qa-compra-${randomUUID()}@sgsolutions.test`,password=`Prueba!${randomUUID()}Aa9`;
  const creado=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{nombre_completo:'Ana Prueba'}});expect(creado.error).toBeNull();const id=creado.data.user!.id;
  try{
   await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);await page.goto('/cuenta');await page.locator('.cuenta-formulario [name=correo]').fill(email);await page.locator('.cuenta-formulario [name=clave]').fill(password);await page.locator('.cuenta-enviar').click();await expect(page.locator('.cuenta-menu-secciones')).toBeVisible();
   await page.goto('/tienda');await page.locator('.shop-producto button').first().click();await page.goto('/finalizar-compra');const form=page.locator('main form');await expect(form.locator('[name=guardarDatos]')).toHaveCount(0);await expect(form.locator('.compra-guardar-datos')).toBeVisible();
   await form.locator('[name=nombre]').fill('Ana');await form.locator('[name=apellidos]').fill('Prueba');await form.locator('[name=telefono]').locator('..').locator('input[type=tel]').fill('+506 88883333');await form.locator('[name=consentimiento]').check();await form.locator('input[type=file]').setInputFiles({name:'comprobante-prueba.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\n'+'0'.repeat(200))});await form.locator('button[type=submit]').click();await expect(page.locator('.compra-aviso-datos')).toHaveText(idioma==='es'?'Datos guardados.':'Details saved.');
   const perfil=await admin.from('perfiles_compra_clientes').select('datos').eq('usuario_id',id).single();expect(perfil.error).toBeNull();expect(perfil.data?.datos.telefono).toBe('+506 88883333');expect(perfil.data?.datos).not.toHaveProperty('consentimiento');
   await page.goto('/finalizar-compra');await expect(page.locator('main form [name=telefono]')).toHaveValue('+50688883333');
   await context.clearCookies();await page.reload();await expect(page.locator('.compra-guardar-datos')).toHaveCount(0);await expect(page.locator('main form [name=telefono]')).toHaveValue('');
  }finally{await admin.auth.admin.deleteUser(id);}
 });
});
