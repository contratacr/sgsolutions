import {test,expect} from '@playwright/test';

test('marcas filtran productos y se combinan con categorías en ambos idiomas',async({page})=>{
 await page.goto('/tienda');
 await expect(page.locator('.shop-producto').first()).toContainText('Código de fabricante');
 for(const nombre of ['Computadoras','Punto de venta','Componentes de PC']) await expect(page.getByRole('button',{name:nombre,exact:true})).toBeVisible();
 const seleccionarMarca=async(nombre:string)=>{
  const boton=page.getByRole('button',{name:nombre,exact:true});
  await boton.focus();
  await expect(page.locator('.marcas-pista')).toHaveCSS('animation-play-state','paused');
  await boton.press('Enter');
 };
 await seleccionarMarca('Ver productos de LENOVO');
 await expect(page.locator('.shop-producto')).toHaveCount((await (await page.request.get('/api/catalogo?marca=LENOVO')).json()).productos.length);
 await page.getByRole('button',{name:'Computadoras',exact:true}).click();
 await expect(page.locator('.shop-producto')).toHaveCount((await (await page.request.get('/api/catalogo?marca=LENOVO&categoria=computadoras')).json()).productos.length);
 await expect(page.locator('.shop-producto').first()).toContainText(/lenovo/i);
 await seleccionarMarca('Ver productos de LENOVO');
 await expect(page.locator('.shop-producto')).toHaveCount(24);
 await page.getByRole('button',{name:'Read this page in English'}).click();
 await seleccionarMarca('View HP products');
 await expect.poll(()=>page.locator('.shop-producto').count()).toBeGreaterThan(1);
 for(const producto of await page.locator('.shop-producto').all())await expect(producto).toContainText('HP');
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
  expect(url.searchParams.get('to')).toBe('asesor@sgsolutionscr.com');
  expect(url.searchParams.get('subject')).toContain(`plan ${nombre}`);
  expect(url.searchParams.get('body')).toContain('Empresa de prueba');
  await dialogo.getByRole('button',{name:'Volver a editar'}).click();
  await expect(dialogo.locator('input[name="empresa"]')).toHaveValue('Empresa de prueba');
  await page.keyboard.press('Escape');
 }
 const correoPie=await page.locator('a[href^="https://outlook.office.com/mail/deeplink/compose"]').first().getAttribute('href');
 const urlCorreoPie=new URL(correoPie!);
 expect(urlCorreoPie.searchParams.get('to')).toBe('asesor@sgsolutionscr.com');
 await page.goto('/soporte');
 await page.getByRole('heading',{name:'Apple',exact:true}).click();
 await expect(page.locator('.servicio-grupo').nth(2).locator('li')).toHaveCount(5);
 await expect(page.locator('main')).not.toContainText('iPhone');
 await expect(page.locator('main')).toContainText('en nuestras instalaciones');
 await page.getByRole('button',{name:'Read this page in English'}).click();
 await expect(page.locator('main')).not.toContainText('iPhone');
 await expect(page.locator('main')).toContainText('at our premises');
});
