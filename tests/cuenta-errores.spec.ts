import {test,expect} from '@playwright/test';
import {errorCuenta,solicitudCuenta} from '../src/lib/cuenta-errores';
import es from '../messages/es.json';
import en from '../messages/en.json';
import {claveCuenta} from '../src/lib/cuenta-validacion';

test('contraseñas largas con requisitos completos y sin recortes',()=>{
 expect(claveCuenta.safeParse('A123456789!').success).toBe(false);
 expect(claveCuenta.safeParse('Ab1!xyz').success).toBe(false);
 expect(claveCuenta.safeParse('Ab1!xyzw').success).toBe(true);
 expect(claveCuenta.safeParse('a'.repeat(12)).success).toBe(false);
 expect(claveCuenta.safeParse('Bosque viento horizonte 7!').success).toBe(true);
 expect(claveCuenta.safeParse('Aa1!'+ 'a'.repeat(124)).success).toBe(true);
 expect(claveCuenta.safeParse('a'.repeat(129)).success).toBe(false);
 expect(claveCuenta.parse('  Frase larga única 7!  ')).toBe('  Frase larga única 7!  ');
 for(const clave of ['minusculas123456!', 'MAYUSCULAS123456!', 'SinNumerosAqui!!', 'SinSimbolos123456']) expect(claveCuenta.safeParse(clave).success).toBe(false);
});

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
   await page.getByRole('textbox',{name:t.correo,exact:true}).fill(`${code}@example.com`);
   await page.locator('#clave-cuenta').fill('Example-123!');
   await page.locator('.cuenta-enviar').click();
   await expect(page.locator('.cuenta-formulario [role=alert]')).toHaveText(t[key]);
   await expect(page.locator('.cuenta-formulario [role=alert]')).toBeFocused();
   await expect(page.getByRole('textbox',{name:t.correo,exact:true})).toHaveValue(`${code}@example.com`);
   await expect(page.locator('#clave-cuenta')).toHaveValue('Example-123!');
   if(code==='email_not_confirmed'){
    await expect(page.locator('.cuenta-informacion')).toHaveCSS('outline-style','none');
    await expect(page.locator('.cuenta-informacion')).toHaveCSS('background-color','rgb(240, 245, 249)');
    await page.screenshot({path:`.privado/evidencias/aviso-confirmacion-${idioma}-${test.info().project.name}.png`,fullPage:true});
   }
  }
  await page.getByRole('button',{name:t.reenviarConfirmacion,exact:true}).click();
  await page.getByRole('textbox',{name:t.correo,exact:true}).fill('over_request_rate_limit@example.com');
  await page.locator('.cuenta-enviar').click();
  await expect(page.locator('.cuenta-pagina [role=alert]')).toHaveText(t.limiteIntentos);
  await page.getByRole('button',{name:t.volverLogin,exact:true}).click();
  await page.getByRole('button',{name:t.olvidoClave,exact:true}).click();
  await page.getByRole('textbox',{name:t.correo,exact:true}).fill('user_not_found@example.com');
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
  await expect(page.locator('#clave-cuenta')).toHaveAttribute('minlength','8');
  await expect(page.locator('.clave-requisitos li')).toHaveCount(5);
  await expect(page.locator('.cuenta-clave-ayuda')).toHaveCount(0);
  await page.locator('#clave-cuenta').fill('Example-123!');
  await expect(page.locator('.clave-requisitos li[data-cumplido=true]')).toHaveCount(5);
  await page.locator('#clave-cuenta').fill('sinmayuscula123456!');
  await expect(page.locator('.clave-requisitos li[data-cumplido=true]')).toHaveCount(4);
  const ojo=page.getByRole('button',{name:t.mostrarClave,exact:true}).first();
  await expect(ojo.locator('svg')).toHaveClass(/lucide-eye-off/);
  await ojo.click();await expect(page.locator('#clave-cuenta')).toHaveAttribute('type','text');
  await expect(page.getByRole('button',{name:t.ocultarClave,exact:true}).first().locator('svg')).toHaveClass(/lucide-eye(?:\s|$)/);
  await page.getByRole('button',{name:t.ocultarClave,exact:true}).first().click();await page.locator('#clave-cuenta').fill('');
  const google=page.getByRole('button',{name:t.continuarGoogle,exact:true});
  const nombre=page.getByRole('textbox',{name:t.nombre,exact:true});
  expect((await google.boundingBox())!.y).toBeLessThan((await nombre.boundingBox())!.y);
  await expect(page.locator('input[type=checkbox][name=acepta]')).toHaveCount(1);
  const aceptacion=page.locator('.cuenta-formulario input[type=checkbox][name=acepta]');
  await expect(aceptacion).toHaveAttribute('required','');
  expect((await aceptacion.boundingBox())!.y).toBeGreaterThan((await page.locator('#confirmar-cuenta').boundingBox())!.y);
  expect((await aceptacion.boundingBox())!.y).toBeLessThan((await page.locator('.cuenta-enviar').boundingBox())!.y);
  await page.screenshot({path:`.privado/evidencias/registro-google-${idioma}-${test.info().project.name}.png`,fullPage:true});
  await google.click();
  await expect(page.locator('.cuenta-pagina [role=alert]')).toHaveText(t.aceptacionRequerida);
  await page.getByRole('textbox',{name:t.nombre,exact:true}).fill('Fixture Customer');
  await page.getByRole('textbox',{name:t.correo,exact:true}).fill('cliente@example.com');
  await page.locator('#clave-cuenta').fill('Aa1234!');
  await page.locator('#confirmar-cuenta').fill('Aa1234!');
  await aceptacion.check();
  await page.locator('.cuenta-enviar').click();
  await expect(page.locator('#clave-cuenta')).toHaveAttribute('aria-invalid','true');
  await expect(page.locator('.cuenta-formulario [role=status]')).toHaveCount(0);
  await page.locator('#clave-cuenta').fill('Example-123!');
  await page.locator('#confirmar-cuenta').fill('Example-123!');
  await page.locator('input[type=checkbox][name=acepta]').check();
  for(const [code,key] of [['weak_password','claveDebil'],['over_request_rate_limit','limiteIntentos']] as const){
   await page.getByRole('textbox',{name:t.correo,exact:true}).fill(`${code}@example.com`);
   await page.locator('.cuenta-enviar').click();
   await expect(page.locator('.cuenta-formulario [role=alert]')).toHaveText(t[key]);
  }
  await page.getByRole('textbox',{name:t.correo,exact:true}).fill('email_exists@example.com');
  await page.locator('.cuenta-enviar').click();
  await expect(page.getByRole('heading',{name:t.codigoTitulo})).toBeVisible();
  for(const [query,key] of [['error=access_denied','googleCancelado'],['code=expired','googleVencido'],['token_hash=expired&type=signup','enlaceInvalido']] as const){
   await page.goto(`/cuenta/confirmar?${query}`);
   await expect(page.locator('.cuenta-bloque>.cuenta-error')).toHaveText(t[key]);
  }
  await expect(page.locator('body')).not.toContainText('Private upstream detail');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 });
}
