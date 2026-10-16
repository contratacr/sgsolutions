import {test,expect} from '@playwright/test';
import {plantillaCorreo,textoCorreo} from '../src/lib/email/plantilla';
import {ejemplosCorreo} from '../src/lib/email/ejemplos';
import es from '../messages/es.json';import en from '../messages/en.json';
for(const idioma of ['es','en'] as const)test(`Correos de negocio y cuenta: diseño adaptable ${idioma}`,async({page})=>{
 await page.route('https://sgsolutionscr.com/imagenes/logo-correo-v1.png',r=>r.fulfill({path:'public/imagenes/logo-correo-v1.png',contentType:'image/png'}));
 for(const ejemplo of ejemplosCorreo(idioma)){
  await page.setContent(ejemplo.html);
  await expect(page.locator('html')).toHaveAttribute('lang',idioma);
  await expect(page.getByRole('heading',{level:1})).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('background-color','rgb(12, 29, 43)');
  await expect(page.locator('.email-surface')).toHaveCSS('border-top-width','0px');
  await expect(page.locator('.email-surface')).toHaveCSS('border-radius','0px');
  await expect(page.locator('.email-surface')).toHaveCSS('box-shadow','none');
  await expect(page.locator('.email-header')).toHaveCSS('background-color','rgb(12, 29, 43)');
  await expect(page.locator('img')).toHaveAttribute('src','https://sgsolutionscr.com/imagenes/logo-correo-v1.png');
  if(ejemplo.id==='confirmation'){
   await expect(page.locator('.email-code')).toHaveText('123456');
   await expect(page.locator('.email-code')).toHaveCSS('background-color','rgb(24, 51, 70)');
  }
  await expect.poll(()=>page.locator('img').evaluate(i=>(i as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(ejemplo.html).not.toContain('{{');expect(ejemplo.html).not.toContain('white-space:pre-line');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(ejemplo.id==='pago'){
   await expect(page.locator('body')).toContainText('₡30 500');
   await expect(page.locator('body')).toContainText('Logitech MK470');
   await page.screenshot({path:'.privado/evidencias/correo-nuevo-'+idioma+'-'+test.info().project.name+'.png',fullPage:true});
  }
 }
});
test('Contenido escapado y párrafos compatibles con Outlook',async({page})=>{
 const html=plantillaCorreo('<script>asunto</script>','Uno\nDos\n\nTres <img src=x>',undefined,{productos:[{nombre:'<script>producto</script>',cantidad:1}]});
 await page.setContent(html);await expect(page.locator('script')).toHaveCount(0);await expect(page.locator('img')).toHaveCount(1);expect(html).toContain('Uno<br>Dos');expect(html).toContain('&lt;script&gt;producto');
});
for(const idioma of ['es','en'] as const)test(`Vista interactiva de correos ${idioma}`,async({page,context,baseURL})=>{
 const t=(idioma==='es'?es:en).VistaCorreos;
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.route('https://sgsolutionscr.com/imagenes/logo-correo-v1.png',r=>r.fulfill({path:'public/imagenes/logo-correo-v1.png',contentType:'image/png'}));
 await page.goto('/vista-previa/correos');
 const correo=page.frameLocator('iframe');await expect(correo.getByRole('heading',{level:1})).toHaveText(idioma==='es'?'Pago confirmado':'Payment confirmed');
 await page.getByRole('button',{name:t.claro,exact:true}).click();
 await expect(correo.locator('body')).toHaveCSS('background-color','rgb(12, 29, 43)');
 await page.getByRole('button',{name:t.conImagenes,exact:true}).click();await expect(correo.locator('img')).toHaveCount(0);await expect(correo.locator('body')).toContainText('SG Solutions');
 await page.getByRole('combobox',{name:t.tipo}).selectOption('recovery');await expect(correo.getByRole('heading',{level:1})).toHaveText(idioma==='es'?'Recupere su contraseña':'Reset your password');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('El correo en texto conserva importe, productos y enlace',()=>{
 const texto=textoCorreo('Pago confirmado.',{texto:'Ver pedido',url:'https://example.com/pedido'},{referencia:'SG-PRUEBA',total:{etiqueta:'Total',valor:'₡30 500'},productos:[{nombre:'Logitech MK470',cantidad:2}]});
 expect(texto).toContain('₡30 500');expect(texto).toContain('2 × Logitech MK470');expect(texto).toContain('https://example.com/pedido');expect(texto).toContain('2446-7846');const html=plantillaCorreo('Pedido','Detalle',undefined,{referencia:'SG-PRUEBA'});expect(html).toContain('tel:+50624467846');const wa=html.match(/href="(https:\/\/wa\.me[^"]+)"/);expect(wa).toBeTruthy();expect(new URL(wa![1].replaceAll('&amp;','&')).searchParams.get('text')).toContain('SG-PRUEBA');
});
