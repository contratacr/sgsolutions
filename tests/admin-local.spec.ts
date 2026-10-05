import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes,scryptSync} from 'node:crypto';
test.describe.configure({mode:'serial'});
for(const idioma of ['es','en'])test(`inicio de sesión, rechazo y cierre local ${idioma}`,async({page,context})=>{
 test.skip(process.env.SG_TEST_ALTAS!=='1','Requiere cuenta local aislada');
 const archivo='.privado/admin-local/cuenta.json',original=await readFile(archivo,'utf8');
 const clave=randomBytes(24).toString('hex'),salt=randomBytes(16).toString('hex');
 try{
  await writeFile(archivo,JSON.stringify({correo:'qa@example.com',salt,hash:scryptSync(clave,salt,64).toString('hex'),intentos:0,bloqueadoHasta:0,sesiones:[]}),{mode:0o600});
  await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
  await page.goto('/panel');await expect(page).toHaveURL(/\/admin$/);
  await page.locator('[name=correo]').fill('qa@example.com');await page.locator('[name=clave]').fill('incorrecta');
  await page.locator('main form button').click();await expect(page).toHaveURL(/\/admin/);
  await expect(page.locator('main [role=alert]')).toBeVisible();
  await page.locator('[name=correo]').fill('qa@example.com');await page.locator('[name=clave]').fill(clave);
  await page.locator('main form button').click();await expect(page).toHaveURL(/\/panel$/);
  const cookie=(await context.cookies()).find(c=>c.name==='sg-admin-local');expect(cookie?.httpOnly).toBe(true);expect(cookie?.sameSite).toBe('Strict');
  await expect(page.locator('html')).toHaveAttribute('lang',idioma);
  await page.locator('[data-cerrar-sesion] button').click();await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/panel/contenido');await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/acceso');await expect(page).toHaveURL(/\/admin$/);
 }finally{await writeFile(archivo,original,{mode:0o600});}
});
