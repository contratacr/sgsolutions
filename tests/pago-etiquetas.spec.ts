import {test,expect} from '@playwright/test';
test.skip(process.env.SG_TEST_PEDIDO_VISTA!=='1','Requiere pedidos simulados aislados.');
for(const idioma of ['es','en'])test(`pagos reales y simulados muestran etiquetas correctas ${idioma}`,async({page,context,baseURL})=>{
 await context.addCookies([{name:'sg-idioma',value:idioma,url:baseURL!}]);
 await page.goto('/pago/resultado?pedido=00000000-0000-4000-8000-000000000000');await expect(page.locator('h1')).toHaveText(idioma==='es'?'Pago confirmado.':'Payment confirmed.');await expect(page.locator('.panel-aviso')).toHaveCount(0);
 await page.goto('/pago/resultado?pedido=00000000-0000-4000-8000-000000000001');await expect(page.locator('.panel-aviso')).toContainText(idioma==='es'?'Transacción de prueba':'Test transaction');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
