import { test, expect } from '@playwright/test';

for (const idioma of ['es', 'en'] as const) {
  test(`acceso a cuenta en ${idioma}`, async ({ page, context }) => {
    await context.addCookies([{ name: 'sg-idioma', value: idioma, domain: '127.0.0.1', path: '/' }]);
    await page.goto('/');
    const acceso = page.getByRole('link', { name: idioma === 'es' ? 'Mi cuenta' : 'My account' }).first();
    await expect(acceso).toHaveAttribute('href', '/cuenta');
    await acceso.click();
    await expect(page).toHaveURL(/\/cuenta$/);
    await expect(page.locator('html')).toHaveAttribute('lang', idioma);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(idioma === 'es' ? 'Mi cuenta' : 'My account');
    await expect(page.locator('.cuenta-intro,.cuenta-nota,.cuenta-explicacion')).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: idioma === 'es' ? 'Correo electrónico' : 'Email address' })).toBeVisible();
    await expect(page.getByRole('button', { name: idioma === 'es' ? 'Iniciar sesión' : 'Sign in', exact: true }).last()).toBeVisible();
    await page.getByRole('textbox', { name: idioma === 'es' ? 'Correo electrónico' : 'Email address' }).fill('cliente@example.com');
    await page.getByLabel(idioma === 'es' ? 'Contraseña' : 'Password', {exact: true}).fill('prueba-cliente-123');
    await page.getByRole('button', { name: idioma === 'es' ? 'Iniciar sesión' : 'Sign in', exact: true }).last().click();
    await expect(page.locator('.cuenta-formulario [role="alert"]')).toContainText(idioma === 'es' ? 'no está disponible' : 'temporarily unavailable');
    await page.getByRole('button', {name: idioma === 'es' ? 'Regístrese' : 'Sign up', exact: true}).first().click();
    await page.getByLabel(idioma === 'es' ? 'Nombre completo' : 'Full name').fill('Cliente de prueba');
    await page.getByRole('textbox', {name: idioma === 'es' ? 'Correo electrónico' : 'Email address'}).fill('cliente@example.com');
    await page.getByLabel(idioma === 'es' ? 'Contraseña' : 'Password', {exact: true}).fill('prueba-cliente-123');
    await page.getByLabel(idioma === 'es' ? 'Confirmar contraseña' : 'Confirm password', {exact: true}).fill('otra-clave-123');
    await expect(page.locator('input[type=checkbox][name=acepta]')).toHaveCount(1);
    await page.locator('.cuenta-formulario input[name=acepta]').check();
    await page.getByRole('button', {name: idioma === 'es' ? 'Registrarme' : 'Create account', exact: true}).last().click();
    await expect(page.locator('.cuenta-formulario [role="alert"]')).toContainText(idioma === 'es' ? 'no coinciden' : 'do not match');
    await expect(page.getByLabel(idioma === 'es' ? 'Nombre completo' : 'Full name')).toHaveValue('Cliente de prueba');
    await expect(page.getByLabel(idioma === 'es' ? 'Contraseña' : 'Password', {exact: true})).toHaveValue('prueba-cliente-123');
    await page.getByRole('button', {name: idioma === 'es' ? 'Mostrar contraseña' : 'Show password', exact:true}).first().click();
    await expect(page.getByLabel(idioma === 'es' ? 'Contraseña' : 'Password', {exact:true})).toHaveAttribute('type','text');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', idioma);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.setViewportSize({ width: 320, height: 760 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await expect(page.locator('.whatsapp-flotante')).toBeHidden();
  });
  test(`recuperación y enlaces inválidos en ${idioma}`, async ({page,context}) => {
    await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
    await page.goto('/cuenta/recuperar');
    await expect(page).toHaveURL(/\/cuenta\?error=acceso$/);
    await expect(page.locator('.cuenta-pagina [role="alert"]')).toBeVisible();
    await page.goto('/cuenta/confirmar?token_hash=invalido&type=signup');
    await expect(page).toHaveURL(/\/cuenta\?error=/);
    await page.goto('/cuenta');
    await page.getByRole('button',{name:idioma==='es'?'¿Olvidó su contraseña?':'Forgot your password?',exact:true}).click();
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await page.getByLabel(idioma==='es'?'Correo electrónico':'Email address',{exact:true}).fill('cliente@example.com');
    await page.getByRole('button',{name:idioma==='es'?'Enviar enlace de recuperación':'Send recovery link',exact:true}).click();
    await expect(page.locator('.cuenta-formulario [role="alert"]')).toBeVisible();
    await page.getByRole('button',{name:idioma==='es'?'Volver a iniciar sesión':'Back to sign in',exact:true}).click();
    await expect(page.locator('input[type="password"]')).toHaveCount(1);
  });
}
