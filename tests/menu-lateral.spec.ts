import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'] as const){
 test(`menú lateral accesible y navegación en ${idioma}`,async({page,context},info)=>{
  await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
  if(info.project.name==='escritorio')await page.setViewportSize({width:850,height:900});
  await page.goto('/');
  await expect(page.locator('.nav-acciones > .cuenta-nav')).not.toBeVisible();
  await expect(page.locator('.nav-acciones > .idioma-directo')).not.toBeVisible();
  await expect(page.locator('.carrito-trigger')).toBeVisible();
  const abrir=page.getByRole('button',{name:idioma==='es'?'Abrir menú':'Open menu',exact:true});
  const altoNav=(await page.locator('.navegacion').boundingBox())!.height;
  await abrir.click();
  const panel=page.getByRole('dialog');await expect(panel).toBeVisible();
  await expect(panel.locator('.menu-panel-idioma')).toBeVisible();
  expect((await panel.locator('.menu-panel-cabecera').boundingBox())!.height).toBe(altoNav);
  expect((await panel.locator('.menu-panel-logo').boundingBox())!.width).toBe((await page.locator('.navegacion .logo').boundingBox())!.width);
  await expect(panel.getByRole('link',{name:idioma==='es'?'Tienda':'Store',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');await expect(panel).not.toBeVisible();await expect(abrir).toBeFocused();
  await abrir.click();await expect(panel).toHaveCSS('transform','none');await page.mouse.click(2,200);await expect(panel).not.toBeVisible();
  await abrir.click();await panel.getByRole('link',{name:idioma==='es'?'Ingresar':'Sign in',exact:true}).click();await expect(page).toHaveURL(/\/cuenta$/);await expect(panel).not.toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang',idioma);
  await abrir.click();await expect(panel.getByRole('link',{name:idioma==='es'?'Ingresar':'Sign in',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}
