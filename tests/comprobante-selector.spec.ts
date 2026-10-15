import {llegarAPago} from './ayudas/compra';
import {normalizarComprobante} from '../src/lib/archivo-comprobante';
import {test,expect} from '@playwright/test';
for(const idioma of ['es','en'])test(`Seleccionar comprobante abre el selector en SINPE y transferencia ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.goto('/tienda');await expect(page.locator('.shop-orden-trigger')).toBeEnabled();await page.locator('.shop-producto').first().hover();await page.locator('.producto-agregar').first().click();await page.goto('/pagar');
 await llegarAPago(page,idioma);
 for(const metodo of ['sinpe','transferencia']){
  await page.locator(`input[value=${metodo}]`).check();
  const selector=page.waitForEvent('filechooser',{timeout:5000});
  await page.getByRole('button',{name:idioma==='es'?'Seleccionar archivo':'Choose file',exact:true}).click();
  await (await selector).setFiles({name:`${metodo}.pdf`,mimeType:metodo==='sinpe'?'application/pdf':'application/octet-stream',buffer:Buffer.from('%PDF-1.4\n'+'.'.repeat(200))});
  await expect(page.locator('.compra-archivo-nombre')).toHaveText(`${metodo}.pdf`);
  await expect(page.locator('#compra-comprobante')).not.toHaveAttribute('aria-invalid','true');
 }
});

test('Reconoce comprobantes sin MIME y rechaza contenido incompatible',async()=>{
 const pdf=new File(['%PDF-1.4\n'+'.'.repeat(200)],'recibo.pdf');
 expect((await normalizarComprobante(pdf))?.type).toBe('application/pdf');
 expect(await normalizarComprobante(new File(['x'.repeat(200)],'falso.pdf',{type:'application/pdf'}))).toBeNull();
 expect(await normalizarComprobante(new File(['%PDF'+'.'.repeat(5*1024*1024)],'grande.pdf'))).toBeNull();
});
