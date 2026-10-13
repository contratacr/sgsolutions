import {test,expect} from '@playwright/test';
import {createHmac} from 'node:crypto';
test.skip(process.env.SG_TEST_PEDIDO_VISTA!=='1','Requiere proveedor de pedidos aislado; nunca usa producción.');
for(const idioma of ['es','en'])test(`confirmación ordenada, estados y móvil ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 for(let i=0;i<5;i++){
 const id='00000000-0000-4000-8000-00000000000'+i,acceso=createHmac('sha256','fixture-pedido-confirmacion-secret-123456').update('pedido:'+id).digest('hex');await page.goto('/finalizar-compra/pedido?'+new URLSearchParams({pedido:id,acceso}));
 await expect(page.locator('.pedido-confirmacion-productos li')).toHaveCount(1);await expect(page.locator('.pedido-confirmacion-total dd')).toContainText('500');await expect(page.locator('.pedido-confirmacion-estado')).toBeVisible();
 expect(await page.locator('h1').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(34);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 if(i===2)await page.screenshot({path:'.privado/evidencias/confirmacion-'+idioma+'-'+test.info().project.name+'.png',fullPage:true});
 }
});
