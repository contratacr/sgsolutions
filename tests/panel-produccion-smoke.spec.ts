import {test,expect} from '@playwright/test';

test.skip(process.env.SG_TEST_PRODUCCION!=='1','Requiere build de producción servido localmente');
for(const idioma of ['es','en'])test(`acceso al panel protegido sin errores de runtime ${idioma}`,async({page,context})=>{
  const errores:string[]=[];
  page.on('pageerror',error=>errores.push(error.message));
  await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
  for(const ruta of ['/panel','/panel/catalogo','/panel/contenido','/panel/pedidos','/panel/estadisticas']){
    await page.goto(ruta);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator('[name=correo]')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang',idioma);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  expect(errores).toEqual([]);
});
