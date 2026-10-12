import {test,expect} from '@playwright/test';
import {errorCuenta,solicitudCuenta} from '../src/lib/cuenta-errores';
import es from '../messages/es.json';
import en from '../messages/en.json';

test('clasifica fallos sin divulgar mensajes privados',async()=>{
  expect(errorCuenta({code:'invalid_credentials'},true)).toBe('credenciales');
  expect(errorCuenta({code:'user_banned'},true)).toBe('cuentaBloqueada');
  expect(errorCuenta({status:503},true)).toBe('error');
  expect(errorCuenta({status:429})).toBe('limiteIntentos');
  expect(errorCuenta({code:'same_password'})).toBe('claveRepetida');
  expect(errorCuenta({code:'session_expired'})).toBe('sesionVencida');
  const resultado=await solicitudCuenta(async()=>{throw new Error('private detail');});
  expect(resultado).toEqual({error:{name:'AuthRetryableFetchError'}});
});
for(const idioma of ['es','en'] as const){
 const t=(idioma==='es'?es:en).CuentaCliente;
 test(`errores de login y recuperación ${idioma}`,async({page,context})=>{
  test.skip(!process.env.SG_TEST_OAUTH,'Necesita Auth simulado; no usa clientes reales.');
  await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
  await page.goto('/cuenta');
  for(const [code,key] of [['invalid_credentials','credenciales'],['over_request_rate_limit','limiteIntentos'],['unexpected_failure','error'],['request_timeout','conexion'],['email_not_confirmed','confirmarCorreo']] as const){
   await page.getByLabel(t.correo,{exact:true}).fill(`${code}@example.com`);
   await page.getByLabel(t.clave,{exact:true}).fill('example-password-123');
   await page.locator('.cuenta-enviar').click();
   await expect(page.locator('.cuenta-formulario [role=alert]')).toHaveText(t[key]);
   await expect(page.locator('.cuenta-formulario [role=alert]')).toBeFocused();
   await expect(page.getByLabel(t.correo,{exact:true})).toHaveValue(`${code}@example.com`);
   await expect(page.getByLabel(t.clave,{exact:true})).toHaveValue('example-password-123');
  }
  await page.getByRole('button',{name:t.reenviarConfirmacion,exact:true}).click();
  await page.getByLabel(t.correo,{exact:true}).fill('over_request_rate_limit@example.com');
  await page.locator('.cuenta-enviar').click();
  await expect(page.locator('.cuenta-pagina [role=alert]')).toHaveText(t.limiteIntentos);
  await page.getByRole('button',{name:t.volverLogin,exact:true}).click();
  await page.getByRole('button',{name:t.olvidoClave,exact:true}).click();
  await page.getByLabel(t.correo,{exact:true}).fill('user_not_found@example.com');
  await page.locator('.cuenta-enviar').click();
  await expect(page.getByRole('status')).toHaveText(t.recuperacionEnviada);
  await expect(page.locator('.cuenta-enviar')).toBeDisabled();
  await expect(page.locator('body')).not.toContainText('Private upstream detail');
 });
 test(`registro y OAuth fallidos ${idioma}`,async({page,context})=>{
  test.skip(!process.env.SG_TEST_OAUTH,'Necesita Auth simulado.');
  await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
  await page.goto('/cuenta');
  await page.getByRole('button',{name:t.registrarseEnlace,exact:true}).click();
  const google=page.getByRole('button',{name:t.continuarGoogle,exact:true});
  const nombre=page.getByLabel(t.nombre,{exact:true});
  expect((await google.boundingBox())!.y).toBeLessThan((await nombre.boundingBox())!.y);
  await expect(page.locator('input[type=checkbox][name=acepta]')).toHaveCount(1);
  await expect(page.locator('.cuenta-formulario input[type=hidden][name=acepta]')).toHaveValue('no');
  await page.screenshot({path:`.privado/evidencias/registro-google-${idioma}-${test.info().project.name}.png`,fullPage:true});
  await google.click();
  await expect(page.locator('.cuenta-pagina [role=alert]')).toHaveText(t.aceptacionRequerida);
  await page.getByLabel(t.nombre,{exact:true}).fill('Fixture Customer');
  await page.getByLabel(t.clave,{exact:true}).fill('example-password-123');
  await page.getByLabel(t.confirmarClave,{exact:true}).fill('example-password-123');
  await page.locator('input[type=checkbox][name=acepta]').check();
  for(const [code,key] of [['weak_password','claveDebil'],['over_request_rate_limit','limiteIntentos']] as const){
   await page.getByLabel(t.correo,{exact:true}).fill(`${code}@example.com`);
   await page.locator('.cuenta-enviar').click();
   await expect(page.locator('.cuenta-formulario [role=alert]')).toHaveText(t[key]);
  }
  await page.getByLabel(t.correo,{exact:true}).fill('email_exists@example.com');
  await page.locator('.cuenta-enviar').click();
  await expect(page.getByRole('status')).toHaveText(t.registroEnviado);
  for(const [query,key] of [['error=access_denied','googleCancelado'],['code=expired','googleVencido'],['token_hash=expired&type=signup','enlaceInvalido']] as const){
   await page.goto(`/cuenta/confirmar?${query}`);
   await expect(page.locator('.cuenta-bloque>.cuenta-error')).toHaveText(t[key]);
  }
  await expect(page.locator('body')).not.toContainText('Private upstream detail');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 });
}
