import {test,expect} from '@playwright/test';

test('marcas filtran productos y se combinan con categorías en ambos idiomas',async({page})=>{
 await page.goto('/tienda');
 await page.getByRole('button',{name:'Pausar movimiento de marcas'}).click();
 await expect(page.locator('.shop-producto').first()).toContainText('Código de fabricante');
 await expect(page.locator('main')).toContainText('21H2S1NH00');
 await expect(page.locator('main')).not.toContainText('NT083LEN02');
 for(const nombre of ['Computadoras','Punto de venta','Software','Gaming','Componentes informáticos']) await expect(page.getByRole('button',{name:nombre,exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Ver productos de Lenovo',exact:true}).click();
 await expect(page.locator('.shop-producto')).toHaveCount(24);
 await page.getByRole('button',{name:'Componentes informáticos',exact:true}).click();
 await expect(page.locator('.shop-producto')).toHaveCount(10);
 await expect(page.locator('.shop-producto').first()).toContainText('Lenovo');
 await page.getByRole('button',{name:'Ver todas',exact:true}).click();
 await expect(page.locator('.shop-producto')).toHaveCount(24);
 await page.getByRole('button',{name:'Read this page in English'}).click();
 await page.getByRole('button',{name:'Pause brand animation'}).click();
 await page.getByRole('button',{name:'View HP products',exact:true}).click();
 await expect(page.locator('.shop-producto')).toHaveCount(1);
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('lang','en');
});

test('planes envían consultas al correo correcto y soporte excluye iOS',async({page})=>{
 await page.goto('/empresas');
 await expect(page.locator('.plan li')).toHaveCount(18);
 for(const [i,nombre] of ['Básico','Profesional','Premium'].entries()){
  await page.locator('.plan').nth(i).getByRole('button').click();
  const dialogo=page.getByRole('dialog');
  await expect(dialogo.getByRole('heading',{name:nombre,exact:true})).toBeVisible();
  await dialogo.locator('input[name="empresa"]').fill('Empresa de prueba');
  await dialogo.locator('input[name="nombre"]').fill('Contacto de prueba');
  await dialogo.locator('input[name="correo"]').fill('prueba@example.com');
  await dialogo.locator('input[name="telefono"]').fill('88888888');
  await dialogo.locator('select').selectOption('6–15');
  await dialogo.locator('textarea').fill('Necesitamos mantenimiento y soporte.');
  await dialogo.getByRole('checkbox').check();
  await dialogo.getByRole('button',{name:'Preparar solicitud'}).click();
  const url=new URL((await dialogo.getByRole('link',{name:'Abrir solicitud en Outlook'}).getAttribute('href'))!);
  expect(url.searchParams.get('to')).toBe('soporte@sgsolutionscr.com');
  expect(url.searchParams.get('subject')).toContain(`plan ${nombre}`);
  expect(url.searchParams.get('body')).toContain('Empresa de prueba');
  await dialogo.getByRole('button',{name:'Volver a editar'}).click();
  await expect(dialogo.locator('input[name="empresa"]')).toHaveValue('Empresa de prueba');
  await page.keyboard.press('Escape');
 }
 const correoPie=await page.locator('footer').getByRole('link',{name:'soporte@sgsolutionscr.com'}).getAttribute('href');
 const urlCorreoPie=new URL(correoPie!);
 expect(urlCorreoPie.searchParams.get('to')).toBe('soporte@sgsolutionscr.com');
 await page.goto('/soporte');
 await page.getByRole('heading',{name:'Apple',exact:true}).click();
 await expect(page.locator('.servicio-grupo').nth(2).locator('li')).toHaveCount(5);
 await expect(page.locator('main')).not.toContainText('iPhone');
 await expect(page.locator('main')).toContainText('en nuestras instalaciones');
 await page.getByRole('button',{name:'Read this page in English'}).click();
 await expect(page.locator('main')).not.toContainText('iPhone');
 await expect(page.locator('main')).toContainText('at our premises');
});
