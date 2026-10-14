import {test,expect} from '@playwright/test';
import fs from 'node:fs';
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
 await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);await page.goto('/tienda');await expect(page.locator('.shop-orden select')).toBeEnabled();await page.locator('.shop-producto button').first().click();
 await page.getByRole('button',{name:idioma==='es'?'Abrir carrito':'Open cart',exact:true}).click();
 const enlace=page.locator('.carrito-ingreso');await expect(enlace).toHaveAttribute('href',enlaceIngresoCompra());await enlace.click();await expect(page).toHaveURL(/\/cuenta\?retorno=/);
 await expect(page.locator('.cuenta-formulario [name=retorno]')).toHaveValue('/pagar');
 await page.goto('/finalizar-compra');await expect(page.locator('.compra-acceso')).toBeVisible();await expect(page.locator('main form [name=nombre]')).toBeVisible();
 await page.locator('.compra-acceso-invitado a').click();await expect(page.locator('#cuenta-correo-registro')).toBeVisible();await expect(page.locator('#cuenta-correo-registro [name=retorno]')).toHaveValue('/pagar');
});
test.describe('sesión real contra Auth local',()=>{
 test.skip(process.env.SG_TEST_CUENTA_LOCAL!=='1','Requiere cuenta de prueba local; nunca usa producción.');
 for(const idioma of ['es','en'])test(`correo vuelve al pedido, conserva carrito y rellena datos ${idioma}`,async({page,context,baseURL})=>{
  expect(new URL(baseURL!).hostname).toBe('127.0.0.1');
  const cuenta=JSON.parse(fs.readFileSync('.privado/qa-local/cuentas.json','utf8')).find((c:{admin:boolean})=>c.admin);
  await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);await page.goto('/tienda');await expect(page.locator('.shop-orden select')).toBeEnabled();await page.locator('.shop-producto button').first().click();const carrito=await page.evaluate(()=>localStorage.getItem('sg-carrito-v1'));
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
