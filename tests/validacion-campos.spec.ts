import {test,expect} from '@playwright/test';
import es from '../messages/es.json';
import en from '../messages/en.json';
for(const idioma of ['es','en'] as const){
 test(`errores de campos en idioma de la app ${idioma}`,async({page,context})=>{
  await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
  const t=(idioma==='es'?es:en).Acceso,v=(idioma==='es'?es:en).Validacion;
  await page.goto('/admin');
  const correo=page.getByRole('textbox',{name:t.correo,exact:true});
  await correo.click();await correo.press('Tab'); // Esperar interacción con el cliente hidratado.
  await page.getByRole('button',{name:t.entrar,exact:true}).click();
  await expect(correo).toBeFocused();await expect(correo).toHaveAttribute('aria-invalid','true');
  await expect(page.locator('.validacion-campo-error')).toHaveCount(2);
  await expect(page.locator('.validacion-campo-error').first()).toHaveText(v.obligatorio);
  const id=await correo.getAttribute('aria-describedby');expect(id).toBeTruthy();
  await expect(correo).toHaveJSProperty('validationMessage',v.obligatorio);
  await expect(correo).toHaveAccessibleName(t.correo);await expect(correo).toHaveAccessibleDescription(v.obligatorio);
  await expect(correo).toHaveCSS('outline-style','none');
  await page.screenshot({path:`.privado/evidencias/validacion-${idioma}-${test.info().project.name}.png`,fullPage:false});
  await correo.fill('correo-invalido');
  await expect(correo).not.toHaveAttribute('aria-invalid','true');
  await page.getByRole('button',{name:t.entrar,exact:true}).click();
  await expect(page.locator('.validacion-campo-error').first()).toHaveText(v.correo);
  await correo.fill('fixture@example.com');await page.locator('input[type="password"]').fill('example-password-123');
  await expect(page.locator('.validacion-campo-error')).toHaveCount(0);
  await page.getByRole('button',{name:t.entrar,exact:true}).click();
  await expect(page.locator('.aviso-formulario')).toBeVisible(); // El formulario válido sí llega al servidor.
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 });
 test(`foco estable al escribir y accesible con teclado ${idioma}`,async({page,context})=>{
  await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);await page.goto('/cuenta');
  const t=(idioma==='es'?es:en).CuentaCliente;const correo=page.getByRole('textbox',{name:t.correo,exact:true});
  await correo.click();await correo.pressSequentially('cliente');
  await expect(page.locator('html')).toHaveAttribute('data-interaccion','puntero');
  await expect(correo).toHaveCSS('outline-style','none');await expect(correo).not.toHaveCSS('box-shadow','none');
  await correo.press('Tab');await expect(page.locator('html')).toHaveAttribute('data-interaccion','teclado');
  await expect(page.getByLabel(t.clave,{exact:true})).toBeFocused();
  await page.goto('/tienda');
  await expect(page.locator('.validacion-campo-error')).toHaveCount(0);
  const busqueda=page.locator('.shop-buscador input');await busqueda.click();await busqueda.pressSequentially('mouse');
  await expect(busqueda).toHaveCSS('outline-style','none');await expect(busqueda).toHaveCSS('box-shadow','none');
 });
}
