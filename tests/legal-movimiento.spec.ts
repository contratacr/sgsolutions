import {test,expect} from '@playwright/test';
for(const idioma of ['es','en']){
 test(`páginas legales y navegación ${idioma}`,async({page,context})=>{
  await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
  for(const ruta of ['/terminos','/privacidad']){
   await page.goto(ruta);
   await expect(page.locator('main.estado-pagina[aria-busy="true"]')).toHaveCount(0);
   await expect(page.locator('main:visible h1')).toHaveText(ruta==='/terminos'?(idioma==='es'?'Términos y Condiciones':'Terms and Conditions'):(idioma==='es'?'Política de Privacidad':'Privacy Policy'));
   await expect(page.locator('.legal-grid:visible article section')).toHaveCount(ruta==='/privacidad'?10:9);
   await expect(page.locator('.pie-legales a')).toHaveCount(2);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
   await expect(page.locator('html')).toHaveAttribute('lang',idioma);
  }
 });
 test(`secciones públicas visibles ${idioma}`,async({page,context})=>{
  await context.addCookies([{name:'sg-idioma',value:idioma,domain:'127.0.0.1',path:'/'}]);
  for(const ruta of ['/','/tienda','/soporte','/empresas','/casos-de-exito','/nosotros']){
   await page.goto(ruta);
   await expect(page.locator('main.estado-pagina[aria-busy="true"]')).toHaveCount(0);
   await expect(page.locator('main:visible h1')).toBeVisible();
   await page.locator('footer.pie').scrollIntoViewIfNeeded();
   await expect(page.locator('footer.pie')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  }
 });
}
